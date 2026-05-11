import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { dailyQuotes } from "../data/quotes";
import ScheduleTab from "../components/ScheduleTab";
import HabitCard from "../components/HabitCard";
import AddHabitModal from "../components/AddHabitModal";
import AddStatModal from "../components/AddStatModal";
import StatCard from "../components/StatCard";
import TodoList from "../components/TodoList";
import GoalTracker from "../components/GoalTracker";
import { Plus, MessageCircle, X, Send, Bot, Dumbbell, Utensils, TrendingUp, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCoach } from "../context/CoachContext.jsx";

const WEEK_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// small helper to avoid iOS zoom on inputs
const IOS_INPUT_STYLE = { fontSize: 16 };

export default function Dashboard() {
  const { askCoach, user: ctxUser, plans } = useCoach();
  const navigate = useNavigate();

  const [quote, setQuote] = useState("");
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState([]);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showStatModal, setShowStatModal] = useState(false);
  const [user, setUser] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    stats: false,
    habits: true,
  });

  // mini chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatMessages, setChatMessages] = useState(() => [
    {
      role: "assistant",
      content: `Welcome back ${
        ctxUser?.displayName?.split?.(" ")?.[0] || "Champion"
      } — what do you want to focus on right now?`,
    },
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
    );
    setQuote(dailyQuotes[dayOfYear % dailyQuotes.length]);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser(u);
        fetchHabits(u);
        fetchStats(u);
      }
    });
    return unsubscribe;
  }, []);

  // 🔹 Fetch Habits
  const fetchHabits = async (user) => {
    const snapshot = await getDocs(
      query(collection(db, "users", user.uid, "habits"), orderBy("createdAt"))
    );
    const data = [];
    for (const docSnap of snapshot.docs) {
      const habit = { id: docSnap.id, ...docSnap.data(), progress: 0 };
      const todayKey = new Date().toISOString().slice(0, 10);
      const progRef = doc(
        db,
        "users",
        user.uid,
        "habits",
        habit.id,
        "progress",
        todayKey
      );
      const progSnap = await getDoc(progRef);
      if (progSnap.exists()) habit.progress = progSnap.data().progress || 0;
      else await setDoc(progRef, { progress: 0, date: todayKey });
      data.push(habit);
    }
    setHabits(data);
  };

  // 🔹 Fetch Stats
  const fetchStats = async (user) => {
    const snapshot = await getDocs(
      query(collection(db, "users", user.uid, "stats"), orderBy("createdAt"))
    );
    const data = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    setStats(data);
  };

  // 🔹 Habit Update
  const handleHabitUpdate = async (id, newProgress) => {
    const updated = habits.map((h) =>
      h.id === id ? { ...h, progress: newProgress } : h
    );
    setHabits(updated);

    const todayKey = new Date().toISOString().slice(0, 10);
    const habitRef = doc(
      db,
      "users",
      user.uid,
      "habits",
      id,
      "progress",
      todayKey
    );
    await setDoc(habitRef, { progress: newProgress, date: todayKey }, { merge: true });
  };

  const handleHabitAdd = (habit) => setHabits([...habits, habit]);
  const handleHabitDelete = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "habits", id));
    setHabits(habits.filter((h) => h.id !== id));
  };

  // 🔹 Stat Update
  const handleStatUpdate = async (id, newValue) => {
    const updated = stats.map((s) =>
      s.id === id ? { ...s, value: newValue } : s
    );
    setStats(updated);
  };

  const handleStatAdd = (stat) => setStats([...stats, stat]);
  const handleStatDelete = async (id) => {
    await deleteDoc(doc(db, "users", user.uid, "stats", id));
    setStats(stats.filter((s) => s.id !== id));
  };

  // 🕛 Auto-Log Stats and Habits at Midnight
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0 && user) {
        const todayKey = new Date().toISOString().slice(0, 10);

        // Log Stats
        for (const s of stats) {
          const statRef = doc(db, "users", user.uid, "stats", s.id, "history", todayKey);
          await setDoc(statRef, { date: todayKey, value: s.value }, { merge: true });
        }

        // Log and Reset Habits
        for (const h of habits) {
          const habitRef = doc(db, "users", user.uid, "habits", h.id, "progress", todayKey);
          await setDoc(habitRef, {
            date: todayKey,
            progress: h.progress,
            completed: h.target ? h.progress >= h.target : h.progress === 1,
          });
        }

        setHabits(habits.map((h) => ({ ...h, progress: 0 })));
        console.log("✅ Stats & Habits logged for the day and habits reset.");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [stats, habits, user]);

  // 📊 Daily Completion Bar
  const completedCount = habits.filter((h) =>
    h.target ? h.progress >= h.target : h.progress === 1
  ).length;
  const percentDone = habits.length ? (completedCount / habits.length) * 100 : 0;

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // ----- Mini Chat logic -----
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [chatOpen, chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatSending(true);
    try {
      const reply = await askCoach({ messages: [...chatMessages, userMsg] });
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Coach is unavailable — try again." },
      ]);
    } finally {
      setChatSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <h1 className="text-3xl font-semibold mb-2 text-gray-100 text-center">
          Good Day,{" "}
          <span className="text-yellow-400 font-bold">
            {user?.displayName?.split(" ")[0] || "Champion"}
          </span>
        </h1>

        {/* Daily Quote */}
        <motion.div
          key={quote}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="mt-4 mb-6 text-center px-2"
        >
          <p className="text-base text-[#f87171] italic font-light leading-relaxed tracking-wide drop-shadow-[0_0_10px_rgba(248,113,113,0.35)]">
            "{quote}"
          </p>
        </motion.div>

        {/* Today's Plan summary */}
        {(plans?.workout || plans?.meal) && (() => {
          const todayDay = WEEK_DAYS[new Date().getDay()];
          const workoutToday = plans.workout?.weekly_schedule?.find(d => d.day === todayDay);
          const mealTarget   = plans.meal?.daily_targets;
          return (
            <div className="flex gap-3 mb-6">
              {workoutToday && (
                <div className="flex-1 bg-red-500/8 border border-red-500/20 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                  <Dumbbell size={14} className="text-red-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-red-400 font-medium">Workout</p>
                    <p className="text-xs text-gray-400 truncate">{workoutToday.focus}</p>
                  </div>
                </div>
              )}
              {mealTarget && (
                <div className="flex-1 bg-green-500/8 border border-green-500/20 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                  <Utensils size={14} className="text-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-green-400 font-medium">Nutrition</p>
                    <p className="text-xs text-gray-400 truncate">{mealTarget.calories} kcal · {mealTarget.protein}g P</p>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: "Workout", icon: <Dumbbell size={16} />, to: "/workout", color: "text-red-400 border-red-500/30 bg-red-500/8 hover:bg-red-500/15" },
            { label: "Meals", icon: <Utensils size={16} />, to: "/meals", color: "text-green-400 border-green-500/30 bg-green-500/8 hover:bg-green-500/15" },
            { label: "Trades", icon: <TrendingUp size={16} />, to: "/trading", color: "text-blue-400 border-blue-500/30 bg-blue-500/8 hover:bg-blue-500/15" },
          ].map(({ label, icon, to, color }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border ${color} transition-all`}
            >
              {icon}
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Schedule Section */}
        <ScheduleTab />

        {/* Stats Section */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-4 mb-8 shadow-lg shadow-black/40">
          <div className="flex justify-between items-center gap-3 mb-4">
            <button
              onClick={() => toggleSection("stats")}
              className="flex flex-1 items-center justify-between text-left"
              aria-expanded={expandedSections.stats}
            >
              <h2 className="text-lg font-semibold text-yellow-400">Stats</h2>
              {expandedSections.stats ? (
                <ChevronUp size={18} className="text-yellow-400" />
              ) : (
                <ChevronDown size={18} className="text-yellow-400" />
              )}
            </button>
            {expandedSections.stats && (
              <button
                onClick={() => setShowStatModal(true)}
                className="flex items-center space-x-2 bg-yellow-400 text-black px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition"
              >
                <Plus size={16} />
                <span>Add Stat</span>
              </button>
            )}
          </div>

          {expandedSections.stats && (stats.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No stats yet — click "Add Stat" to start tracking.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {stats.map((stat) => (
                <StatCard
                  key={stat.id}
                  stat={stat}
                  onUpdate={handleStatUpdate}
                  onDelete={handleStatDelete}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Goal Tracker */}
        <GoalTracker />

        {/* Daily Progress */}
        <div className="bg-[#111] border border-[#222] rounded-2xl p-4 shadow-lg shadow-black/40">
          <div className="flex justify-between items-center gap-3 mb-4">
            <button
              onClick={() => toggleSection("habits")}
              className="flex flex-1 items-center justify-between text-left"
              aria-expanded={expandedSections.habits}
            >
              <h2 className="text-lg font-semibold text-yellow-400">Daily Progress</h2>
              {expandedSections.habits ? (
                <ChevronUp size={18} className="text-yellow-400" />
              ) : (
                <ChevronDown size={18} className="text-yellow-400" />
              )}
            </button>
            {expandedSections.habits && (
              <button
                onClick={() => setShowHabitModal(true)}
                className="flex items-center space-x-2 bg-yellow-400 text-black px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition"
              >
                <Plus size={16} />
                <span>Add Habit</span>
              </button>
            )}
          </div>

          {expandedSections.habits && (habits.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No habits yet — click "Add Habit" to start tracking.
            </p>
          ) : (
            <div className="space-y-3">
              {habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onUpdate={handleHabitUpdate}
                  onDelete={handleHabitDelete}
                  onEdit={(habit) => {
                    setEditingHabit(habit);
                    setShowEditModal(true);
                  }}
                />
              ))}
              <AnimatePresence>
                {showEditModal && editingHabit && (
                  <AddHabitModal
                    habitToEdit={editingHabit}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={(updatedHabit) => {
                      setHabits((prev) =>
                        prev.map((h) => (h.id === updatedHabit.id ? updatedHabit : h))
                      );
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Daily Completion Tracker */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm text-gray-400">
                    Today's progress
                  </p>
                  <div className="flex items-center gap-1.5">
                    {percentDone === 100 && (
                      <span className="flex items-center gap-1 text-xs text-yellow-400 font-semibold">
                        <Zap size={12} /> All done!
                      </span>
                    )}
                    <span className="text-sm text-yellow-400 font-semibold">
                      {completedCount}/{habits.length}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#222] h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${percentDone}%` }}
                    transition={{ duration: 0.6 }}
                    className={`h-2.5 rounded-full ${percentDone === 100 ? "bg-gradient-to-r from-yellow-400 to-green-400" : "bg-gradient-to-r from-yellow-400 to-yellow-300"}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* To-do List */}
      <TodoList />

      {/* Modals */}
      <AnimatePresence>
        {showHabitModal && (
          <AddHabitModal
            onClose={() => setShowHabitModal(false)}
            onAdd={handleHabitAdd}
          />
        )}
        {showStatModal && (
          <AddStatModal
            onClose={() => setShowStatModal(false)}
            onAdd={handleStatAdd}
          />
        )}
      </AnimatePresence>

      {/* Floating Coach Button */}
      <button
        aria-label="Open Coach"
        onClick={() => setChatOpen(true)}
        className="fixed right-4 bottom-24 z-50 rounded-full p-3 bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 border border-yellow-500 hover:bg-yellow-300 transition"
      >
        <MessageCircle size={22} />
      </button>

      {/* Mini Coach Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChatOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            {/* Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute bottom-0 left-0 right-0 bg-[#0b0b0b] border-t border-[#222] rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
                <div className="text-yellow-400 font-semibold text-sm flex items-center gap-2">
                  <Bot size={16} className="opacity-80" />
                  Coach Invictus
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-gray-300 hover:text-yellow-400"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Messages */}
              <div className="max-h-[55vh] overflow-y-auto px-4 py-3 space-y-3">
                {chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[82%] rounded-xl px-3 py-2 leading-relaxed ${
                      m.role === "assistant"
                        ? "bg-[#1a1a1a] border border-[#333] text-gray-200"
                        : "bg-yellow-400 text-black ml-auto"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <Bot size={14} className="inline-block mr-1 text-yellow-400 opacity-80" />
                    )}
                    {m.content}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="px-3 pb-3 pt-2 border-t border-[#222] bg-[#0b0b0b]">
                <div className="flex items-end gap-2">
                  <textarea
                    rows={1}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChat();
                      }
                    }}
                    placeholder="Ask Coach about your day, workout, meals, or trading…"
                    className="flex-1 resize-none bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
                    style={IOS_INPUT_STYLE}
                  />
                  <button
                    onClick={sendChat}
                    disabled={chatSending}
                    className={`px-3 py-2 rounded-lg ${
                      chatSending ? "bg-gray-600" : "bg-yellow-400 hover:bg-yellow-300"
                    } text-black`}
                    aria-label="Send"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
