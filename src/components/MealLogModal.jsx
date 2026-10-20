import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useCoach } from "../context/useCoach";
import useDialog from "../hooks/useDialog";

const MACRO_KEYS = ["calories", "protein", "carbs", "fat"];
function normalizedMacros(value) {
  if (!value || !MACRO_KEYS.every(key => value[key] !== null && value[key] !== "" && Number.isFinite(Number(value[key])) && Number(value[key]) >= 0)) return null;
  return Object.fromEntries(MACRO_KEYS.map(key => [key, Math.round(Number(value[key]))]));
}

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-workout", "Post-workout"];

const MACRO_PROMPT = `You are a nutrition expert. Estimate the macros for the meal described. Return ONLY valid JSON, no text before or after.

JSON format:
{"calories": number, "protein": number, "carbs": number, "fat": number}

Be realistic. Use standard food composition databases as reference. Round to nearest whole number.`;

export default function MealLogModal({ onClose, onAdd, prefill = null }) {
  const { generatePlan } = useCoach();

  // Derive meal type from prefill (plan suggestion has a "meal" field like "Breakfast")
  const inferredType = MEAL_TYPES.find(t => t.toLowerCase() === (prefill?.meal || "").toLowerCase()) || null;

  const [mealType, setMealType]       = useState(inferredType || "");
  const [name, setName]               = useState("");
  const [suggestedMeal] = useState(() => ({
    ingredients: (prefill?.foods || []).join(", "),
    macros: normalizedMacros(prefill?.macros),
  }));
  const [ingredients, setIngredients] = useState(suggestedMeal.ingredients);
  const [macros, setMacros]           = useState(suggestedMeal.macros);
  const [estimating, setEstimating]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const debounceRef                   = useRef(null);
  const [error, setError] = useState("");
  const [estimateError, setEstimateError] = useState("");
  const [estimateAttempt, setEstimateAttempt] = useState(0);
  const estimationContext = useRef({ generatePlan, label: mealType || name || "meal" });
  useEffect(() => {
    estimationContext.current = { generatePlan, label: mealType || name || "meal" };
  }, [generatePlan, mealType, name]);
  const close = () => { if (!saving) onClose(); };
  const dialogRef = useDialog(saving ? null : onClose);

  // Ignore stale estimates when the ingredients change or the dialog closes.
  useEffect(() => {
    let current = true;
    clearTimeout(debounceRef.current);
    setEstimateError("");
    // The plan already knows this meal's nutrition; only edited ingredients need AI.
    if (suggestedMeal.macros && ingredients === suggestedMeal.ingredients) {
      setMacros(suggestedMeal.macros);
      setEstimating(false);
      return;
    }
    if (!ingredients.trim()) { setMacros(null); setEstimating(false); return; }
    setEstimating(true);
    setMacros(null);
    setError("");
    debounceRef.current = setTimeout(async () => {
      try {
        const { generatePlan: estimate, label } = estimationContext.current;
        const result = await estimate(MACRO_PROMPT, `Meal: ${label}. Ingredients: ${ingredients}`);
        if (!current) return;
        const nutrition = normalizedMacros(result);
        if (!nutrition) {
          throw new Error("Nutrition estimate unavailable. Please try describing the portions again.");
        }
        setMacros(nutrition);
      } catch (err) {
        if (current) { setMacros(null); setEstimateError(err?.message || "Could not estimate nutrition. Please try again."); }
      } finally {
        if (current) setEstimating(false);
      }
    }, 1200);
    return () => { current = false; clearTimeout(debounceRef.current); };
  }, [ingredients, estimateAttempt, suggestedMeal]);

  const handleSave = async () => {
    if (saving || estimating) return;
    if (ingredients.trim() && !macros) { setError("Estimate the nutrition successfully before saving this meal."); return; }
    if (!mealType && !name.trim()) { setError("Choose a meal type or add a name."); return; }
    setError("");
    setSaving(true);
    const m = macros || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    try {
      await onAdd({
        name: name.trim() || mealType,
        mealType,
        ingredients: ingredients.trim(),
        ...m,
      });
      onClose();
    } catch (err) {
      setError(err?.message || "Your meal could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = (mealType || name.trim()) && !saving && !estimating && (!ingredients.trim() || !!macros);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="meal-modal-title"
          className="bg-[#111] border border-white/5 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md text-white shadow-xl max-h-[92dvh] overflow-y-auto"
          style={{ paddingBottom: "max(24px, calc(24px + env(safe-area-inset-bottom)))" }}
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-5">
            <h2 id="meal-modal-title" className="text-xl font-semibold text-white">Log Meal</h2>
            <button disabled={saving} aria-label="Close meal dialog" onClick={close} className="icon-button"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            {error && <p role="alert" className="text-sm text-red-300 rounded-xl border border-red-400/20 bg-red-400/10 p-3">{error}</p>}
            {estimateError && <div role="alert" className="text-sm text-red-300 rounded-xl border border-red-400/20 bg-red-400/10 p-3"><p>{estimateError}</p><button type="button" className="button-secondary mt-3" onClick={() => setEstimateAttempt(attempt => attempt + 1)}>Retry nutrition estimate</button></div>}
            {/* Meal type */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Meal type</label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(t => (
                  <button
                    key={t}
                    aria-pressed={mealType === t}
                    onClick={() => setMealType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      mealType === t
                        ? "bg-green-500/20 border-green-500 text-green-400"
                        : "bg-[#1a1a1a] border-white/5 text-gray-500 hover:border-green-500/30"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional custom name */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Name <span className="text-gray-500">(optional)</span>
              </label>
              <input
                aria-label="Meal name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={mealType ? `e.g. ${mealType === "Breakfast" ? "Breakfast sandwich" : mealType === "Lunch" ? "Chicken wrap" : "Grilled salmon"}` : "e.g. Chicken wrap"}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50"
              />
            </div>

            {/* Ingredients */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                What did you eat?
              </label>
              <textarea
                aria-label="Meal ingredients and portions"
                rows={3}
                value={ingredients}
                onChange={e => setIngredients(e.target.value)}
                placeholder="e.g. 3 eggs, 2 slices sourdough toast, avocado, orange juice"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50 resize-none"
              />
              <div className="flex items-center gap-1.5 mt-1.5 h-4">
                {estimating && (
                  <motion.div
                    className="flex items-center gap-1.5 text-xs text-green-400/70"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  >
                    <Loader2 size={11} className="animate-spin" />
                    Calculating macros…
                  </motion.div>
                )}
              </div>
            </div>

            {/* Macro display */}
            <AnimatePresence>
              {macros && (
                <motion.div
                  className="grid grid-cols-4 gap-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {[
                    ["Kcal",    macros.calories,        "text-white"],
                    ["Protein", `${macros.protein}g`,   "text-green-400"],
                    ["Carbs",   `${macros.carbs}g`,     "text-blue-400"],
                    ["Fat",     `${macros.fat}g`,       "text-amber-400"],
                  ].map(([l, v, c]) => (
                    <div key={l} className="bg-[#1a1a1a] rounded-xl p-2 text-center">
                      <p className={`text-sm font-bold ${c}`}>{v}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{l}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 pt-1">
              <button
                onClick={close}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="button-primary flex-1 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Log Meal"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
