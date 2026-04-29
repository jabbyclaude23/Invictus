import OpenAI from "openai";

export const config = { runtime: "nodejs" };

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const safeJSON = (val, fallback = {}) => {
  try { return typeof val === "string" ? JSON.parse(val) : (val && typeof val === "object" ? val : fallback); }
  catch { return fallback; }
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const trimMsgs = (msgs, max = 24) =>
  Array.isArray(msgs) ? msgs.slice(-clamp(max, 4, 64)).map(m => ({
    role: m?.role === "assistant" ? "assistant" : "user",
    content: String(m?.content ?? ""),
  })) : [];

const sumStats = s => {
  const m = {};
  if (Array.isArray(s)) for (const x of s) { const k = (x?.name || "").toLowerCase(); if (k) m[k] = x?.value ?? null; }
  else if (s && typeof s === "object") Object.assign(m, s);
  return Object.fromEntries(Object.entries(m).slice(0, 12));
};
const arr = (a, lim, fn) => Array.isArray(a) ? a.slice(0, lim).map(fn) : [];
const sumHabits  = a => arr(a, 12, h => ({ name: h?.name, target: h?.target ?? null, progress: h?.progress ?? 0 }));
const sumWorkouts= a => arr(a, 8,  w => ({ date: w?.date ?? null, type: w?.type ?? "workout", durationMin: w?.durationMin ?? null }));
const sumMeals   = a => arr(a, 6,  m => ({ date: m?.date ?? null, name: m?.name ?? "meal", calories: m?.calories ?? null, protein: m?.protein ?? null }));
const sumTrading = a => arr(a, 8,  t => ({ symbol: t?.symbol ?? "N/A", side: t?.side ?? null, pnl: t?.pnl ?? null }));
const sumPlan    = p => p ? { program: p.program_name, weeks: p.timeline_weeks, days: p.days_per_week } : null;
const sumMealPlan= p => p ? { calories: p.daily_targets?.calories, protein: p.daily_targets?.protein } : null;

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

const COACH_PROMPT = `You are Coach Invictus — an elite performance mentor for trading, fitness, and nutrition.

Voice: Direct, calm, motivational. No fluff. Short paragraphs or tight bullet points. End with one clear next step.

Context: Anchor all advice to the user's live data. Reference numbers, trends, and streaks directly.

Trading: Enforce trend + pullback into EMA with structure. EMAs: 13/48/200. Require defined entry, invalidation, target before discussing setups. Emphasize discipline and journaling over PnL.

Fitness: Progressive overload, recovery first. Give trackable prescription: sets × reps × load, rest, RIR, one progression rule.

Nutrition: 2–4 meals, high protein, easy prep. Reinforce fasting and hydration if tracked. Give grocery list or rotation if adherence is low.

Habits: Celebrate streaks briefly. Suggest 1–2 improvements max. If <70% completion, shrink scope; if >85%, progress it.`;

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ reply: "Server missing OPENAI_API_KEY." });

  try {
    const body = safeJSON(req.body, {});
    const { messages = [], context = {}, topic = "general", userName = "Jabran", responseFormat, systemOverride } = body;

    const compact = {
      stats: sumStats(context.stats),
      habits: sumHabits(context.habits),
      workouts: sumWorkouts(context.workouts),
      meals: sumMeals(context.meals),
      trading: sumTrading(context.trading),
      workoutPlan: sumPlan(context.workoutPlan),
      mealPlan: sumMealPlan(context.mealPlan),
    };

    const useJson = responseFormat === "json";
    const sysContent = systemOverride || COACH_PROMPT;

    const chatMessages = [
      { role: "system", content: sysContent },
      { role: "system", content: `USER: ${userName}\nTOPIC: ${topic}\nCONTEXT: ${JSON.stringify(compact)}` },
      ...trimMsgs(messages, 24),
    ];

    const params = { model: MODEL, temperature: useJson ? 0.3 : 0.5, messages: chatMessages };
    if (useJson) params.response_format = { type: "json_object" };

    const chat = await client.chat.completions.create(params);
    const reply = chat?.choices?.[0]?.message?.content?.trim() || (useJson ? "{}" : "I'm here — how can I help?");

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("api/chat error:", err?.message || err);
    return res.status(500).json({ reply: "Coach encountered an error — try again." });
  }
}
