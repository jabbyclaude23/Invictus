import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Check } from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import confetti from "canvas-confetti";

export default function GoalTracker() {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState("");
  const [target, setTarget] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [tempProgress, setTempProgress] = useState("");

  const fireConfetti = () => {
    confetti({
      particleCount: 40,
      spread: 70,
      startVelocity: 25,
      gravity: 1.1,
      colors: ["#facc15", "#fef08a", "#eab308"],
      ticks: 70,
      origin: { y: 0.8 },
    });
  };

  useEffect(() => {
    const fetchGoals = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, "users", user.uid, "goals"),
        orderBy("createdAt")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGoals(data);
    };
    fetchGoals();
  }, []);

  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user || !newGoal.trim() || !target) return;

    const newItem = {
      name: newGoal.trim(),
      progress: 0,
      target: parseFloat(target),
      createdAt: new Date(),
    };

    const docRef = await addDoc(
      collection(db, "users", user.uid, "goals"),
      newItem
    );
    setGoals([...goals, { id: docRef.id, ...newItem }]);
    setNewGoal("");
    setTarget("");
  };

  const handleProgressChange = async (goal, delta) => {
    const user = auth.currentUser;
    if (!user) return;

    const newProgress = Math.max(0, Math.min(goal.progress + delta, goal.target));
    await updateDoc(doc(db, "users", user.uid, "goals", goal.id), {
      progress: newProgress,
    });
    setGoals(
      goals.map((g) =>
        g.id === goal.id ? { ...g, progress: newProgress } : g
      )
    );

    if (newProgress === goal.target) fireConfetti();
  };

  const handleDelete = async (id) => {
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, "users", user.uid, "goals", id));
    setGoals(goals.filter((g) => g.id !== id));
  };

  const handleEditStart = (goal) => {
    setEditingId(goal.id);
    setTempProgress(goal.progress);
  };

  const handleSaveEdit = async (goal) => {
    const user = auth.currentUser;
    if (!user) return;

    const newVal = parseFloat(tempProgress) || 0;
    await updateDoc(doc(db, "users", user.uid, "goals", goal.id), {
      progress: newVal,
    });

    setGoals(
      goals.map((g) =>
        g.id === goal.id ? { ...g, progress: newVal } : g
      )
    );
    setEditingId(null);

    if (newVal >= goal.target) fireConfetti();
  };

  return (
    <motion.div
      className="bg-[#111] border border-[#222] rounded-2xl p-4 shadow-lg shadow-black/40 mb-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-lg font-semibold text-yellow-400 mb-4">
        Mini Goals
      </h2>

      {goals.length === 0 ? (
        <p className="text-gray-500 italic text-sm mb-3">
          No goals yet — add one below.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {goals.map((goal) => {
            const percent = Math.min((goal.progress / goal.target) * 100, 100);
            const isComplete = percent >= 100;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#1a1a1a] border border-[#333] rounded-xl p-3 ${
                  isComplete ? "shadow-yellow-400/30" : ""
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3
                    className={`text-yellow-400 font-semibold truncate ${
                      isComplete ? "line-through text-gray-400" : ""
                    }`}
                  >
                    {goal.name}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {editingId === goal.id ? (
                      <>
                        <input
                          type="number"
                          value={tempProgress}
                          onChange={(e) => setTempProgress(e.target.value)}
                          className="w-16 bg-[#222] border border-[#333] rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-yellow-400"
                        />
                        <button
                          onClick={() => handleSaveEdit(goal)}
                          className="text-yellow-400 hover:text-yellow-300"
                        >
                          <Check size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleProgressChange(goal, -1)}
                          className="text-yellow-400 border border-yellow-400 px-2 py-0.5 rounded-md text-xs font-bold hover:bg-yellow-400 hover:text-black transition"
                        >
                          –
                        </button>
                        <span className="text-sm text-gray-300">
                          {goal.progress}/{goal.target}
                        </span>
                        <button
                          onClick={() => handleProgressChange(goal, +1)}
                          className="bg-yellow-400 text-black px-2 py-0.5 rounded-md text-xs font-bold hover:bg-yellow-300 transition"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleEditStart(goal)}
                          className="text-gray-400 hover:text-yellow-400 transition"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="text-gray-500 hover:text-red-400 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative w-full bg-[#222] h-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-2 ${
                      isComplete
                        ? "bg-green-400"
                        : "bg-gradient-to-r from-yellow-400 to-yellow-300"
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add New Goal Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="text"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="Goal name..."
          className="flex-1 min-w-[120px] bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
        />
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target"
          className="w-24 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
        />
        <button
          onClick={handleAdd}
          className="bg-yellow-400 text-black px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition"
        >
          <Plus size={14} />
        </button>
      </div>
    </motion.div>
  );
}
