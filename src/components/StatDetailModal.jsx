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
} from "recharts";
import { X } from "lucide-react";

export default function StatDetailModal({ stat, onClose }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function fetchHistory() {
      const q = query(
        collection(db, "users", auth.currentUser.uid, "stats", stat.id, "history"),
        orderBy("date", "desc"),
        limit(14)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => d.data());
      setHistory(data.reverse());
    }
    fetchHistory();
  }, [stat.id]);

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

        <h2 className="text-xl font-semibold text-yellow-400 mb-3">
          {stat.name} Trend
        </h2>

        {history.length > 0 ? (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history}>
                <XAxis
                  dataKey="date"
                  stroke="#888"
                  tick={{ fill: "#888", fontSize: 10 }}
                />
                <YAxis stroke="#888" tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.1)" }}
                  contentStyle={{
                    backgroundColor: "#111",
                    border: "1px solid #222",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="value" fill="#facc15" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic mt-4">
            No stat history yet — your first daily log will appear after midnight.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
