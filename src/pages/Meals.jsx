import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronDown, ChevronUp, Send, Loader2, Sparkles } from "lucide-react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, addDoc, getDocs, deleteDoc, collection, query, where, orderBy } from "firebase/firestore";
import { useCoach } from "../context/CoachContext";
import MacroSummary from "../components/MacroSummary";
import MealLogModal from "../components/MealLogModal";

const todayStr = () => new Date().toISOString().slice(0, 10);
const WEEK_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const todayDay = () => WEEK_DAYS[new Date().getDay()];
const MEAL_ORDER = ["Breakfast","Pre-workout","Lunch","Snack","Post-workout","Dinner"];
const sortMeals = meals => [...meals].sort((a, b) => {
  const ai = MEAL_ORDER.indexOf(a.mealType); const bi = MEAL_ORDER.indexOf(b.mealType);
  return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
});

// AI calculates calories/protein — user never enters raw numbers
const MEAL_PLAN_PROMPT = `You are a certified nutritionist. Generate a personalized 7-day meal plan as JSON only. No text before or after.

Calculate appropriate daily calorie and protein targets based on the user's goal, dietary preference, meals per day, and any notes. Do NOT ask for numbers — derive them from context.

Return this exact structure:
{
  "daily_targets": {"calories": number, "protein": number, "carbs": number, "fat": number},
  "days": [
    {
      "day": "Monday",
      "meals": [
        {
          "meal": "Breakfast",
          "time": "8:00 AM",
          "foods": ["food 1", "food 2"],
          "macros": {"calories": number, "protein": number, "carbs": number, "fat": number}
        }
      ]
    }
  ]
}

Rules:
- High protein (at least 30% of calories from protein)
- Practical, easily sourced ingredients
- Consistent daily calorie target within +-50 kcal
- Fully respect any dietary restrictions or preferences in notes
- Scale calories: Lose Fat = moderate deficit, Build Muscle = surplus, Maintain = maintenance, Recomp = maintenance`;

const MEAL_MODIFY_PROMPT = `You are a nutritionist updating a meal plan. The user's request may target a single meal, a single day, or the full plan — identify the scope and make only the necessary changes. Always respect existing dietary restrictions. Return the COMPLETE updated plan in the exact same JSON structure. No explanation, no extra text — just JSON.`;

const SETUP_QUESTIONS = [
  {
    key: "diet",
    label: "What is your dietary style?",
    options: ["Standard", "Vegetarian", "Vegan", "Keto", "Paleo", "Mediterranean"],
  },
  {
    key: "goal",
    label: "What is your nutrition goal?",
    options: ["Build Muscle", "Lose Fat", "Maintain Weight", "Recomp"],
  },
  {
    key: "meals",
    label: "How many meals per day?",
    options: ["2", "3", "4", "5"],
  },
  {
    key: "notes",
    label: "Any restrictions, allergies or preferences?",
    type: "textarea",
    placeholder: "e.g. no dairy, gluten-free, hate broccoli, love spicy food, intermittent fasting...",
    optional: true,
  },
];

