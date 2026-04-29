import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, doc, updateDoc, collection } from "firebase/firestore";
import { db, auth } from "../firebase";
import { iconMap } from "../data/iconMap.jsx";
import EmojiPicker from "emoji-picker-react";

export default function AddHabitModal({ habitToEdit = null, onClose, onAdd, onUpdate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(Object.keys(iconMap)[0]);
  const [customEmoji, setCustomEmoji] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!habitToEdit;

  // Prefill form when editing
  useEffect(() => {
    if (isEditing) {
      setName(habitToEdit.name || "");
      setDescription(habitToEdit.description || "");
      setTarget(habitToEdit.target || "");
      setSelectedIcon(habitToEdit.icon || Object.keys(iconMap)[0]);
      setCustomEmoji(habitToEdit.emoji || "");
    }
  }, [habitToEdit]);

  // 🔹 Add or Update Habit
  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const user = auth.currentUser;

    const habitData = {
      name: name.trim(),
      description: description.trim(),
      icon: selectedIcon,
      target: target ? parseFloat(target) : null,
      updatedAt: new Date(),
      ...(customEmoji && selectedIcon === "custom" ? { emoji: customEmoji } : {}),
    };

    try {
      if (isEditing) {
        // 🔸 Update existing habit
        const habitRef = doc(db, "users", user.uid, "habits", habitToEdit.id);
        await updateDoc(habitRef, habitData);
        if (onUpdate) onUpdate({ id: habitToEdit.id, ...habitToEdit, ...habitData });
      } else {
        // 🔹 Add new habit
        const docRef = await addDoc(collection(db, "users", user.uid, "habits"), {
          ...habitData,
          createdAt: new Date(),
          progress: 0,
        });
        if (onAdd) onAdd({ id: docRef.id, ...habitData, progress: 0 });
      }

      onClose();
    } catch (e) {
      console.error("Error saving habit:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-[#111] border border-[#222] rounded-2xl p-6 w-[90%] max-w-sm text-white shadow-xl shadow-black/50"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-yellow-400">
              {isEditing ? "Edit Habit" : "Add New Habit"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-yellow-400 text-lg font-bold"
            >
              ✕
            </button>
          </div>

          {/* Form Inputs */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Habit Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                placeholder="e.g. Workout, Drink Water"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Description (optional)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                placeholder="e.g. 8 cups, 30 min workout"
              />
            </div>

            {/* Target */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Daily Target (optional)
              </label>
              <input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 8 cups"
                className="w-full bg-[#222] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank for single-action habits (like Workout or Prayer).
              </p>
            </div>

            {/* Icon Selector */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Icon</label>
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide relative">
                {Object.entries(iconMap)
                  .filter(([key]) => key !== "chart" && key !== "delete")
                  .map(([key, icon]) => (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.preventDefault();
                        if (key === "custom") {
                          setShowEmojiPicker(!showEmojiPicker);
                          setSelectedIcon("custom");
                        } else {
                          setSelectedIcon(key);
                          setCustomEmoji("");
                          setShowEmojiPicker(false);
                        }
                      }}
                      className={`flex items-center justify-center w-10 h-10 rounded-lg border flex-shrink-0 ${
                        selectedIcon === key
                          ? "border-yellow-400 bg-yellow-400/20"
                          : "border-[#333] bg-[#1a1a1a]"
                      } hover:border-yellow-400 transition-all`}
                      title={key}
                    >
                      {key === "custom" && customEmoji ? (
                        <span className="text-lg">{customEmoji}</span>
                      ) : (
                        icon
                      )}
                    </button>
                  ))}

                {showEmojiPicker && (
                  <div className="absolute top-12 left-0 z-50 bg-[#111] border border-[#333] rounded-xl shadow-lg p-2">
                    <EmojiPicker
                      theme="dark"
                      onEmojiClick={(emojiData) => {
                        setCustomEmoji(emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
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
                onClick={handleSave}
                disabled={loading}
                className="bg-yellow-400 text-black px-4 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {loading
                  ? isEditing
                    ? "Saving..."
                    : "Adding..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Habit"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

