import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Clock, Send, Trash2 } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { useCoach } from "../context/CoachContext.jsx";

// ---------- small helpers ----------
function fmtDate(ts) {
  try {
    const d = ts?.toDate?.() || new Date();
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "";
  }
}
const TW_INPUT_SAFE = { paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" };

// ---------- Sessions Drawer (inline component) ----------
function SessionsDrawer({ open, onClose, sessions, activeId, onSelect, onDelete }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
      aria-hidden="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* Panel */}
      <div
        className="absolute left-0 top-0 h-full w-[80%] max-w-[320px] bg-[#0b0b0b] border-r border-[#222] p-3 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-yellow-400 font-semibold">
            <Clock size={16} />
            <span>Sessions</span>
          </div>
          <button
            className="px-2 py-1 rounded-lg border border-[#333] text-gray-300 hover:text-yellow-400"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[calc(100%-48px)] pr-1">
          {sessions.length === 0 && (
            <p className="text-sm text-gray-500">No chats yet</p>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`group rounded-xl border px-3 py-2 cursor-pointer transition ${
                s.id === activeId
                  ? "border-yellow-400/70 bg-yellow-400/5"
                  : "border-[#222] hover:border-[#444]"
              }`}
              onClick={() => {
                onSelect(s.id);
                onClose();
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {s.title || "Active Session"}
                  </div>
                  <div className="text-xs text-gray-500">{fmtDate(s.updatedAt || s.createdAt)}</div>
                </div>
                <button
                  className="opacity-70 hover:opacity-100 text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.id);
                  }}
                  title="Delete session"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Main Coach Page ----------
export default function Coach() {
  const { user, askCoach } = useCoach();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  // stream sessions list (latest first)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "coach_sessions"),
      orderBy("updatedAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSessions(rows);
      // pick active if none selected
      if (!activeId && rows.length > 0) setActiveId(rows[0].id);
    });
    return unsub;
  }, [user, activeId]);

  // ensure we have an "active within 12h" session
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "coach_sessions"),
      orderBy("updatedAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const now = Date.now();
      const latest = snap.docs[0];
      const last = latest?.data();
      const tsMs = last?.updatedAt?.toDate?.()?.getTime?.() ?? 0;
      const within12h = now - tsMs < 12 * 60 * 60 * 1000;

      if (latest && within12h) {
        setActiveId(latest.id);
      } else if (!latest || !within12h) {
        try {
          const ref = await addDoc(collection(db, "users", user.uid, "coach_sessions"), {
            title: "Active Session",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setActiveId(ref.id);
          await addDoc(collection(db, "users", user.uid, "coach_sessions", ref.id, "messages"), {
            role: "assistant",
            content: `Welcome back ${user.displayName || "Champion"} — let's lock in. What do you want to focus on today?`,
            createdAt: serverTimestamp(),
          });
          await updateDoc(doc(db, "users", user.uid, "coach_sessions", ref.id), {
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("Failed to create coach session:", e);
        }
      }
    });
    return unsub;
  }, [user]);

  // stream messages for active session
  useEffect(() => {
    if (!user || !activeId) return;
    const q = query(
      collection(db, "users", user.uid, "coach_sessions", activeId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      // scroll
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
    return unsub;
  }, [user, activeId]);

  const send = async () => {
    if (!user || !activeId || !input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // save user message
    const msgCol = collection(db, "users", user.uid, "coach_sessions", activeId, "messages");
    await addDoc(msgCol, { role: "user", content: text, createdAt: serverTimestamp() });
    await updateDoc(doc(db, "users", user.uid, "coach_sessions", activeId), {
      updatedAt: serverTimestamp(),
    });

    try {
      // ask the model with full chat so far (lightweight: we only pass roles+content)
      const chat = messages.map(({ role, content }) => ({ role, content }));
      const reply = await askCoach({ messages: [...chat, { role: "user", content: text }] });
      await addDoc(msgCol, { role: "assistant", content: reply, createdAt: serverTimestamp() });
      await updateDoc(doc(db, "users", user.uid, "coach_sessions", activeId), {
        updatedAt: serverTimestamp(),
      });
    } catch {
      await addDoc(msgCol, {
        role: "assistant",
        content: "Coach Invictus is momentarily unavailable — try again shortly.",
        createdAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const handleDeleteSession = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "coach_sessions", id));
      if (id === activeId) setActiveId(null);
    } catch (e) {
      console.error(e);
    }
  };

  // simple lock if user not present
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Sign in to use Coach.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black border-b border-[#222] px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-yellow-400">Coach Invictus</h1>
          <p className="text-xs text-gray-400">Expert in trading, fitness, and nutrition — your personal mentor.</p>
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="text-gray-300 hover:text-yellow-400 text-sm border border-[#333] px-3 py-1.5 rounded-lg"
        >
          Sessions
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
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
        <div ref={endRef} />
        {/* bottom pad so last bubble isn't under the input */}
        <div style={{ height: 12 }} />
      </div>

      {/* Input */}
      <div
        className="sticky bottom-0 bg-[#0b0b0b] border-t border-[#222] px-3 pt-2"
        style={TW_INPUT_SAFE}
      >
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type your message..."
            inputMode="text"
            className="flex-1 resize-none bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400"
            style={{ fontSize: 16 }} // prevents iOS zoom
          />
          <button
            onClick={send}
            disabled={sending}
            className={`px-3 py-2 rounded-lg ${sending ? "bg-gray-600" : "bg-yellow-400 hover:bg-yellow-300"} text-black`}
            aria-label="Send"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Drawer */}
      <SessionsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessions={sessions}
        activeId={activeId}
        onSelect={setActiveId}
        onDelete={handleDeleteSession}
      />
    </div>
  );
}
