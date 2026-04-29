import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Play, RotateCcw, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs, query } from "firebase/firestore";
import { useCoach } from "../context/CoachContext";
import WorkoutOnboarding from "../components/WorkoutOnboarding";
import ExerciseCard from "../components/ExerciseCard";
import { getExercise } from "../data/exercises";

const WEEK_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const today = () => new Date();
const todayStr = () => today().toISOString().slice(0, 10);
const todayDay = () => WEEK_DAYS[today().getDay()];

const PLAN_PROMPT = `You are a certified strength and conditioning coach. Generate a personalized workout program as JSON only. No text before or after the JSON.

Return this exact structure:
{
  "program_name": "string",
  "timeline_weeks": number,
  "days_per_week": number,
  "weekly_schedule": [
    {
      "day": "Monday",
      "focus": "Push (Chest / Shoulders / Triceps)",
      "exercises": [
        { "name": "Bench Press", "muscle": "chest", "sets": 4, "reps": "8-10", "weight_suggestion": "Start at 60% 1RM", "rest_seconds": 90 }
      ]
    }
  ]
}

Rules:
- Use only evidence-based, mainstream exercise names (Bench Press, Squat, etc.)
- Scale intensity to experience level
- Include warm-up and cool-down notes inside the focus string if needed
- days_per_week must match the user's preference
- timeline_weeks from user preference (remove " weeks" suffix)`;

