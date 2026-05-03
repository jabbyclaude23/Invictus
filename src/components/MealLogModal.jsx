import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Sparkles } from "lucide-react";
import { useCoach } from "../context/CoachContext";

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
  const [ingredients, setIngredients] = useState((prefill?.foods || []).join(", "));
  const [macros, setMacros]           = useState(prefill?.macros || null);
  const [estimating, setEstimating]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const debounceRef                   = useRef(null);

  // Auto-estimate when ingredients change (debounced 1.2s after typing stops)
  useEffect(() => {
    if (!ingredients.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setEstimating(true);
      const label = mealType || name || "meal";
      const result = await generatePlan(MACRO_PROMPT, `Meal: ${label}. Ingredients: ${ingredients}`);
      if (result?.calories) setMacros(result);
      setEstimating(false);
    }, 1200);
    return () => clearTimeout(debounceRef.current);
  }, [ingredients]);

  const handleSave = async () => {
    if (!mealType && !name.trim()) return;
    setSaving(true);
    const m = macros || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    await onAdd({
      name: name.trim() || mealType,
      mealType,
      ingredients: ingredients.trim(),
      ...m,
    });
    setSaving(false);
    onClose();
  };

  const canSave = (mealType || name.trim()) && !saving;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-[#111] border border-white/5 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm text-white shadow-xl"
          style={{ paddingBottom: "max(24px, calc(24px + env(safe-area-inset-bottom)))" }}
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-green-400">Log Meal</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            {/* Meal type */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Meal type</label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(t => (
                  <button
                    key={t}
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
                Name <span className="text-gray-700">(optional)</span>
              </label>
              <input
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
                      <p className="text-xs text-gray-600 mt-0.5">{l}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-white/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 disabled:opacity-40 transition"
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
