import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { EXERCISES, MUSCLE_COLORS, MUSCLE_BG, getSameMuscleAlts } from "../data/exercises";

// ── wger fetcher ────────────────────────────────────────────────────────────
const WGER_CACHE = {};
async function fetchWgerInfo(name) {
  if (WGER_CACHE[name] !== undefined) return WGER_CACHE[name];
  try {
    const r1 = await fetch(
      `https://wger.de/api/v2/exercise/?format=json&language=2&name=${encodeURIComponent(name)}`
    );
    const d1 = await r1.json();
    const id = d1?.results?.[0]?.id;
    if (!id) { WGER_CACHE[name] = null; return null; }

    const r2 = await fetch(`https://wger.de/api/v2/exerciseinfo/${id}/?format=json`);
    const d2 = await r2.json();
    const img  = d2?.images?.[0]?.image || null;
    const raw  = d2?.translations?.find(t => t.language === 2)?.description || "";
    const desc = raw.replace(/<[^>]+>/g, "").trim();
    WGER_CACHE[name] = { img, desc };
    return WGER_CACHE[name];
  } catch {
    WGER_CACHE[name] = null;
    return null;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export default function ExerciseDetailModal({ exercise, onClose, onSwap }) {
  const [wger,       setWger]       = useState(null);
  const [history,    setHistory]    = useState([]);
  const [histLoaded, setHistLoaded] = useState(false);
  const [showSwap,   setShowSwap]   = useState(false);

  const muscle      = exercise?.muscle || "chest";
  const muscleColor = MUSCLE_COLORS[muscle] || "text-gray-400";
  const muscleBg    = MUSCLE_BG[muscle]    || "bg-gray-400/10 border-gray-400/20";
  const libEntry    = EXERCISES.find(e => e.name === exercise?.name);
  const alts        = getSameMuscleAlts(muscle, exercise?.name).slice(0, 7);

  // Fetch wger image + description
  useEffect(() => {
    if (!exercise?.name) return;
    setWger(null);
    setHistory([]);
    setHistLoaded(false);
    setShowSwap(false);
    fetchWgerInfo(exercise.name).then(setWger);
  }, [exercise?.name]);

  // Load Firestore history
  useEffect(() => {
    if (!exercise?.name) return;
    const u = auth.currentUser;
    if (!u) { setHistLoaded(true); return; }
    getDocs(collection(db, "users", u.uid, "workouts")).then(snap => {
      const sessions = [];
      snap.forEach(d => {
        const exLog = d.data().exercises?.[exercise.name];
        if (exLog) sessions.push({
          date:   d.id.slice(5),          // "MM-DD"
          weight: parseFloat(exLog[0]?.weight) || 0,
          reps:   parseInt(exLog[0]?.reps)     || 0,
        });
      });
      setHistory(sessions.slice(-10));
      setHistLoaded(true);
    });
  }, [exercise?.name]);

  if (!exercise) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/95 overflow-y-auto flex flex-col"
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur z-10 flex items-center justify-between px-4 pt-6 pb-3">
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

        <div className="px-4 pb-28 max-w-lg mx-auto w-full space-y-4">

          {/* Hero image */}
          {wger?.img && (
            <div className="w-full h-52 rounded-2xl overflow-hidden bg-[#111]">
              <img src={wger.img} alt={exercise.name} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Name + plan details */}
          <div>
            <h1 className="text-2xl font-bold text-white">{exercise.name}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
              <span>{exercise.sets} sets</span>
              <span>·</span>
              <span>{exercise.reps} reps</span>
              {exercise.rest_seconds && <><span>·</span><span>{exercise.rest_seconds}s rest</span></>}
            </div>
            {exercise.weight_suggestion && (
              <p className="text-xs text-red-400 mt-1">{exercise.weight_suggestion}</p>
            )}
          </div>

          {/* Instructions */}
          {(wger?.desc || libEntry?.desc) && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">Instructions</p>
              <p className="text-sm text-gray-300 leading-relaxed">
                {wger?.desc || libEntry?.desc}
              </p>
            </div>
          )}

          {/* Progress chart */}
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-red-400" />
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Your Progress</p>
            </div>
            {!histLoaded ? (
              <div className="h-10 flex items-center">
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
                      formatter={(v, n) => [`${v} ${n === "weight" ? "kg" : ""}`, n]}
                    />
                    <Bar dataKey="weight" fill="#ef4444" radius={[4, 4, 0, 0]} name="Weight" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-gray-600 italic">
                No history yet — complete this exercise during a workout to start tracking.
              </p>
            )}
          </div>

          {/* Same-muscle swap */}
          {onSwap && alts.length > 0 && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-4">
              <button
                onClick={() => setShowSwap(s => !s)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition w-full"
              >
                <RefreshCw size={14} className={showSwap ? "text-red-400" : ""} />
                <span className={showSwap ? "text-white" : ""}>
                  Swap for a {muscle} alternative
                </span>
              </button>

              <AnimatePresence>
                {showSwap && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {alts.map(alt => (
                        <button
                          key={alt.name}
                          onClick={() => { onSwap(alt); onClose(); }}
                          className="w-full text-left px-3 py-2.5 rounded-xl bg-[#1a1a1a] border border-white/5 hover:border-red-500/30 transition group"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-white font-medium">{alt.name}</p>
                            <span className="text-xs text-gray-600 group-hover:text-red-400 transition">Select →</span>
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
