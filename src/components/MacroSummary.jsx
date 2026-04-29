import React from "react";
import { motion } from "framer-motion";

const Bar = ({ label, value, goal, color }) => {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  const over = value > goal;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-semibold ${over ? "text-amber-400" : "text-gray-300"}`}>
          {Math.round(value)}<span className="text-gray-600">/{goal}g</span>
        </span>
      </div>
      <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full overflow-hidden">
        <motion.div
          className="h-1.5 rounded-full"
          style={{ backgroundColor: over ? "#f59e0b" : color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
};

export default function MacroSummary({ meals = [], targets = {} }) {
  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein:  acc.protein  + (m.protein  || 0),
    carbs:    acc.carbs    + (m.carbs    || 0),
    fat:      acc.fat      + (m.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const calPct = targets.calories ? Math.min(100, (totals.calories / targets.calories) * 100) : 0;
  const calColor = calPct < 60 ? "#ef4444" : calPct > 110 ? "#f59e0b" : "#22c55e";

  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-green-400">Today's Macros</h2>
        <span className="text-xs text-gray-600">{Math.round(totals.calories)} / {targets.calories || "—"} kcal</span>
      </div>

      {/* Calorie ring-style bar */}
      <div className="w-full bg-[#1a1a1a] h-2 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-2 rounded-full"
          style={{ backgroundColor: calColor }}
          animate={{ width: `${calPct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Bar label="Protein"  value={totals.protein} goal={targets.protein || 0} color="#22c55e" />
        <Bar label="Carbs"    value={totals.carbs}   goal={targets.carbs   || 0} color="#3b82f6" />
        <Bar label="Fat"      value={totals.fat}      goal={targets.fat     || 0} color="#f59e0b" />
      </div>
    </div>
  );
}
