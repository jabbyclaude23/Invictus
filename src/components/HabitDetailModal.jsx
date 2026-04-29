import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { X } from "lucide-react";

export default function HabitDetailModal({ habit, onClose }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      const q = query(
        collection(db, "users", auth.currentUser.uid, "habits", habit.id, "progress"),
        orderBy("date", "desc"),
        limit(14) // last 2 weeks
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => d.data());
      const ordered = data.reverse();
      setHistory(ordered);
    }

    fetchHistory();
  }, [habit.id]);

  const isNumeric = habit.target && habit.target > 1;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111] border border-[#222] rounded-2xl p-6 w-[90%] max-w-md text-white shadow-xl shadow-black/50 relative"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-yellow-400 transition"
        >
          <X size={18} strokeWidth={2} />
        </button>

        <h2 className="text-xl font-semibold text-yellow-400 mb-2">
          {habit.name} History
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Last {history.length} days of tracking
        </p>

        {history.length > 0 ? (
          <div className="h-60">
            {isNumeric ? (
              // 🔹 Bar Chart for numeric habits
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    tick={{ fill: "#888", fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#888"
                    tick={{ fill: "#888", fontSize: 10 }}
                    domain={[0, habit.target]}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.1)" }}
                    contentStyle={{
                      backgroundColor: "#111",
                      border: "1px solid #222",
                      color: "#fff",
                    }}
                  />
                  <Bar
                    dataKey="progress"
                    fill="#facc15"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              // 🔹 Line Chart for binary habits (done/not done)
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <XAxis
                    dataKey="date"
                    stroke="#888"
                    tick={{ fill: "#888", fontSize: 10 }}
                  />
                  <YAxis
                    stroke="#888"
                    tick={{ fill: "#888", fontSize: 10 }}
                    ticks={[0, 1]}
                    domain={[0, 1]}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.1)" }}
                    contentStyle={{
                      backgroundColor: "#111",
                      border: "1px solid #222",
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="#facc15"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#facc15" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic mt-4">
            No history yet — complete this habit today to start logging.
          </p>
        )}

        {/* Latest Value Summary */}
        {history.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-yellow-400 font-semibold">
              {isNumeric
                ? `Latest: ${history[history.length - 1].progress}/${habit.target}`
                : history[history.length - 1].progress === 1
                ? "Completed yesterday ✅"
                : "Not completed yesterday ❌"}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

