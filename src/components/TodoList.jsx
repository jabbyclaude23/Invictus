import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import confetti from "canvas-confetti";


export default function TodoList() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [expanded, setExpanded] = useState(false);

  const fireConfetti = () => {
  confetti({
    particleCount: 25,
    spread: 60,
    startVelocity: 25,
    gravity: 0.9,
    colors: ["#facc15", "#fef08a", "#eab308"],
    ticks: 60,
    origin: { y: 0.8 },
  });
};


  // 🔹 Load user's tasks
  useEffect(() => {
    const fetchTasks = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, "users", user.uid, "todos"),
        orderBy("createdAt")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTasks(data);
    };
    fetchTasks();
  }, []);

  // 🔹 Add new task
  const handleAdd = async () => {
    const user = auth.currentUser;
    if (!user || !newTask.trim()) return;

    const newItem = {
      text: newTask.trim(),
      done: false,
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, "users", user.uid, "todos"), newItem);
    setTasks([...tasks, { id: docRef.id, ...newItem }]);
    setNewTask("");
  };

  // 🔹 Toggle task done
  const handleToggle = async (task) => {
    const user = auth.currentUser;
    if (!user) return;

    const updated = { ...task, done: !task.done };
    await updateDoc(doc(db, "users", user.uid, "todos", task.id), {
      done: updated.done,
    });
    if (!task.done) fireConfetti(); // fire only when marking complete
    setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
  };

  // 🔹 Delete task
  const handleDelete = async (id) => {
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, "users", user.uid, "todos", id));
    setTasks(tasks.filter((t) => t.id !== id));
  };

  // 🔹 Dynamic progress color
  const completionRatio =
    tasks.length > 0 ? tasks.filter((t) => t.done).length / tasks.length : 0;
  const progressColor =
    completionRatio < 0.33
      ? "#ef4444" // red
      : completionRatio < 0.66
      ? "#fbbf24" // amber
      : "#22c55e"; // green

  return (
    <motion.div
      className="bg-[#111] border border-[#222] rounded-2xl p-4 shadow-lg shadow-black/40 mb-10 mt-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header & Progress */}
      <div className="flex flex-col space-y-2 mb-4">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={expanded}
        >
          <h2 className="text-lg font-semibold text-yellow-400">To-Do List</h2>
          {expanded ? (
            <ChevronUp size={18} className="text-yellow-400" />
          ) : (
            <ChevronDown size={18} className="text-yellow-400" />
          )}
        </button>

        {expanded && tasks.length > 0 && (
          <>
            <p className="text-sm text-gray-400">
              {tasks.filter((t) => t.done).length} of {tasks.length} tasks complete
            </p>
            <div className="w-full bg-[#222] h-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${completionRatio * 100}%`,
                  backgroundColor: progressColor,
                }}
                transition={{ duration: 0.5 }}
                className="h-2"
              />
            </div>
          </>
        )}
      </div>

      {/* Tasks */}
      {expanded && (tasks.length === 0 ? (
        <p className="text-gray-500 italic text-sm mb-3">
          No tasks yet — add one below.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between bg-[#1a1a1a] px-3 py-2 rounded-lg border border-[#333]"
            >
              <div
                className={`flex items-center space-x-2 cursor-pointer transition ${
                  task.done ? "opacity-60" : ""
                }`}
                onClick={() => handleToggle(task)}
              >
                <Check
                  size={16}
                  className={`${
                    task.done ? "text-yellow-400" : "text-gray-600"
                  } transition`}
                />
                <span
                  className={`text-sm ${
                    task.done
                      ? "line-through text-gray-500"
                      : "text-gray-300"
                  }`}
                >
                  {task.text}
                </span>
              </div>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-gray-500 hover:text-red-400 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ))}

      {/* Add Task Input */}
      {expanded && <div className="flex space-x-2">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New task..."
          className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
        />
        <button
          onClick={handleAdd}
          className="bg-yellow-400 text-black px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition"
        >
          <Plus size={14} />
        </button>
      </div>}
    </motion.div>
  );
}