export default function Workout() {
  const { plans, generatePlan, askCoach } = useCoach();
  const [profile, setProfile]   = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [view, setView]         = useState("plan"); // "onboarding" | "plan" | "active"
  const [exercises, setExercises] = useState([]);
  const [loggedSets, setLoggedSets] = useState({});
  const [swappedEx, setSwappedEx] = useState({});
  const [history, setHistory]   = useState({});
  const [workoutDone, setWorkoutDone] = useState(false);
  const [todayLogged, setTodayLogged] = useState(false);
  const [expandedDay, setExpandedDay] = useState(null);

  // Load user profile
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async u => {
      if (!u) return;
      const snap = await getDoc(doc(db, "users", u.uid, "profile", "info"));
      if (snap.exists()) setProfile(snap.data());
      setProfileLoading(false);
    });
    return unsub;
  }, []);

  // Check if today is already logged
  useEffect(() => {
    const check = async () => {
      const u = auth.currentUser;
      if (!u) return;
      const snap = await getDoc(doc(db, "users", u.uid, "workouts", todayStr()));
      if (snap.exists()) setTodayLogged(true);
    };
    check();
  }, []);

  // Load exercise history when active workout starts
  useEffect(() => {
    if (view !== "active" || !exercises.length) return;
    const load = async () => {
      const u = auth.currentUser;
      if (!u) return;
      const h = {};
      for (const ex of exercises) {
        const q = query(collection(db, "users", u.uid, "workouts"));
        const snap = await getDocs(q);
        const sessions = [];
        snap.forEach(d => {
          const data = d.data();
          const exLog = data.exercises?.[ex.name];
          if (exLog) sessions.push({ date: d.id, weight: exLog[0]?.weight || 0, reps: exLog[0]?.reps || 0 });
        });
        h[ex.name] = sessions.slice(-8);
      }
      setHistory(h);
    };
    load();
  }, [view, exercises]);

  const handleOnboardingComplete = async (formData) => {
    setGenerating(true);
    const u = auth.currentUser;
    if (!u) return;
    await setDoc(doc(db, "users", u.uid, "profile", "info"), { ...formData, createdAt: new Date() });
    setProfile(formData);

    const userPrompt = `User profile: ${JSON.stringify(formData)}. Generate a workout program matching their preferences exactly.`;
    const plan = await generatePlan(PLAN_PROMPT, userPrompt);

    if (plan) {
      await setDoc(doc(db, "users", u.uid, "workout_plan", "current"), { ...plan, createdAt: new Date() });
    }
    setGenerating(false);
  };

  const startWorkout = () => {
    const plan = plans.workout;
    if (!plan) return;
    const daySchedule = plan.weekly_schedule?.find(d => d.day === todayDay())
      || plan.weekly_schedule?.[0];
    if (!daySchedule) return;
    const exList = (daySchedule.exercises || []).map(e => {
      const lib = getExercise(e.name);
      return lib ? { ...lib, sets: e.sets, reps: e.reps, weight_suggestion: e.weight_suggestion } : { name: e.name, muscle: e.muscle || "chest", sets: e.sets, reps: e.reps, desc: e.weight_suggestion || "", alts: [] };
    });
    setExercises(exList);
    setView("active");
  };

  const handleLog = (name, sets) => {
    setLoggedSets(prev => ({ ...prev, [name]: sets }));
  };

  const handleSwap = (oldName, newEx) => {
    setSwappedEx(prev => ({ ...prev, [oldName]: newEx }));
    setExercises(prev => prev.map(e => e.name === oldName ? { ...newEx, sets: e.sets, reps: e.reps } : e));
  };

  const finishWorkout = async () => {
    const u = auth.currentUser;
    if (!u) return;
    await setDoc(doc(db, "users", u.uid, "workouts", todayStr()), {
      date: todayStr(),
      day: todayDay(),
      exercises: loggedSets,
      createdAt: new Date(),
    });
    setWorkoutDone(true);
    setTodayLogged(true);
    setView("plan");
  };

  const regenerate = async () => {
    if (!profile) return;
    setGenerating(true);
    const u = auth.currentUser;
    const userPrompt = `User profile: ${JSON.stringify(profile)}. Regenerate a fresh workout program.`;
    const plan = await generatePlan(PLAN_PROMPT, userPrompt);
    if (plan) await setDoc(doc(db, "users", u.uid, "workout_plan", "current"), { ...plan, createdAt: new Date() });
    setGenerating(false);
  };

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

  // Active workout view
  if (view === "active") return (
    <div className="min-h-screen bg-black pb-28 px-4 pt-6">
      <div className="glow-bg glow-workout" />
      <motion.div className="relative z-10 max-w-lg mx-auto" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-red-400 tracking-widest uppercase font-display">{todayDay()}</p>
            <h1 className="text-2xl font-bold text-white">Today's Workout</h1>
          </div>
          <button onClick={() => setView("plan")} className="text-xs text-gray-500 hover:text-white transition">← Back</button>
        </div>

        <div className="space-y-3">
          {exercises.map(ex => (
            <ExerciseCard
              key={ex.name}
              exercise={ex}
              history={history[ex.name] || []}
              onLog={handleLog}
              onSwap={handleSwap}
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

  // Plan view
  const plan = plans.workout;
  return (
    <div className="min-h-screen bg-black pb-28 px-4 pt-6">
      <div className="glow-bg glow-workout" />
      <motion.div className="relative z-10 max-w-lg mx-auto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-red-400 tracking-widest uppercase font-display">Workout</p>
            <h1 className="text-2xl font-bold text-white">{plan?.program_name || "Your Program"}</h1>
            {plan && <p className="text-sm text-gray-500 mt-0.5">{plan.timeline_weeks}wk · {plan.days_per_week}x/week</p>}
          </div>
          <button
            onClick={regenerate}
            disabled={generating}
            className="p-2 rounded-xl border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-500/30 transition"
          >
            <RotateCcw size={16} />
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
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-400 uppercase tracking-wide">Today — {todayDay()}</p>
                  <p className="text-white font-semibold mt-0.5">
                    {plan.weekly_schedule.find(d => d.day === todayDay())?.focus}
                  </p>
                  {todayLogged && <p className="text-xs text-green-400 mt-1">✓ Completed today</p>}
                </div>
                {!todayLogged && (
                  <button
                    onClick={startWorkout}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-400 transition"
                  >
                    <Play size={14} /> Start
                  </button>
                )}
              </div>
            )}

            {/* Weekly schedule */}
            <div className="space-y-2">
              {plan.weekly_schedule?.map((day, i) => (
                <div key={i} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                  >
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${day.day === todayDay() ? "text-red-400" : "text-white"}`}>{day.day}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{day.focus}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">{day.exercises?.length} exercises</span>
                      {expandedDay === i ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedDay === i && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-1.5 border-t border-white/5">
                          {day.exercises?.map((ex, j) => (
                            <div key={j} className="flex items-center justify-between py-1.5">
                              <span className="text-sm text-gray-300">{ex.name}</span>
                              <span className="text-xs text-gray-600">{ex.sets}×{ex.reps}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Non-training days hint */}
            {!plan.weekly_schedule?.some(d => d.day === todayDay()) && (
              <div className="mt-4 bg-[#111] border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-gray-500 text-sm">Rest day today. Recovery is part of the program.</p>
              </div>
            )}
          </>
        )}

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
      </motion.div>
    </div>
  );
}
