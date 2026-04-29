import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ChevronDown, ChevronUp, PenSquare, Check } from "lucide-react";
import {
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase";

export default function ScheduleTab() {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editTime, setEditTime] = useState("");

  // Convert 24h -> 12h
  const formatTime = (time24) => {
    if (!time24) return "";
    let [hour, minute] = time24.split(":");
    hour = parseInt(hour);
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const toMinutes = (timeStr) => {
    const [time, period] = timeStr.split(" ");
    let [hour, minute] = time.split(":").map(Number);
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  };

  // Load user schedule
  useEffect(() => {
    const fetchSchedule = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, "users", user.uid, "schedule"), orderBy("timeSort"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
    };
    fetchSchedule();
  }, []);

  const handleAdd = async () => {
    if (!newLabel || !newTime) return;
    const user = auth.currentUser;
    if (!user) return;

    const formattedTime = formatTime(newTime);
    const timeSort = toMinutes(formattedTime);

    const newItem = { label: newLabel, time: formattedTime, timeSort };
    const docRef = await addDoc(collection(db, "users", user.uid, "schedule"), newItem);

    const updated = [...items, { id: docRef.id, ...newItem }];
    updated.sort((a, b) => a.timeSort - b.timeSort);
    setItems(updated);
    setNewLabel("");
    setNewTime("");
  };

  const handleDelete = async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "schedule", id));
    setItems(items.filter((i) => i.id !== id));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    const [hourMinute, ampm] = item.time.split(" ");
    let [hour, minute] = hourMinute.split(":");
    hour = parseInt(hour);
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const formatted24 = `${String(hour).padStart(2, "0")}:${minute}`;
    setEditTime(formatted24);
  };

  const handleSaveEdit = async (id) => {
    const user = auth.currentUser;
    if (!user || !editLabel || !editTime) return;

    const formattedTime = formatTime(editTime);
    const timeSort = toMinutes(formattedTime);
    const updatedItem = { label: editLabel, time: formattedTime, timeSort };

    await updateDoc(doc(db, "users", user.uid, "schedule", id), updatedItem);

    const updated = items.map((i) =>
      i.id === id ? { ...i, ...updatedItem } : i
    );
    updated.sort((a, b) => a.timeSort - b.timeSort);
    setItems(updated);
    setEditingId(null);
  };

  return (
    <motion.div
      className="bg-[#111] border border-[#222] rounded-2xl p-4 shadow-lg shadow-black/40 mb-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-lg font-semibold text-yellow-400">Schedule</h2>
        {expanded ? (
          <ChevronUp size={18} className="text-yellow-400" />
        ) : (
          <ChevronDown size={18} className="text-yellow-400" />
        )}
      </div>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-3"
        >
          {items.length === 0 ? (
            <p className="text-gray-500 italic text-sm">
              No schedule yet — add your routine below.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-[#1a1a1a] px-3 py-2 rounded-lg border border-[#333]"
              >
                {editingId === item.id ? (
                  <div className="flex flex-1 items-center space-x-2">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="flex-1 bg-[#222] border border-[#333] rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-yellow-400"
                    />
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="bg-[#222] border border-[#333] rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-yellow-400"
                    />
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      className="p-1 text-yellow-400 hover:text-yellow-300"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-300">
                      <span className="text-yellow-400 font-semibold mr-2">
                        {item.time}
                      </span>
                      {item.label}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-gray-400 hover:text-yellow-400 transition"
                      >
                        <PenSquare size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-500 hover:text-red-400 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}

          <div className="flex items-center space-x-2 mt-3">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Wake up"
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-yellow-400"
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-yellow-400"
            />
            <button
              onClick={handleAdd}
              className="bg-yellow-400 text-black px-3 py-1 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition"
            >
              <Plus size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
