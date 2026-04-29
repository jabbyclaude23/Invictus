import React, { useState } from "react";
import { motion } from "framer-motion";
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { iconMap } from "../data/iconMap.jsx";

export default function AddStatModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState(Object.keys(iconMap)[0]);
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const user = auth.currentUser;

    try {
      const docRef = await addDoc(collection(db, "users", user.uid, "stats"), {
        name: name.trim(),
        value: parseFloat(value),
        icon: selectedIcon,
        createdAt: new Date(),
      });

      onAdd({
        id: docRef.id,
        name: name.trim(),
        value: parseFloat(value),
        icon: selectedIcon,
      });

      onClose();
    } catch (e) {
      console.error("Error adding stat:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-[#111] border border-[#222] rounded-2xl p-6 w-[90%] max-w-sm text-white shadow-xl shadow-black/50"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-yellow-400">Add New Stat</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-yellow-400 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* Stat Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stat Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              placeholder="e.g. Weight, Profit, Steps"
            />
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Value</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              placeholder="e.g. 180"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Icon</label>
            <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1">
              {Object.entries(iconMap)
                .filter(([key]) => key !== "chart" && key !== "delete") // exclude utility icons
                .map(([key, icon]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedIcon(key)}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg border flex-shrink-0 ${
                      selectedIcon === key
                        ? "border-yellow-400 bg-yellow-400/20"
                        : "border-[#333] bg-[#1a1a1a]"
                    } hover:border-yellow-400 transition-all`}
                    title={key}
                  >
                    {icon}
                  </button>
                ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-yellow-400"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Stat"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
