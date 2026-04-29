import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { collection, doc, onSnapshot, query, orderBy, limit } from "firebase/firestore";

const CoachContext = createContext(null);
export const useCoach = () => useContext(CoachContext);

const sumStats = stats => {
  const out = {};
  for (const s of stats) {
    const k = (s.name || "").toLowerCase();
    if (!k) continue;
    if (!out[k] || (s.updatedAt?.seconds || 0) > (out[k]?.t || 0)) out[k] = { v: s.value, t: s.updatedAt?.seconds || 0 };
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.v]));
};
const sumHabits  = a => a.map(h => ({ name: h.name, target: h.target ?? null, progress: h.progress ?? 0 }));
const sumWorkouts= a => [...a].sort((x,y)=>(y?.date?.seconds||0)-(x?.date?.seconds||0)).slice(0,10).map(w=>({ date: w.date?.toDate?.()?.toISOString?.()?.slice(0,10)??null, type: w.type??"workout", durationMin: w.durationMin??null }));
const sumMeals   = a => [...a].sort((x,y)=>(y?.date?.seconds||0)-(x?.date?.seconds||0)).slice(0,6).map(m=>({ date: m.date?.toDate?.()?.toISOString?.()?.slice(0,10)??null, name: m.name??"meal", calories: m.calories??null, protein: m.protein??null }));
const sumTrading = a => [...a].sort((x,y)=>(y?.time?.seconds||0)-(x?.time?.seconds||0)).slice(0,8).map(t=>({ symbol: t.symbol??"N/A", side: t.side??null, pnl: t.pnl??null }));

export function CoachProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [raw, setRaw]     = useState({ stats:[], habits:[], workouts:[], meals:[], trading:[] });
  const [plans, setPlans] = useState({ workout: null, meal: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u || null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubs = [];
    const col = (name, setter) => {
      const q = query(collection(db, "users", user.uid, name), orderBy("createdAt","desc"), limit(200));
      unsubs.push(onSnapshot(q, snap => setter(snap.docs.map(d => ({ id: d.id, ...d.data() })))));
    };
    col("stats",    v => setRaw(p => ({ ...p, stats: v })));
    col("habits",   v => setRaw(p => ({ ...p, habits: v })));
    col("workouts", v => setRaw(p => ({ ...p, workouts: v })));
    col("meals",    v => setRaw(p => ({ ...p, meals: v })));
    col("trading",  v => setRaw(p => ({ ...p, trading: v })));

    // single-doc plan subscriptions
    const wpRef = doc(db, "users", user.uid, "workout_plan", "current");
    const mpRef = doc(db, "users", user.uid, "meal_plan", "current");
    unsubs.push(onSnapshot(wpRef, snap => setPlans(p => ({ ...p, workout: snap.exists() ? snap.data() : null }))));
    unsubs.push(onSnapshot(mpRef, snap => setPlans(p => ({ ...p, meal:    snap.exists() ? snap.data() : null }))));

    setReady(true);
    return () => unsubs.forEach(u => u());
  }, [user]);

  const coachContext = useMemo(() => ({
    stats: sumStats(raw.stats),
    habits: sumHabits(raw.habits),
    workouts: sumWorkouts(raw.workouts),
    meals: sumMeals(raw.meals),
    trading: sumTrading(raw.trading),
    workoutPlan: plans.workout,
    mealPlan: plans.meal,
  }), [raw, plans]);

  const askCoach = async ({ messages, topic = "general" }) => {
    const payload = Array.isArray(messages) ? messages : [{ role: "user", content: String(messages || "") }];
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: payload, context: coachContext, topic, userName: auth.currentUser?.displayName || "Champion" }),
    });
    const text = await res.text();
    try { return JSON.parse(text).reply || "Coach error."; } catch { return "Coach error."; }
  };

  // JSON plan generation helper
  const generatePlan = async (systemPrompt, userPrompt) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: userPrompt }],
        context: coachContext,
        topic: "plan_generation",
        userName: auth.currentUser?.displayName || "Champion",
        responseFormat: "json",
        systemOverride: systemPrompt,
      }),
    });
    const text = await res.text();
    try { return JSON.parse(JSON.parse(text).reply); } catch { return null; }
  };

  return (
    <CoachContext.Provider value={{ user, ready, context: coachContext, plans, askCoach, generatePlan }}>
      {children}
    </CoachContext.Provider>
  );
}
