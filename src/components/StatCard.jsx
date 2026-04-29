import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StatDetailModal from "./StatDetailModal";
import { getIcon } from "../data/iconMap.jsx"; // ✅ shared icon logic
import { BarChart3, Trash2 } from "lucide-react"; // ✅ essential icon imports

export default function StatCard({ stat, onUpdate, onDelete }) {
  const [value, setValue] = useState(stat.value || 0);
  const [editing, setEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleIncrement = (e) => {
    e.stopPropagation();
    const newVal = value + 1;
    setValue(newVal);
    onUpdate(stat.id, newVal);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    const newVal = value - 1;
    setValue(newVal);
    onUpdate(stat.id, newVal);
  };

  const handleSaveEdit = () => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) onUpdate(stat.id, parsed);
    setEditing(false);
  };

  return (
    <>
      <motion.div
        className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-3 sm:p-4 shadow-md shadow-black/40 transition-all relative w-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          {/* Icon + Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#333]">
              {getIcon(stat)} {/* ✅ emoji or fallback icon */}
            </div>
            <h3 className="text-yellow-400 font-semibold text-lg">
              {stat.name}
            </h3>
          </div>

          {/* Chart + Delete buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="p-1 text-gray-400 hover:text-yellow-400 transition"
              title="View history"
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(stat.id);
              }}
              className="p-1 text-gray-500 hover:text-red-400 transition"
              title="Delete stat"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Value and Controls */}
        <div className="flex items-center justify-between">
          {editing ? (
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
              className="w-20 bg-[#1a1a1a] border border-yellow-400 rounded-md px-2 py-1 text-yellow-400 text-center text-sm focus:outline-none"
              autoFocus
            />
          ) : (
            <h2
              onClick={() => setEditing(true)}
              className="text-2xl font-bold text-yellow-400 cursor-pointer hover:text-yellow-300 transition"
            >
              {value}
            </h2>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleDecrement}
              className="border border-yellow-400 text-yellow-400 px-3 py-1 rounded-lg text-sm font-semibold hover:bg-yellow-400 hover:text-black transition"
            >
              –
            </button>
            <button
              onClick={handleIncrement}
              className="bg-yellow-400 text-black px-3 py-1 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition"
            >
              +
            </button>
          </div>
        </div>
      </motion.div>

      {/* History Modal */}
      <AnimatePresence>
        {showModal && (
          <StatDetailModal
            stat={stat}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