function SetupStep({ step, value, onChange, onNext, onBack, total, loading }) {
  const q = SETUP_QUESTIONS[step];
  const isLast = step === SETUP_QUESTIONS.length - 1;
  const isValid = q.optional ? true : !!value;

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey && isValid) { e.preventDefault(); onNext(); } };

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-xs text-gray-500 mb-1">{step + 1} / {total}</p>
      <h2 className="text-xl font-bold text-white mb-5">{q.label}</h2>

      {q.options ? (
        <div className="space-y-2.5">
          {q.options.map(opt => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                value === opt
                  ? "bg-green-500/15 border-green-500 text-white"
                  : "bg-[#111] border-white/5 text-gray-400 hover:border-green-500/40"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder={q.placeholder}
          autoFocus
          rows={4}
          className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500 resize-none placeholder-gray-600"
        />
      )}

      {q.optional && q.type === "textarea" && (
        <p className="text-xs text-gray-600 mt-2">Optional — skip if none</p>
      )}

      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          disabled={step === 0}
          className="text-sm text-gray-500 hover:text-white disabled:opacity-30 transition"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid || loading}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isValid && !loading
              ? "bg-green-500 text-white hover:bg-green-400"
              : "bg-[#222] text-gray-600 cursor-not-allowed"
          }`}
        >
          {loading ? "Generating…" : isLast ? "Generate Plan" : "Next →"}
        </button>
      </div>
    </motion.div>
  );
}

function MealChatBar({ onSend, loading }) {
  const [msg, setMsg] = useState("");
  const inputRef = useRef(null);

  const send = () => {
    if (!msg.trim() || loading) return;
    onSend(msg.trim());
    setMsg("");
  };

  return (
    <div
      className="fixed left-0 right-0 z-40 px-4"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2 bg-[#0f0f0f] border border-green-500/25 rounded-2xl px-4 py-2.5 shadow-lg shadow-black/50">
          <Sparkles size={14} className="text-green-500/50 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Change a meal, day, or add restrictions…"
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!msg.trim() || loading}
            className={`p-1.5 rounded-xl transition ${
              msg.trim() && !loading
                ? "text-green-400 hover:bg-green-500/15"
                : "text-gray-700 cursor-not-allowed"
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Meals() {
  const { plans, generatePlan } = useCoach();
  const [mealSetup, setMealSetup]     = useState(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [generating, setGenerating]   = useState(false);
  const [setupStep, setSetupStep]     = useState(0);
  const [setupForm, setSetupForm]     = useState({});
  const [loggedMeals, setLoggedMeals] = useState([]);
  const [showModal, setShowModal]     = useState(false);
  const [prefillMeal, setPrefillMeal] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [view, setView]               = useState("plan");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStatus, setChatStatus]   = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async u => {
      if (!u) { setSetupLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, "users", u.uid, "meal_setup", "info"));
        if (snap.exists()) setMealSetup(snap.data());
        await loadTodayMeals(u);
      } catch (e) {
        console.error("Failed to load meal setup:", e);
      } finally {
        setSetupLoading(false);
      }
    });
    return unsub;
  }, []);

  const loadTodayMeals = async (u) => {
    const q = query(collection(db, "users", u.uid, "meals"), where("date", "==", todayStr()), orderBy("createdAt"));
    try {
      const snap = await getDocs(q);
      setLoggedMeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      const snap2 = await getDocs(collection(db, "users", u.uid, "meals"));
      setLoggedMeals(snap2.docs.map(d => ({ id: d.id, ...d.data() })).filter(m => m.date === todayStr()));
    }
  };

  const handleSetupNext = async () => {
    const isLast = setupStep === SETUP_QUESTIONS.length - 1;
    if (isLast) {
      const fullForm = { ...setupForm };
      setGenerating(true);
      const u = auth.currentUser;
      // Also pull workout profile for better calorie calculation
      let workoutProfile = null;
      try {
        const wSnap = await getDoc(doc(db, "users", u.uid, "profile", "info"));
        if (wSnap.exists()) workoutProfile = wSnap.data();
      } catch {}
      await setDoc(doc(db, "users", u.uid, "meal_setup", "info"), { ...fullForm, createdAt: new Date() });
      setMealSetup(fullForm);
      const context = workoutProfile
        ? `User body stats: ${JSON.stringify(workoutProfile)}. Nutrition preferences: ${JSON.stringify(fullForm)}.`
        : `User nutrition preferences: ${JSON.stringify(fullForm)}.`;
      const plan = await generatePlan(MEAL_PLAN_PROMPT, `${context} Generate a personalized meal plan.`);
      if (plan) await setDoc(doc(db, "users", u.uid, "meal_plan", "current"), { ...plan, createdAt: new Date() });
      setGenerating(false);
      setView("plan");
    } else {
      setSetupStep(s => s + 1);
    }
  };

  const handleAddMeal = async (mealData) => {
    const u = auth.currentUser;
    if (!u) return;
    const entry = {
      ...mealData,
      date: todayStr(),
      dayName: todayDay(),
      createdAt: new Date(),
    };
    const docRef = await addDoc(collection(db, "users", u.uid, "meals"), entry);
    setLoggedMeals(prev => sortMeals([...prev, { id: docRef.id, ...entry }]));
  };

  const handleDeleteMeal = async (id) => {
    const u = auth.currentUser;
    if (!u) return;
    await deleteDoc(doc(db, "users", u.uid, "meals", id));
    setLoggedMeals(prev => prev.filter(m => m.id !== id));
  };

  const handleChatModify = async (message) => {
    if (!plans.meal) return;
    setChatLoading(true);
    setChatStatus(`Updating plan: "${message}"…`);
    const userPrompt = `Current plan: ${JSON.stringify(plans.meal)}. Setup: ${JSON.stringify(mealSetup)}. Today is ${todayDay()}. User request: "${message}". Return the complete updated plan JSON.`;
    const updated = await generatePlan(MEAL_MODIFY_PROMPT, userPrompt);
    if (updated) {
      const u = auth.currentUser;
      await setDoc(doc(db, "users", u.uid, "meal_plan", "current"), { ...updated, createdAt: new Date() });
      setChatStatus("Plan updated!");
      setTimeout(() => setChatStatus(null), 2500);
    } else {
      setChatStatus("Couldn't update — try again.");
      setTimeout(() => setChatStatus(null), 3000);
    }
    setChatLoading(false);
  };

  const handleNewPlan = async () => {
    const u = auth.currentUser;
    if (!u) return;
    await deleteDoc(doc(db, "users", u.uid, "meal_plan", "current"));
    await deleteDoc(doc(db, "users", u.uid, "meal_setup", "info"));
    setMealSetup(null);
    setSetupStep(0);
    setSetupForm({});
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (setupLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Setup / onboarding ───────────────────────────────────────────────────
  if (!mealSetup || view === "setup") return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 pb-24">
      <div className="glow-bg glow-meals" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <p className="text-xs text-gray-500 tracking-widest uppercase">Setup</p>
          <h1 className="text-xl font-bold text-white font-display">Your Nutrition Plan</h1>
        </div>
        <div className="w-full bg-[#1a1a1a] h-1 rounded-full mb-8 overflow-hidden">
          <motion.div
            className="h-1 bg-green-500 rounded-full"
            animate={{ width: `${((setupStep + 1) / SETUP_QUESTIONS.length) * 100}%` }}
          />
        </div>
        <AnimatePresence mode="wait">
          <SetupStep
            key={setupStep}
            step={setupStep}
            total={SETUP_QUESTIONS.length}
            value={setupForm[SETUP_QUESTIONS[setupStep].key] || ""}
            onChange={v => setSetupForm(f => ({ ...f, [SETUP_QUESTIONS[setupStep].key]: v }))}
            onNext={handleSetupNext}
            onBack={() => setSetupStep(s => Math.max(0, s - 1))}
            loading={generating}
          />
        </AnimatePresence>
      </div>
    </div>
  );

  if (generating) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="glow-bg glow-meals" />
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin relative z-10" />
      <p className="text-gray-400 text-sm relative z-10">Generating your meal plan…</p>
    </div>
  );

  const plan = plans.meal;
  const targets = plan?.daily_targets || {};
  const todayPlan = plan?.days?.find(d => d.day === todayDay()) || plan?.days?.[0];

  return (
    <div className="min-h-[100dvh] bg-black px-4 pt-6" style={{ paddingBottom: "calc(7rem + env(safe-area-inset-bottom))" }}>
      <div className="glow-bg glow-meals" />
      <div className="relative z-10 max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-green-400 tracking-widest uppercase font-display">Meals</p>
            <h1 className="text-2xl font-bold text-white">Nutrition</h1>
            {targets.calories && (
              <p className="text-xs text-gray-500 mt-0.5">
                {targets.calories} kcal · {targets.protein}g protein
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewPlan}
              className="text-xs text-gray-500 hover:text-white transition border border-white/10 px-3 py-1.5 rounded-lg"
            >
              New Plan
            </button>
          </div>
        </div>

        {/* Chat status toast */}
        <AnimatePresence>
          {chatStatus && (
            <motion.div
              className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5 flex items-center gap-2"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {chatLoading
                ? <Loader2 size={13} className="text-green-400 animate-spin flex-shrink-0" />
                : <Sparkles size={13} className="text-green-400 flex-shrink-0" />
              }
              <p className="text-xs text-gray-300">{chatStatus}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Macro summary */}
        <MacroSummary meals={loggedMeals} targets={targets} />

        {/* Today's Logged Meals */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Today's Log</h2>
              <p className="text-xs text-gray-600 mt-0.5">{todayDay()}</p>
            </div>
            <button
              onClick={() => { setPrefillMeal(null); setShowModal(true); }}
              className="flex items-center gap-1.5 text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg hover:bg-green-500/25 transition"
            >
              <Plus size={12} /> Log Meal
            </button>
          </div>
          {loggedMeals.length === 0 ? (
            <p className="text-sm text-gray-600 italic">No meals logged yet today.</p>
          ) : (
            <div className="space-y-1.5">
              {sortMeals(loggedMeals).map(m => (
                <div key={m.id} className="flex items-start justify-between bg-[#1a1a1a] rounded-xl px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.mealType && (
                        <span className="text-xs font-semibold text-green-400">{m.mealType}</span>
                      )}
                      {m.name && m.name !== m.mealType && (
                        <span className="text-xs text-gray-400">— {m.name}</span>
                      )}
                      <span className="text-xs text-gray-700">{m.dayName || todayDay()}</span>
                    </div>
                    {m.ingredients && (
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{m.ingredients}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {m.calories > 0 && <span className="text-xs text-gray-300 font-medium">{m.calories} kcal</span>}
                      {m.protein  > 0 && <span className="text-xs text-green-400">{m.protein}g P</span>}
                      {m.carbs    > 0 && <span className="text-xs text-blue-400">{m.carbs}g C</span>}
                      {m.fat      > 0 && <span className="text-xs text-amber-400">{m.fat}g F</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMeal(m.id)} className="ml-3 text-gray-600 hover:text-red-400 transition flex-shrink-0 mt-0.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Suggested Plan */}
        {todayPlan && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-4 mb-4">
            <h2 className="text-sm font-semibold text-white mb-3">Suggested — {todayPlan.day}</h2>
            <div className="space-y-2">
              {todayPlan.meals?.map((meal, i) => (
                <div key={i} className="bg-[#1a1a1a] rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-green-400 font-medium">{meal.time}</span>
                      <span className="text-xs text-gray-500 ml-2">{meal.meal}</span>
                    </div>
                    <button
                      onClick={() => { setPrefillMeal(meal); setShowModal(true); }}
                      className="text-xs text-gray-500 hover:text-green-400 transition"
                    >
                      + Log
                    </button>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{meal.foods?.join(", ")}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-gray-600">{meal.macros?.calories} kcal</span>
                    <span className="text-xs text-green-400/60">{meal.macros?.protein}g P</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Week Plan */}
        {plan?.days && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">Weekly Plan</h2>
            {plan.days.map((day, i) => (
              <div key={i} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3"
                  onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                >
                  <span className={`text-sm font-semibold ${day.day === todayDay() ? "text-green-400" : "text-white"}`}>{day.day}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">
                      {day.meals?.length} meals · {day.meals?.reduce((a, m) => a + (m.macros?.calories || 0), 0)} kcal
                    </span>
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
                      <div className="px-4 pb-3 space-y-2 border-t border-white/5">
                        {day.meals?.map((m, j) => (
                          <div key={j} className="py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-400">{m.time} — {m.meal}</span>
                              <span className="text-xs text-gray-600">{m.macros?.calories} kcal</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-0.5">{m.foods?.join(", ")}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {!plan && (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm mb-3">No meal plan yet.</p>
            <button
              onClick={() => setView("setup")}
              className="text-sm text-green-400 hover:text-green-300 transition"
            >
              Generate Plan →
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <MealLogModal
            onClose={() => { setShowModal(false); setPrefillMeal(null); }}
            onAdd={handleAddMeal}
            prefill={prefillMeal}
          />
        )}
      </AnimatePresence>

      {/* Chat bar — always visible when plan exists */}
      {plan && <MealChatBar onSend={handleChatModify} loading={chatLoading} />}
    </div>
  );
}
