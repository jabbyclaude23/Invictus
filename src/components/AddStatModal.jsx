import { legacyHabitDayKey } from '../lib/dashboard';
import useDialog from '../hooks/useDialog';
import React, { useState } from "react";
import { motion } from "framer-motion";
import { doc, writeBatch, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { iconMap } from "../data/iconMap.jsx";

export default function AddStatModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState(Object.keys(iconMap)[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useDialog(loading ? null : onClose);

  const handleAdd = async () => {
    if (loading) return;
    if (!name.trim()) { setError("Please enter a name."); return; }
    if (String(value).trim() === "" || !Number.isFinite(Number(value))) { setError("Enter a valid value."); return; }
    setError("");
    setLoading(true);
    const user = auth.currentUser;
    if (!user) { setError("Please sign in again."); setLoading(false); return; }

    try {
      const docRef = doc(collection(db, "users", user.uid, "stats"));
      const batch = writeBatch(db);
      batch.set(docRef, {
        name: name.trim(),
        value: parseFloat(value),
        icon: selectedIcon,
        createdAt: new Date(),
      });
      const key = legacyHabitDayKey();
      batch.set(doc(db, "users", user.uid, "stats", docRef.id, "history", key), { date: key, value: Number(value) });
      await batch.commit();

      onAdd({
        id: docRef.id,
        name: name.trim(),
        value: parseFloat(value),
        icon: selectedIcon,
      });

      onClose();
    } catch {
      setError("Your stat could not be saved. Please try again.");
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
        ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="stat-dialog-title"
        className="bg-[#111] border border-[#222] rounded-2xl p-6 w-[90%] max-w-md overflow-y-auto text-white shadow-xl shadow-black/50"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 id="stat-dialog-title" className="text-xl font-semibold text-yellow-400">Add New Stat</h2>
          <button
            aria-label="Close stat dialog" disabled={loading} onClick={onClose}
            className="text-gray-400 hover:text-yellow-400 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {error && <p role="alert" className="status-error">{error}</p>}
          {/* Inputs */}
        <div className="space-y-4">
          {/* Stat Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stat Name</label>
            <input
              aria-label="Stat name" value={name}
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
              aria-label="Value" value={value}
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
              disabled={loading} onClick={onClose}
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
