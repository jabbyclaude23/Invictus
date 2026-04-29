import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { useCoach } from "../context/CoachContext";

const MACRO_PROMPT = `You are a nutrition expert. Estimate the macros for the meal described. Return ONLY valid JSON, no text before or after.

JSON format:
{"calories": number, "protein": number, "carbs": number, "fat": number}

Be realistic. Use standard food composition databases as reference. Round to nearest whole number.`;

export default function MealLogModal({ onClose, onAdd, prefill = null }) {
  const { generatePlan } = useCoach();
  const [name, setName]           = useState(prefill?.meal || "");
  const [ingredients, setIngredients] = useState((prefill?.foods || []).join(", "));
  const [macros, setMacros]       = useState(prefill?.macros || null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving]       = useState(false);

  const estimate = async () => {
    if (!ingredients.trim()) return;
    setEstimating(true);
    const result = await generatePlan(MACRO_PROMPT, `Meal: ${name || "Unknown"}. Ingredients: ${ingredients}`);
    if (result && result.calories) setMacros(result);
    setEstimating(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const m = macros || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    await onAdd({ name: name.trim(), ingredients: ingredients.trim(), ...m });
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-[#111] border border-white/5 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm text-white shadow-xl"
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-semibold text-green-400">Log Meal</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Meal name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Breakfast, Post-workout"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Ingredients / description</label>
              <textarea
                rows={3}
                value={ingredients}
                onChange={e => setIngredients(e.target.value)}
                placeholder="e.g. 3 eggs, 2 slices toast, 1 banana, 200ml milk"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-green-500/50 resize-none"
              />
              <button
                onClick={estimate}
                disabled={estimating || !ingredients.trim()}
                className="mt-2 flex items-center gap-2 text-xs text-green-400 hover:text-green-300 disabled:opacity-40 transition"
              >
                {estimating ? <Loader2 size={12} className="animate-spin" /> : "✦"}
                {estimating ? "Estimating macros…" : "Estimate macros with AI"}
              </button>
            </div>

            {macros && (
              <motion.div
                className="grid grid-cols-4 gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {[["Kcal", macros.calories,"text-white"], ["Protein", `${macros.protein}g`,"text-green-400"], ["Carbs", `${macros.carbs}g`,"text-blue-400"], ["Fat", `${macros.fat}g`,"text-amber-400"]].map(([l, v, c]) => (
                  <div key={l} className="bg-[#1a1a1a] rounded-xl p-2 text-center">
                    <p className={`text-sm font-bold ${c}`}>{v}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{l}</p>
                  </div>
                ))}
              </motion.div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-white/10 hover:border-white/20 transition">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
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
