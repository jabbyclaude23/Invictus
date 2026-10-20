import React from "react";
import { motion } from "framer-motion";

const Bar = ({ label, value, goal, color }) => {
  const pct = goal > 0 ? Math.min(100, Math.max(0, (value / goal) * 100)) : 0;
  const over = goal > 0 && value > goal;
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-semibold ${over ? "text-amber-400" : "text-gray-300"}`}>
          {Math.round(value)}<span className="text-gray-400"> / {goal || "—"}g</span>
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
    calories: acc.calories + (Number(m.calories) || 0),
    protein:  acc.protein  + (Number(m.protein) || 0),
    carbs:    acc.carbs    + (Number(m.carbs) || 0),
    fat:      acc.fat      + (Number(m.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const calRatio = targets.calories ? (totals.calories / targets.calories) * 100 : 0;
  const calPct = Math.min(100, Math.max(0, calRatio));
  const calColor = calRatio > 110 ? "#c9a968" : "#82b69b";

  return (
    <div className="panel p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Today's Macros</h2>
        <span className="text-xs text-gray-400">{Math.round(totals.calories)} / {targets.calories || "—"} kcal</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Bar label="Protein"  value={totals.protein} goal={targets.protein || 0} color="#82b69b" />
        <Bar label="Carbs"    value={totals.carbs}   goal={targets.carbs   || 0} color="#8badd3" />
        <Bar label="Fat"      value={totals.fat}      goal={targets.fat     || 0} color="#c9a968" />
      </div>
    </div>
  );
}
