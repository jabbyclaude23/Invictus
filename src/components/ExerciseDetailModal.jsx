import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { EXERCISES, MUSCLE_COLORS, MUSCLE_BG, getSameMuscleAlts } from "../data/exercises";

// ── Data fetcher: ExerciseDB (search → detail) → wger fallback ──────────────
const INFO_CACHE = {};
async function fetchExerciseInfo(name) {
  if (INFO_CACHE[name] !== undefined) return INFO_CACHE[name];
  const lc = name.toLowerCase();

  // 1. Search by name, then fetch detail for video + instructions
  try {
    const r = await fetch(`/api/exercisedb?type=name&q=${encodeURIComponent(name)}&limit=10`);
    if (r.ok) {
      const json = await r.json();
      const data = json.data || [];
      if (data.length) {
        // Prefer exact name, then partial match, then first result
        const match =
          data.find(e => e.name?.toLowerCase() === lc) ||
          data.find(e => e.name?.toLowerCase().includes(lc)) ||
          data.find(e => lc.includes(e.name?.toLowerCase())) ||
          data[0];

        // Fetch the detail record to get videoUrl + instructions
        const dr = await fetch(`/api/exercisedb?type=detail&id=${match.exerciseId}`);
        if (dr.ok) {
          const dj = await dr.json();
          const d  = dj.data || {};
          INFO_CACHE[name] = {
            video:        d.videoUrl || null,
            img:          d.imageUrl || match.imageUrl || null,
            instructions: Array.isArray(d.instructions) ? d.instructions : [],
            desc:         d.overview  || null,
            equipment:    (d.equipments || match.equipments || [])[0] || null,
          };
          return INFO_CACHE[name];
        }

        // Detail fetch failed — use search-level data
        INFO_CACHE[name] = {
          video: null, img: match.imageUrl || null,
          instructions: [], desc: null,
          equipment: (match.equipments || [])[0] || null,
        };
        return INFO_CACHE[name];
      }
    }
  } catch {}

  // 2. Fall back to wger (static image + HTML description)
  try {
    const r1 = await fetch(`https://wger.de/api/v2/exercise/?format=json&language=2&name=${encodeURIComponent(name)}`);
    const d1 = await r1.json();
    const id = d1?.results?.[0]?.id;
    if (!id) throw new Error("no id");
    const r2 = await fetch(`https://wger.de/api/v2/exerciseinfo/${id}/?format=json`);
    const d2 = await r2.json();
    const img  = d2?.images?.[0]?.image || null;
    const raw  = d2?.translations?.find(t => t.language === 2)?.description || "";
    const desc = raw.replace(/<[^>]+>/g, "").trim();
    INFO_CACHE[name] = { video: null, img, instructions: [], desc, equipment: null };
    return INFO_CACHE[name];
  } catch {
    INFO_CACHE[name] = null;
    return null;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ExerciseDetailModal({ exercise, onClose, onSwap, onLog }) {
  const [info,       setInfo]       = useState(null);
  const [infoLoading,setInfoLoading]= useState(true);
  const [history,    setHistory]    = useState([]);
  const [histLoaded, setHistLoaded] = useState(false);
  const [showSwap,   setShowSwap]   = useState(false);
  const [swapFilter, setSwapFilter] = useState("");

  // Log sets state (only used when onLog is provided — active workout mode)
  const defaultSets = () => Array.from({ length: exercise?.sets || 1 }, () => ({ reps: "", weight: "" }));
  const [sets,       setSets]       = useState(defaultSets);
  const [logDone,    setLogDone]    = useState(false);
  const [loggedSets, setLoggedSets] = useState([]);

  const muscle      = exercise?.muscle || "chest";
  const muscleColor = MUSCLE_COLORS[muscle] || "text-gray-400";
  const muscleBg    = MUSCLE_BG[muscle]    || "bg-gray-400/10 border-gray-400/20";
  const libEntry    = EXERCISES.find(e => e.name === exercise?.name);
  const allAlts     = getSameMuscleAlts(muscle, exercise?.name);
  const filteredAlts = swapFilter
    ? allAlts.filter(a => a.name.toLowerCase().includes(swapFilter.toLowerCase()))
    : allAlts;

  useEffect(() => {
    if (!exercise?.name) return;
    setInfo(null); setInfoLoading(true);
    setHistory([]); setHistLoaded(false);
    setShowSwap(false); setSwapFilter("");
    setSets(Array.from({ length: exercise?.sets || 1 }, () => ({ reps: "", weight: "" })));
    setLogDone(false); setLoggedSets([]);

    fetchExerciseInfo(exercise.name).then(d => { setInfo(d); setInfoLoading(false); });

    const u = auth.currentUser;
    if (!u) { setHistLoaded(true); return; }
    getDocs(collection(db, "users", u.uid, "workouts")).then(snap => {
      const sessions = [];
      snap.forEach(d => {
        const exLog = d.data().exercises?.[exercise.name];
        if (exLog) sessions.push({
          date:   d.id.slice(5),
          weight: parseFloat(exLog[0]?.weight) || 0,
          reps:   parseInt(exLog[0]?.reps)     || 0,
        });
      });
      setHistory(sessions.slice(-10));
      setHistLoaded(true);
    });
  }, [exercise?.name]);

  const addSet    = () => setSets(s => [...s, { reps: "", weight: "" }]);
  const removeSet = i => setSets(s => s.filter((_, idx) => idx !== i));
  const updateSet = (i, field, val) => setSets(s => s.map((x, idx) => idx === i ? { ...x, [field]: val } : x));
  const handleLog = () => {
    const valid = sets.filter(s => s.reps);
    if (!valid.length || !onLog) return;
    onLog(exercise.name, valid);
    setLoggedSets(valid);
    setLogDone(true);
  };

  if (!exercise) return null;

  const heroVideo = info?.video || null;
  const heroImg   = info?.img   || null;
  const instructions = info?.instructions?.length ? info.instructions : (info?.desc ? [info.desc] : (libEntry?.desc ? [libEntry.desc] : []));

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black overflow-y-auto flex flex-col"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur z-10 flex items-center justify-between px-4 pt-safe pt-5 pb-3 border-b border-white/5">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#111] border border-white/10 text-gray-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
          <span className={`text-xs px-3 py-1 rounded-full border font-medium ${muscleBg} ${muscleColor}`}>
            {muscle}
          </span>
        </div>

        <div className="px-4 pb-32 max-w-lg mx-auto w-full space-y-4 pt-4">

          {/* Hero: video (MP4) → image → placeholder */}
          {infoLoading ? (
            <div className="w-full h-52 rounded-2xl bg-[#111] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : heroVideo ? (
            <div className="w-full h-52 rounded-2xl overflow-hidden bg-[#111]">
              <video
                src={heroVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
          ) : heroImg ? (
            <div className="w-full h-52 rounded-2xl overflow-hidden bg-[#111]">
              <img src={heroImg} alt={exercise.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`w-full h-24 rounded-2xl bg-gradient-to-br ${MUSCLE_COLORS[muscle] ? "from-[#1a1a1a]" : "from-[#111]"} to-[#0a0a0a] flex items-center justify-center`}>
              <span className="text-4xl opacity-40">
                {muscle === "chest" ? "🏋️" : muscle === "back" ? "🦾" : muscle === "legs" ? "🦵" : muscle === "shoulders" ? "🎯" : muscle === "arms" ? "💪" : muscle === "core" ? "⚡" : "🏃"}
              </span>
            </div>
          )}

          {/* Name + plan details */}
          <div>
            <h1 className="text-2xl font-bold text-white">{exercise.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500 flex-wrap">
              {exercise.sets && <span>{exercise.sets} sets</span>}
              {exercise.reps && <><span>·</span><span>{exercise.reps} reps</span></>}
              {exercise.rest_seconds && <><span>·</span><span>{exercise.rest_seconds}s rest</span></>}
              {info?.equipment && <><span>·</span><span className="capitalize">{info.equipment}</span></>}
            </div>
            {exercise.weight_suggestion && (
              <p className="text-xs text-red-400 mt-1.5 bg-red-500/5 border border-red-500/15 rounded-lg px-2.5 py-1.5 inline-block">
                {exercise.weight_suggestion}
              </p>
            )}
          </div>

          {/* Instructions */}
          {instructions.length > 0 && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">Instructions</p>
              <ol className="space-y-2.5">
                {instructions.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    {instructions.length > 1 && (
                      <span className="text-xs text-red-400 font-bold mt-0.5 flex-shrink-0 w-4">{i + 1}.</span>
                    )}
                    <p className="text-sm text-gray-300 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Log Sets — shown only in active workout mode */}
          {onLog && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">Log Sets</p>
              {logDone ? (
                <div className="space-y-1.5">
                  {loggedSets.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-gray-600 w-10 flex-shrink-0">Set {i + 1}</span>
                      <span className="text-white font-medium">{s.reps} reps</span>
                      {s.weight ? <span className="text-gray-400">· {s.weight} kg</span> : null}
                    </div>
                  ))}
                  <p className="text-sm text-green-400 flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
                    ✓ Logged! Great work.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-3">
                    {sets.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 w-10 flex-shrink-0">Set {i + 1}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Reps"
                          value={s.reps}
                          onChange={e => updateSet(i, "reps", e.target.value)}
                          className="flex-1 min-w-0 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="kg"
                          value={s.weight}
                          onChange={e => updateSet(i, "weight", e.target.value)}
                          className="w-20 flex-shrink-0 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
                        />
                        {sets.length > 1 && (
                          <button onClick={() => removeSet(i)} className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0 w-5">✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addSet}
                      className="flex-1 py-2 rounded-xl text-xs text-gray-500 border border-white/10 hover:border-white/20 transition"
                    >
                      + Add Set
                    </button>
                    <button
                      onClick={handleLog}
                      disabled={!sets.some(s => s.reps)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 disabled:opacity-40 transition"
                    >
                      Log Exercise
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Progress chart */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-red-400" />
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Your Progress</p>
            </div>
            {!histLoaded ? (
              <div className="h-8 flex items-center">
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length > 0 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tick={{ fill: "#555", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#555", fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid #222", color: "#fff", fontSize: 11 }}
                      formatter={(v, n) => [`${v}${n === "weight" ? " kg" : ""}`, n]}
                    />
                    <Bar dataKey="weight" fill="#ef4444" radius={[4, 4, 0, 0]} name="Weight" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-600 italic">
                No history yet — log this exercise to start tracking.
              </p>
            )}
          </div>

          {/* Swap — full muscle group list */}
          {onSwap && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
              <button
                onClick={() => setShowSwap(s => !s)}
                className="flex items-center justify-between w-full"
              >
                <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  Swap — All {muscle} exercises ({allAlts.length})
                </p>
                {showSwap
                  ? <ChevronUp size={14} className="text-gray-500" />
                  : <ChevronDown size={14} className="text-gray-500" />}
              </button>

              <AnimatePresence>
                {showSwap && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {/* Filter input */}
                    <input
                      type="text"
                      value={swapFilter}
                      onChange={e => setSwapFilter(e.target.value)}
                      placeholder="Filter exercises…"
                      className="w-full mt-3 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/40 placeholder-gray-600"
                    />
                    <div className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
                      {filteredAlts.length === 0 ? (
                        <p className="text-xs text-gray-600 italic py-2 text-center">No matches</p>
                      ) : filteredAlts.map(alt => (
                        <button
                          key={alt.name}
                          onClick={() => { onSwap(alt); onClose(); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl bg-[#1a1a1a] border border-white/5 hover:border-red-500/30 transition group"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-white font-medium">{alt.name}</p>
                            <span className="text-xs text-gray-600 group-hover:text-red-400 transition">
                              Select →
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{alt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
