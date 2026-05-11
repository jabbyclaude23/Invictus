import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Play, RotateCcw, CheckCircle, ChevronDown, ChevronUp, RefreshCw, Send, Loader2 } from "lucide-react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs, query, deleteDoc } from "firebase/firestore";
import { useCoach } from "../context/CoachContext";
import WorkoutOnboarding from "../components/WorkoutOnboarding";
import ExerciseCard from "../components/ExerciseCard";
import ExerciseDetailModal from "../components/ExerciseDetailModal";
import { getExercise, getSameMuscleAlts, EXERCISES } from "../data/exercises";

const WEEK_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const today    = () => new Date();
const todayStr = () => today().toISOString().slice(0, 10);
const todayDay = () => WEEK_DAYS[today().getDay()];

const PLAN_PROMPT = `You are a certified strength and conditioning coach. Generate a personalized workout program as JSON only. No text before or after the JSON.

CRITICAL — follow these rules before choosing any exercise:
1. EQUIPMENT: Only use exercises that require equipment the user actually has. If they listed "Bodyweight Only", every exercise must be bodyweight. If they have "Dumbbells" but no barbell, never write "Barbell Bench Press". Match equipment exactly.
2. LOCATION: If location is "Home", never include gym machine exercises unless the user specifically listed "Cables / Machines".
3. DURATION: Keep each training day within the user's stated workout duration. Fewer sets if 30–45 min; fuller volume at 60–75 min.
4. INJURIES: If the user listed injuries or movements to avoid, exclude those movements entirely and substitute safe alternatives.
5. TARGET AREAS: If the user listed target areas, weight the program toward those muscle groups.
6. SPLIT LOGIC: 2–3 days → Full Body. 4 days → Upper/Lower. 5 days → Push/Pull/Legs + Upper + Lower. 6 days → Push/Pull/Legs x2.
7. EXPERIENCE: Beginners get 2–3 compound movements per session; advanced lifters get more volume and exercise variety.
8. VARIETY: Select exercises that match the user's specific equipment — do not default to barbell movements unless the user has barbells.

Return this exact JSON structure (no extra keys, no markdown):
{
  "program_name": "string",
  "timeline_weeks": number,
  "days_per_week": number,
  "weekly_schedule": [
    {
      "day": "Monday",
      "focus": "Upper Body — Push",
      "estimatedDuration": "60 min",
      "exercises": [
        { "name": "Dumbbell Bench Press", "muscle": "chest", "sets": 3, "reps": "8-12", "weight_suggestion": "Moderate — last 2 reps hard", "rest_seconds": 90 }
      ]
    }
  ]
}`;

const MODIFY_PROMPT = `You are a certified strength and conditioning coach updating an existing workout plan based on user feedback. Make the requested changes while keeping the rest of the plan consistent. Return ONLY the complete updated plan in the exact same JSON structure. No explanation, no extra text — just JSON.`;

