import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HabitDetailModal from "./HabitDetailModal";
import { iconMap, getIcon } from "../data/iconMap.jsx"; // ✅ centralized map
import { BarChart3, Trash2 } from "lucide-react"; // ✅ ensure icons render

export default function HabitCard({ habit, onUpdate, onDelete, onEdit }) {
  const [showModal, setShowModal] = useState(false);

  const handleIncrement = (e) => {
    e.stopPropagation();
    const newProgress = habit.progress + 1;
    onUpdate(habit.id, newProgress);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    const newProgress = Math.max(0, habit.progress - 1);
    onUpdate(habit.id, newProgress);
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 cursor-default relative shadow-lg shadow-black/30 select-none"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          {/* 🟡 Tap icon or name to edit */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(habit);
            }}
            title="Edit habit"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#333]">
              {getIcon(habit)} {/* ✅ handles emoji or fallback icon */}
            </div>
            <div>
              <h3 className="text-yellow-400 font-semibold text-lg leading-tight">
                {habit.name}
              </h3>
              {habit.description && (
                <p className="text-gray-400 text-xs mt-0.5">
                  {habit.description}
                </p>
              )}
            </div>
          </div>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(habit.id);
            }}
            className="text-gray-500 hover:text-red-400 transition"
            title="Delete habit"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Progress Controls */}
        <div className="flex items-center justify-between mb-2">
          {habit.target ? (
            // 🟡 Target-based habit
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDecrement}
                className="border border-yellow-400 text-yellow-400 rounded-md px-2 py-1 text-sm font-semibold hover:bg-yellow-400 hover:text-black transition"
              >
                –
              </button>
              <span className="text-sm text-gray-300 font-medium">
                {habit.progress} / {habit.target}
              </span>
              <button
                onClick={handleIncrement}
                className="bg-yellow-400 text-black rounded-md px-2 py-1 text-sm font-semibold hover:bg-yellow-300 transition"
              >
                +
              </button>
            </div>
          ) : (
            // ✅ Single-action habit
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newProgress = habit.progress === 1 ? 0 : 1;
                onUpdate(habit.id, newProgress);
              }}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition ${
                habit.progress === 1
                  ? "bg-green-500 text-black"
                  : "bg-yellow-400 text-black hover:bg-yellow-300"
              }`}
            >
              {habit.progress === 1 ? "Completed" : "Mark Completed"}
            </button>
          )}

          {/* 📊 Stats modal button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowModal(true);
            }}
            className="text-gray-400 hover:text-yellow-400 transition"
            title="View stats"
          >
            <BarChart3 size={16} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full bg-[#222] h-2 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: habit.target
                ? `${Math.min((habit.progress / habit.target) * 100, 100)}%`
                : habit.progress > 0
                ? "100%"
                : "0%",
            }}
            transition={{ duration: 0.4 }}
            className={`h-2 ${
              habit.target && habit.progress >= habit.target
                ? "bg-green-400"
                : "bg-gradient-to-r from-yellow-400 to-yellow-300"
            }`}
          />
        </div>
      </motion.div>

      {/* Stats Modal */}
      <AnimatePresence>
        {showModal && (
          <HabitDetailModal
            habit={habit}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
