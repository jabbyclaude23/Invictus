import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, RefreshCw, BarChart3, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MUSCLE_COLORS, MUSCLE_BG, getAlternatives, getSameMuscleAlts } from "../data/exercises";

const IMG_CACHE = {};

async function fetchWgerImage(name) {
  if (IMG_CACHE[name] !== undefined) return IMG_CACHE[name];
  try {
    const r = await fetch(`https://wger.de/api/v2/exercise/?format=json&language=2&name=${encodeURIComponent(name)}`);
    const d = await r.json();
    const id = d?.results?.[0]?.id;
    if (!id) { IMG_CACHE[name] = null; return null; }
    const r2 = await fetch(`https://wger.de/api/v2/exerciseimage/?exercise=${id}&format=json`);
    const d2 = await r2.json();
    const url = d2?.results?.[0]?.image || null;
    IMG_CACHE[name] = url;
    return url;
  } catch { IMG_CACHE[name] = null; return null; }
}

export default function ExerciseCard({ exercise, history = [], onLog, onSwap }) {
  const [img, setImg]           = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [showChart, setShowChart]= useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [sets, setSets]         = useState([{ reps: "", weight: "" }]);
  const [done, setDone]         = useState(false);

  // Named alts first; fall back to all same-muscle exercises so AI-generated names always get options
  const namedAlts = getAlternatives(exercise);
  const alts = namedAlts.length > 0
    ? namedAlts
    : getSameMuscleAlts(exercise.muscle, exercise.name).slice(0, 5);
  const muscleColor = MUSCLE_COLORS[exercise.muscle] || "text-gray-400";
  const muscleBg    = MUSCLE_BG[exercise.muscle]    || "bg-gray-400/10 border-gray-400/20";

  useEffect(() => { fetchWgerImage(exercise.name).then(setImg); }, [exercise.name]);

  const addSet = () => setSets(s => [...s, { reps: "", weight: "" }]);
  const updateSet = (i, field, val) => setSets(s => s.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const removeSet = i => setSets(s => s.filter((_, idx) => idx !== i));

  const handleLog = () => {
    const valid = sets.filter(s => s.reps);
    if (!valid.length) return;
    onLog?.(exercise.name, valid);
    setDone(true);
  };

  return (
    <motion.div
      className={`rounded-2xl border overflow-hidden transition-all ${done ? "border-green-500/30 bg-green-500/5" : "bg-[#111] border-white/5"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Image or placeholder */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1a1a1a] flex-shrink-0">
          {img
            ? <img src={img} alt={exercise.name} className="w-full h-full object-cover" />
            : <div className={`w-full h-full flex items-center justify-center text-2xl ${muscleColor} bg-[#1a1a1a]`}>
                {exercise.muscle === "chest" ? "🏋️" : exercise.muscle === "back" ? "💪" : exercise.muscle === "legs" ? "🦵" : exercise.muscle === "shoulders" ? "🤸" : exercise.muscle === "arms" ? "💪" : exercise.muscle === "core" ? "🎯" : "🏃"}
              </div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-white ${done ? "line-through opacity-60" : ""}`}>{exercise.name}</h3>
            {done && <CheckCircle size={14} className="text-green-400" />}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{exercise.desc}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${muscleBg} ${muscleColor}`}>
              {exercise.muscle}
            </span>
            <span className="text-xs text-gray-600">{exercise.sets} sets · {exercise.reps}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setShowChart(c => !c); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-yellow-400 transition"
          >
            <BarChart3 size={16} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setShowSwap(s => !s); }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 transition"
          >
            <RefreshCw size={16} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </div>

      {/* History chart */}
      <AnimatePresence>
        {showChart && (
          <motion.div
            className="px-4 pb-3"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {history.length > 0 ? (
              <div className="h-32 border-t border-white/5 pt-3">
                <p className="text-xs text-gray-500 mb-2">Progress (last {history.length} sessions)</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history}>
                    <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#555", fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#111", border: "1px solid #222", color: "#fff", fontSize: 11 }} />
                    <Bar dataKey="weight" fill="#ef4444" radius={[4,4,0,0]} name="Weight (kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-600 italic border-t border-white/5 pt-3">No history yet — log this exercise to start tracking.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alternatives */}
      <AnimatePresence>
        {showSwap && alts.length > 0 && (
          <motion.div
            className="px-4 pb-3 border-t border-white/5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <p className="text-xs text-gray-500 mt-3 mb-2">Swap with:</p>
            <div className="space-y-1.5">
              {alts.map(alt => (
                <button
                  key={alt.name}
                  onClick={() => { onSwap?.(exercise.name, alt); setShowSwap(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-[#1a1a1a] border border-white/5 hover:border-white/15 text-sm text-gray-300 transition"
                >
                  <span className="font-medium">{alt.name}</span>
                  <span className="text-gray-600 ml-2 text-xs">{alt.muscle}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log sets */}
      <AnimatePresence>
        {expanded && !done && (
          <motion.div
            className="px-4 pb-4 border-t border-white/5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {img && (
              <div className="mx-4 mt-3 rounded-xl overflow-hidden h-44 bg-[#1a1a1a]">
                <img src={img} alt={exercise.name} className="w-full h-full object-cover" />
              </div>
            )}
            {(exercise.desc || exercise.weight_suggestion) && (
              <div className="mt-3 mb-1 space-y-1.5">
                {exercise.desc && (
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wider mb-0.5">Instructions</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{exercise.desc}</p>
                  </div>
                )}
                {exercise.weight_suggestion && (
                  <p className="text-xs text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/15 rounded-lg px-2.5 py-1.5">
                    💡 {exercise.weight_suggestion}
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-3 mb-2">Log your sets</p>
            <div className="space-y-2">
              {sets.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-10">Set {i+1}</span>
                  <input
                    type="number"
                    placeholder="Reps"
                    value={s.reps}
                    onChange={e => updateSet(i, "reps", e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                  />
                  <input
                    type="number"
                    placeholder="kg"
                    value={s.weight}
                    onChange={e => updateSet(i, "weight", e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                  />
                  {sets.length > 1 && (
                    <button onClick={() => removeSet(i)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={addSet}
                className="flex-1 py-1.5 rounded-lg text-xs text-gray-500 border border-white/10 hover:border-white/20 transition"
              >
                + Add Set
              </button>
              <button
                onClick={handleLog}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition"
              >
                Log Exercise
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