function WorkoutChatBar({ onSend, loading }) {
  const [inputVal, setInputVal] = React.useState("");
  const inputRef = useRef(null);

  const handleSend = () => {
    const trimmed = inputVal.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInputVal("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div
      className="fixed left-0 right-0 z-40 px-4"
      style={{ bottom: "76px" }}
    >
      <div className="max-w-lg mx-auto bg-[#111] border border-red-500/20 rounded-2xl flex items-center gap-2 px-3 py-2 shadow-xl">
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKey}
          placeholder="e.g. heavier on chest, only dumbbells available…"
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !inputVal.trim()}
          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 disabled:opacity-40 transition flex-shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function Workout() {
  const { plans, generatePlan } = useCoach();

  // ── Profile & loading ───────────────────────────────────────────────────
  const [profile,        setProfile]        = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [generating,     setGenerating]     = useState(false);

  // ── View state ──────────────────────────────────────────────────────────
  const [view, setView] = useState("plan"); // "plan" | "active"

  // ── Active workout state (preserved across back/resume) ─────────────────
  const [exercises,      setExercises]      = useState([]);
  const [loggedSets,     setLoggedSets]     = useState({});
  const [swappedEx,      setSwappedEx]      = useState({});
  const [history,        setHistory]        = useState({});
  const [isWorkoutPaused,setIsWorkoutPaused]= useState(false);
  const [workoutStartTime,setWorkoutStartTime]=useState(null);
  const [elapsed,        setElapsed]        = useState(0); // seconds

  // ── Plan view state ─────────────────────────────────────────────────────
  const [expandedDay,    setExpandedDay]    = useState(null);
  const [planSwaps,      setPlanSwaps]      = useState({}); // "dayIdx::exName" → lib exercise obj
  const [detailExercise, setDetailExercise] = useState(null); // exercise obj + dayIdx
  const [workoutDone,    setWorkoutDone]    = useState(false);
  const [todayLogged,    setTodayLogged]    = useState(false);
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [chatLoading,    setChatLoading]    = useState(false);
  const [chatMessage,    setChatMessage]    = useState(null);

  // ── Load profile ────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async u => {
      if (!u) { setProfileLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", u.uid, "profile", "info"));
        if (snap.exists()) setProfile(snap.data());
      } catch (e) {
        console.error("Failed to load workout profile:", e);
      } finally {
        setProfileLoading(false);
      }
    });
    return unsub;
  }, []);

  // ── Check today already logged ──────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      const u = auth.currentUser;
      if (!u) return;
      const snap = await getDoc(doc(db, "users", u.uid, "workouts", todayStr()));
      if (snap.exists()) setTodayLogged(true);
    };
    check();
  }, []);

  // ── Load history when active workout starts (fresh only) ────────────────
  useEffect(() => {
    if (view !== "active" || !exercises.length || Object.keys(history).length) return;
    const load = async () => {
      const u = auth.currentUser;
      if (!u) return;
      const h = {};
      const snap = await getDocs(query(collection(db, "users", u.uid, "workouts")));
      for (const ex of exercises) {
        const sessions = [];
        snap.forEach(d => {
          const exLog = d.data().exercises?.[ex.name];
          if (exLog) sessions.push({ date: d.id, weight: exLog[0]?.weight || 0, reps: exLog[0]?.reps || 0 });
        });
        h[ex.name] = sessions.slice(-8);
      }
      setHistory(h);
    };
    load();
  }, [view, exercises]);

  // ── Restore active workout from sessionStorage (survives tab navigation) ──
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("invictus_active_workout");
      if (saved) {
        const { startTime, exercises: savedEx, loggedSets: savedLog } = JSON.parse(saved);
        if (startTime && savedEx?.length) {
          setWorkoutStartTime(startTime);
          setExercises(savedEx);
          setLoggedSets(savedLog || {});
          setIsWorkoutPaused(true);
          setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }
      }
    } catch {}
  }, []);

  // ── Persist active workout to sessionStorage whenever state changes ────────
  useEffect(() => {
    if (!workoutStartTime || !exercises.length) return;
    try {
      sessionStorage.setItem("invictus_active_workout", JSON.stringify({
        startTime: workoutStartTime,
        exercises,
        loggedSets,
      }));
    } catch {}
  }, [workoutStartTime, exercises, loggedSets]);

  // ── Elapsed timer — runs whenever there is an active workout ─────────────
  useEffect(() => {
    if (!workoutStartTime) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - workoutStartTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [workoutStartTime]);

  // ── Onboarding ──────────────────────────────────────────────────────────
  const handleOnboardingComplete = async (formData) => {
    setGenerating(true);
    const u = auth.currentUser;
    if (!u) return;
    await setDoc(doc(db, "users", u.uid, "profile", "info"), { ...formData, createdAt: new Date() });
    setProfile(formData);

    const userPrompt = `User profile: ${JSON.stringify(formData)}. Generate a personalized workout program that strictly respects their equipment (${JSON.stringify(formData.equipment || [])}), location (${formData.location || "gym"}), workout duration (${formData.duration || "60 minutes"}), and any injuries/restrictions (${formData.injuries || "none"}).`;
    const plan = await generatePlan(PLAN_PROMPT, userPrompt);
    if (plan) await setDoc(doc(db, "users", u.uid, "workout_plan", "current"), { ...plan, createdAt: new Date() });
    setGenerating(false);
  };

  // ── Start / Resume workout ───────────────────────────────────────────────
  const startWorkout = () => {
    const plan = plans.workout;
    if (!plan) return;

    if (isWorkoutPaused) {
      // Just resume — exercises + loggedSets already in state
      setIsWorkoutPaused(false);
      setView("active");
      return;
    }

    setWorkoutStartTime(Date.now());
    setElapsed(0);

    // Fresh start — apply any plan-view swaps
    const dayIdx     = plan.weekly_schedule?.findIndex(d => d.day === todayDay());
    const actualIdx  = dayIdx >= 0 ? dayIdx : 0;
    const daySchedule= plan.weekly_schedule?.[actualIdx];
    if (!daySchedule) return;

    const exList = (daySchedule.exercises || []).map(e => {
      const swapKey = `${actualIdx}::${e.name}`;
      const swapped = planSwaps[swapKey];
      if (swapped) return { ...swapped, sets: e.sets, reps: e.reps, weight_suggestion: e.weight_suggestion };
      const lib = getExercise(e.name);
      return lib
        ? { ...lib, sets: e.sets, reps: e.reps, weight_suggestion: e.weight_suggestion }
        : { name: e.name, muscle: e.muscle || "chest", sets: e.sets, reps: e.reps, desc: e.weight_suggestion || "", alts: [] };
    });

    setExercises(exList);
    setLoggedSets({});
    setSwappedEx({});
    setHistory({});
    setView("active");
  };

  // ── Back from active → plan (preserves everything) ──────────────────────
  const handleBackToPlan = () => {
    setIsWorkoutPaused(true);
    setView("plan");
  };

  // ── Discard active workout ───────────────────────────────────────────────
  const discardWorkout = () => {
    setIsWorkoutPaused(false);
    setExercises([]);
    setLoggedSets({});
    setSwappedEx({});
    setHistory({});
    setWorkoutStartTime(null);
    setElapsed(0);
    try { sessionStorage.removeItem("invictus_active_workout"); } catch {}
  };

  // ── Log handlers ────────────────────────────────────────────────────────
  const handleLog  = (name, sets) => setLoggedSets(prev => ({ ...prev, [name]: sets }));
  const handleSwap = (oldName, newEx) => {
    setSwappedEx(prev => ({ ...prev, [oldName]: newEx }));
    setExercises(prev => prev.map(e => e.name === oldName ? { ...newEx, sets: e.sets, reps: e.reps } : e));
  };

  const finishWorkout = async () => {
    const u = auth.currentUser;
    if (!u) return;
    await setDoc(doc(db, "users", u.uid, "workouts", todayStr()), {
      date: todayStr(), day: todayDay(), exercises: loggedSets, createdAt: new Date(),
    });
    setWorkoutDone(true);
    setTodayLogged(true);
    setIsWorkoutPaused(false);
    setWorkoutStartTime(null);
    setElapsed(0);
    setView("plan");
    try { sessionStorage.removeItem("invictus_active_workout"); } catch {}
  };

  // ── Plan-view exercise swap ──────────────────────────────────────────────
  const applyPlanSwap = (dayIdx, oldName, newEx) => {
    setPlanSwaps(prev => ({ ...prev, [`${dayIdx}::${oldName}`]: newEx }));
  };

  // ── Regenerate full plan ─────────────────────────────────────────────────
  const regenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    const u = auth.currentUser;
    const variation = Math.floor(Math.random() * 1000);
    const userPrompt = `User profile: ${JSON.stringify(profile)}. Generate a FRESH variation (seed: ${variation}) — use different exercise selections than before while still strictly matching their equipment, location, and restrictions.`;
    const plan = await generatePlan(PLAN_PROMPT, userPrompt);
    if (plan) await setDoc(doc(db, "users", u.uid, "workout_plan", "current"), { ...plan, createdAt: new Date() });
    setPlanSwaps({}); // clear any pending swaps for old plan
    setGenerating(false);
  };

  // ── New plan (reset) ─────────────────────────────────────────────────────
  const handleNewPlan = async () => {
    setShowNewPlanModal(false);
    const u = auth.currentUser;
    if (!u) return;
    await deleteDoc(doc(db, "users", u.uid, "workout_plan", "current"));
    await deleteDoc(doc(db, "users", u.uid, "profile", "info"));
    setProfile(null);
  };

  // ── Chat-based plan modification ─────────────────────────────────────────
  const handleChatModify = async (userMessage) => {
    const plan = plans.workout;
    const u = auth.currentUser;
    if (!u || !plan) return;
    setChatLoading(true);
    setChatMessage(null);
    try {
      const contextPrompt = `Current workout plan: ${JSON.stringify(plan)}\nUser request: ${userMessage}`;
      const updated = await generatePlan(MODIFY_PROMPT, contextPrompt);
      if (updated) {
        await setDoc(doc(db, "users", u.uid, "workout_plan", "current"), { ...updated, createdAt: new Date() });
        setPlanSwaps({});
        setChatMessage("Plan updated!");
      }
    } catch (e) {
      console.error("Chat modify error:", e);
      setChatMessage("Failed to update plan.");
    } finally {
      setChatLoading(false);
      setTimeout(() => setChatMessage(null), 3000);
    }
  };

  // ── Render guards ────────────────────────────────────────────────────────
  if (profileLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return <WorkoutOnboarding onComplete={handleOnboardingComplete} loading={generating} />;

  if (generating) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="glow-bg glow-workout" />
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin relative z-10" />
      <p className="text-gray-400 text-sm relative z-10">Generating your program…</p>
    </div>
  );

  // ── Active workout view ──────────────────────────────────────────────────
  if (view === "active") return (
    <div className="min-h-screen bg-black pb-28 px-4 pt-6">
      <div className="glow-bg glow-workout" />

      {/* Exercise detail modal — active view */}
      <AnimatePresence>
        {detailExercise && (
          <ExerciseDetailModal
            exercise={detailExercise}
            onClose={() => setDetailExercise(null)}
            onSwap={(newEx) => { handleSwap(detailExercise.name, newEx); setDetailExercise(null); }}
            onLog={handleLog}
          />
        )}
      </AnimatePresence>

      <motion.div className="relative z-10 max-w-lg mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-red-400 tracking-widest uppercase font-display">{todayDay()}</p>
            <h1 className="text-2xl font-bold text-white">Today's Workout</h1>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              {String(Math.floor(elapsed / 3600)).padStart(2,"0")}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2,"0")}:{String(elapsed % 60).padStart(2,"0")}
            </p>
          </div>
          <button
            onClick={handleBackToPlan}
            className="text-xs text-gray-500 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
          >
            ← Back to Plan
          </button>
        </div>

        <div className="space-y-3">
          {exercises.map(ex => (
            <ExerciseCard
              key={ex.name}
              exercise={ex}
              history={history[ex.name] || []}
              onLog={handleLog}
              onSwap={handleSwap}
              onDetail={(e) => setDetailExercise(e)}
            />
          ))}
        </div>

        {Object.keys(loggedSets).length > 0 && (
          <motion.button
            onClick={finishWorkout}
            className="w-full mt-6 py-4 rounded-2xl bg-red-500 text-white font-bold text-lg hover:bg-red-400 transition flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle size={20} /> Finish Workout
          </motion.button>
        )}
      </motion.div>
    </div>
  );

  // ── Plan view ────────────────────────────────────────────────────────────
  const plan = plans.workout;
  return (
    <div className="min-h-[100dvh] bg-black pb-28 px-4 pt-6">
      <div className="glow-bg glow-workout" />

      {/* Exercise detail modal */}
      <AnimatePresence>
        {detailExercise && (
          <ExerciseDetailModal
            exercise={detailExercise}
            onClose={() => setDetailExercise(null)}
            onSwap={detailExercise.dayIdx != null
              ? (newEx) => applyPlanSwap(detailExercise.dayIdx, detailExercise.name, newEx)
              : null
            }
          />
        )}
      </AnimatePresence>

      <motion.div className="relative z-10 max-w-lg mx-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-red-400 tracking-widest uppercase font-display">Workout</p>
            <h1 className="text-2xl font-bold text-white">{plan?.program_name || "Your Program"}</h1>
            {plan && <p className="text-sm text-gray-500 mt-0.5">{plan.timeline_weeks}wk · {plan.days_per_week}x/week</p>}
          </div>
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="text-xs text-gray-500 hover:text-red-400 transition border border-white/10 hover:border-red-500/30 px-3 py-1.5 rounded-xl"
          >
            New Plan
          </button>
        </div>

        {!plan ? (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">No plan yet.</p>
            <button onClick={regenerate} className="mt-3 text-sm text-red-400 hover:text-red-300">Generate Plan</button>
          </div>
        ) : (
          <>
            {/* Today's workout CTA */}
            {plan.weekly_schedule?.some(d => d.day === todayDay()) && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-red-400 uppercase tracking-wide">Today — {todayDay()}</p>
                    <p className="text-white font-semibold mt-0.5">
                      {plan.weekly_schedule.find(d => d.day === todayDay())?.focus}
                    </p>
                    {todayLogged  && <p className="text-xs text-green-400 mt-1">✓ Completed today</p>}
                    {isWorkoutPaused && (
                      <p className="text-xs text-yellow-400 mt-1 font-mono">
                        ⏸ {String(Math.floor(elapsed / 3600)).padStart(2,"0")}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2,"0")}:{String(elapsed % 60).padStart(2,"0")} in progress
                      </p>
                    )}
                  </div>
                  {!todayLogged && (
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        onClick={startWorkout}
                        className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-400 transition"
                      >
                        <Play size={14} />
                        {isWorkoutPaused ? "Resume" : "Start"}
                      </button>
                      {isWorkoutPaused && (
                        <button
                          onClick={discardWorkout}
                          className="text-xs text-gray-600 hover:text-red-400 transition"
                        >
                          × Discard
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Weekly schedule */}
            <div className="space-y-2">
              {plan.weekly_schedule?.map((day, i) => (
                <div key={i} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">

                  {/* Day header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                  >
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${day.day === todayDay() ? "text-red-400" : "text-white"}`}>
                        {day.day}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{day.focus}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {Object.keys(planSwaps).some(k => k.startsWith(`${i}::`)) && (
                        <span className="text-xs text-blue-400">edited</span>
                      )}
                      <span className="text-xs text-gray-600">{day.exercises?.length} exercises</span>
                      {expandedDay === i
                        ? <ChevronUp size={14} className="text-gray-500" />
                        : <ChevronDown size={14} className="text-gray-500" />}
                    </div>
                  </button>

                  {/* Expanded exercise list */}
                  <AnimatePresence>
                    {expandedDay === i && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/5 px-3 pb-3 pt-1 space-y-1">
                          {day.exercises?.map((ex, j) => {
                            const swapKey    = `${i}::${ex.name}`;
                            const activeEx   = planSwaps[swapKey]
                              ? { ...planSwaps[swapKey], sets: ex.sets, reps: ex.reps, weight_suggestion: ex.weight_suggestion }
                              : ex;
                            const isSwapped  = !!planSwaps[swapKey];
                            const muscle     = activeEx.muscle || ex.muscle || "chest";

                            return (
                              <div key={j} className="flex items-center gap-2 group">
                                {/* Clickable exercise row → opens detail modal */}
                                <button
                                  onClick={() => setDetailExercise({ ...activeEx, muscle, dayIdx: i })}
                                  className="flex-1 flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/5 transition text-left"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`text-sm ${isSwapped ? "text-blue-300" : "text-gray-300"} truncate`}>
                                      {activeEx.name}
                                    </span>
                                    {isSwapped && (
                                      <span className="text-xs text-blue-500 flex-shrink-0">↔</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-600 flex-shrink-0 ml-2">
                                    {ex.sets}×{ex.reps}
                                  </span>
                                </button>

                                {/* Per-exercise swap button */}
                                <button
                                  onClick={() => setDetailExercise({ ...activeEx, muscle, dayIdx: i })}
                                  className="p-1.5 rounded-lg text-gray-700 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                                  title="Swap exercise"
                                >
                                  <RefreshCw size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Rest day */}
            {!plan.weekly_schedule?.some(d => d.day === todayDay()) && (
              <div className="mt-4 bg-[#111] border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-sm">Rest day today. Recovery is part of the program.</p>
              </div>
            )}
          </>
        )}

        {/* Completion toast */}
        <AnimatePresence>
          {workoutDone && (
            <motion.div
              className="fixed inset-x-4 bottom-24 bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center z-50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircle size={20} className="text-green-400 mx-auto mb-1" />
              <p className="text-green-400 font-semibold text-sm">Workout logged!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat loading indicator */}
        {chatLoading && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Loader2 size={14} className="text-red-400 animate-spin" />
            <p className="text-xs text-gray-500">Updating your plan…</p>
          </div>
        )}

        {/* Chat feedback message */}
        {chatMessage && (
          <div className="flex justify-center mt-3">
            <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-2 rounded-full">
              {chatMessage}
            </span>
          </div>
        )}
      </motion.div>

      {/* New Plan confirmation modal */}
      <AnimatePresence>
        {showNewPlanModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h2 className="text-lg font-bold text-white mb-2">Start a New Plan?</h2>
              <p className="text-sm text-gray-400 mb-5">
                This will end your current workout program and walk you through setup again. All your logged workout sessions will be preserved.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewPlanModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNewPlan}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-400 transition"
                >
                  Start Fresh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat bar — plan view only */}
      {plan && <WorkoutChatBar onSend={handleChatModify} loading={chatLoading} />}
    </div>
  );
}
