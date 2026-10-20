import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, ChevronRight, Clock3, Dumbbell, History, Loader2, MessageSquare, Plus, Sparkles, Trash2, TrendingUp, Utensils, X } from "lucide-react";
import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, writeBatch, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useCoach } from "../context/useCoach";

const pendingSessions = new Map();
function createSession(user) {
  if (pendingSessions.has(user.uid)) return pendingSessions.get(user.uid);
  const task = (async () => {
    const session = doc(collection(db, "users", user.uid, "coach_sessions"));
    const greeting = doc(collection(session, "messages"));
    const batch = writeBatch(db);
    batch.set(session, { title: "Active Session", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    batch.set(greeting, { role: "assistant", content: `Welcome back ${user.displayName || "Champion"} — let's lock in. What do you want to focus on today?`, createdAt: serverTimestamp() });
    await batch.commit();
    return session.id;
  })().finally(() => pendingSessions.delete(user.uid));
  pendingSessions.set(user.uid, task);
  return task;
}
function formatDate(timestamp) {
  const date = timestamp?.toDate?.();
  return date ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Just now";
}
const prompts = [
  { icon: <Dumbbell size={18} className="text-[#d4c17a]" />, title: "Build my training week", text: "Help me plan a realistic training week around my goals and current routine." },
  { icon: <Utensils size={18} className="text-[#d4c17a]" />, title: "Dial in my nutrition", text: "Help me improve my nutrition. What should I focus on first based on my goals?" },
  { icon: <TrendingUp size={18} className="text-[#d4c17a]" />, title: "Review my trading habits", text: "Help me review my trading habits and identify one way to become more disciplined." },
];

function SessionList({ sessions, activeId, onSelect, onDelete, busy }) {
  return <div className="space-y-2">
    {sessions.length === 0 && <p className="px-2 py-5 text-sm text-[#b2bbc7]">Your conversations will appear here.</p>}
    {sessions.map(session => <div key={session.id} className={`flex items-center gap-1 rounded-xl border transition ${activeId === session.id ? "border-[#d4c17a]/30 bg-[#d4c17a]/10" : "border-transparent hover:bg-[#1c232c]"}`}>
      <button type="button" disabled={busy} aria-current={activeId === session.id ? "true" : undefined} onClick={() => onSelect(session.id)} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl px-3 py-3 text-left disabled:opacity-50">
        <MessageSquare size={16} className="mt-1 shrink-0 text-[#d4c17a]" />
        <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#f4f6f8]">{session.title === "Active Session" ? "Coaching session" : session.title || "Coaching session"}</span><span className="mt-1 block text-xs text-[#b2bbc7]">{formatDate(session.updatedAt || session.createdAt)}</span></span>
      </button>
      <button type="button" disabled={busy} onClick={() => onDelete(session.id)} className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#b2bbc7] transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-40" aria-label={`Delete ${session.title || "coaching session"}`}><Trash2 size={15} /></button>
    </div>)}
  </div>;
}

export default function Coach() {
  const { user, askCoach } = useCoach();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const drawerRef = useRef(null);
  const deleteRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const workspaceRef = useRef(null);
  const sendLock = useRef(false);
  const initialized = useRef(null);
  const recovery = useRef(null);
  const activeSession = sessions.find(session => session.id === activeId);

  useEffect(() => {
    if (!user) { setSessions([]); setMessages([]); setActiveId(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    const request = query(collection(db, "users", user.uid, "coach_sessions"), orderBy("updatedAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(request, { includeMetadataChanges: true }, async snapshot => {
      if (cancelled) return;
      const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
      setSessions(rows);
      if (initialized.current === user.uid) {
        setActiveId(current => current && rows.some(row => row.id === current) ? current : rows[0]?.id || null);
        setLoading(false);
        return;
      }
      // Wait for the server before treating a cached empty list as a new account.
      if (snapshot.metadata.fromCache) return;
      initialized.current = user.uid;
      const latest = rows[0];
      const lastUpdate = latest?.updatedAt?.toMillis?.() || 0;
      if (latest && Date.now() - lastUpdate < 12 * 60 * 60 * 1000) {
        setActiveId(latest.id);
        setLoading(false);
        return;
      }
      setCreating(true);
      try {
        const id = await createSession(user);
        if (!cancelled) setActiveId(id);
      } catch { if (!cancelled) setError("We couldn't start a session. Use New session to try again."); }
      finally { if (!cancelled) { setCreating(false); setLoading(false); } }
    }, () => { setError("Your conversations couldn't load. Check your connection and refresh to try again."); setLoading(false); });
    return () => { cancelled = true; unsubscribe(); };
  }, [user]);

  useEffect(() => {
    setMessages([]);
    setMessagesError(false);
    recovery.current = null;
    if (!user || !activeId) { setMessagesLoading(false); return; }
    setMessagesLoading(true);
    const request = query(collection(db, "users", user.uid, "coach_sessions", activeId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(request, snapshot => {
      setMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
      setMessagesLoading(false);
    }, () => { setMessagesLoading(false); setMessagesError(true); setError("Messages couldn't load. Refresh before sending another message."); });
  }, [user, activeId]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      const element = workspaceRef.current;
      if (!element) return;
      const keyboardOpen = window.innerHeight - viewport.height > 150;
      element.style.maxHeight = keyboardOpen ? `${Math.max(200, viewport.height - element.getBoundingClientRect().top + viewport.offsetTop)}px` : "";
    };
    viewport.addEventListener("resize", resize);
    return () => viewport.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const dialog = drawerOpen ? drawerRef.current : deleteId ? deleteRef.current : null;
    if (!dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus?.(); };
  }, [drawerOpen, deleteId]);

  const newSession = async () => {
    if (!user || loading || creating || sendLock.current) return;
    setCreating(true);
    setError("");
    try { setActiveId(await createSession(user)); setInput(""); setDrawerOpen(false); }
    catch { setError("We couldn't create your session. Please try again."); }
    finally { setCreating(false); }
  };
  const send = async event => {
    event?.preventDefault();
    if (!user || !activeId || !input.trim() || sendLock.current || creating || messagesLoading || messagesError) return;
    const text = input.trim();
    const sessionId = activeId;
    const retry = recovery.current?.sessionId === sessionId && recovery.current?.text === text ? recovery.current : null;
    sendLock.current = true;
    setSending(true);
    setInput("");
    setError("");
    let userMessageId = retry?.userMessageId;
    try {
      const messageCollection = collection(db, "users", user.uid, "coach_sessions", sessionId, "messages");
      if (!userMessageId) {
        const message = await addDoc(messageCollection, { role: "user", content: text, createdAt: serverTimestamp() });
        userMessageId = message.id;
      }
      const sessionRef = doc(db, "users", user.uid, "coach_sessions", sessionId);
      await updateDoc(sessionRef, { updatedAt: serverTimestamp(), ...(activeSession?.title === "Active Session" ? { title: text.slice(0, 54) } : {}) });
      const chat = messages.filter(message => message.id !== userMessageId).map(({ role, content }) => ({ role, content }));
      const reply = await askCoach({ messages: [...chat, { role: "user", content: text }] });
      if (!reply || reply === "Coach error.") throw new Error("Coach unavailable");
      await addDoc(messageCollection, { role: "assistant", content: reply, createdAt: serverTimestamp() });
      recovery.current = null;
      // A metadata update must not turn a successfully saved reply into a failed send.
      updateDoc(sessionRef, { updatedAt: serverTimestamp() }).catch(() => {});
    } catch {
      recovery.current = { sessionId, text, userMessageId };
      setInput(current => current || text);
      setError("Your message wasn't completed. Your draft is restored; try sending again.");
    } finally {
      sendLock.current = false;
      setSending(false);
      inputRef.current?.focus();
    }
  };
  const deleteSession = async () => {
    if (!user || !deleteId || deleting) return;
    setDeleting(true);
    try { await deleteDoc(doc(db, "users", user.uid, "coach_sessions", deleteId)); setDeleteId(null); }
    catch { setError("The session couldn't be deleted. Please try again."); setDeleteId(null); }
    finally { setDeleting(false); }
  };
  const select = id => { setActiveId(id); setDrawerOpen(false); setInput(""); setError(""); };
  const listProps = { sessions, activeId, onSelect: select, onDelete: id => { setDrawerOpen(false); setDeleteId(id); }, busy: sending || creating || deleting };
  const hasConversation = messages.some(message => message.role === "user");

  if (!user) return <div className="panel flex min-h-64 items-center justify-center p-8 text-[#b2bbc7]">Sign in to start a conversation with your coach.</div>;
  return <section ref={workspaceRef} className="coach-workspace flex min-h-0 overflow-hidden bg-[#0d1014] text-[#f4f6f8]" aria-label="Coach Invictus">
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-[#11161c] p-5 lg:flex">
      <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#b2bbc7]"><Clock3 size={15} /> Conversations</div>
      <button type="button" className="button-secondary mb-6 flex items-center justify-center gap-2" disabled={creating || sending} onClick={newSession}>{creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} New session</button>
      <div className="min-h-0 flex-1 overflow-y-auto"><SessionList {...listProps} /></div>
      <div className="mt-5 border-t border-white/[0.07] pt-5 text-xs leading-relaxed text-[#b2bbc7]">One conversation.<br /><span className="text-[#d4c17a]">A clearer next step.</span></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d4c17a]/20 bg-[#d4c17a]/10 text-[#d4c17a]"><Bot size={23} /></div><div><h1 className="text-base font-semibold tracking-tight sm:text-lg">Coach Invictus</h1><p className="mt-0.5 text-xs text-[#b2bbc7]">Your goals. A plan that fits.</p></div></div>
        <button type="button" aria-label="Open conversation history" onClick={() => setDrawerOpen(true)} className="icon-button lg:hidden"><History size={20} /></button>
        <span className="hidden items-center gap-2 text-xs text-[#b2bbc7] sm:flex"><Sparkles size={14} className="text-[#d4c17a]" /> Built around you</span>
      </header>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-7 sm:px-8" role="log" aria-label="Conversation" aria-live="polite" aria-busy={sending || messagesLoading}>
        <div className="mx-auto max-w-3xl">
          {(loading || messagesLoading) ? <div className="flex items-center justify-center gap-3 py-16 text-sm text-[#b2bbc7]"><Loader2 size={18} className="animate-spin" /> Loading your conversation…</div> : <>
            {!hasConversation && <div className="mx-auto max-w-xl py-4 sm:py-10"><p className="eyebrow mb-3">YOUR PERSONAL COACH</p><h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Make your next<br /><span className="text-[#d4c17a]">move count.</span></h2><p className="mt-4 max-w-md text-sm leading-7 text-[#b2bbc7]">Turn your training, nutrition, and trading goals into a practical next step. What’s on your mind?</p><div className="mt-7 space-y-2">{prompts.map(({ icon, title, text }) => <button key={title} type="button" disabled={!activeId || creating} onClick={() => { setInput(text); inputRef.current?.focus(); }} className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[#151a20] px-4 py-4 text-left text-sm transition hover:border-[#d4c17a]/40 hover:bg-[#1c232c] disabled:opacity-40">{icon}<span className="flex-1">{title}</span><ChevronRight size={16} className="text-[#b2bbc7]" /></button>)}</div></div>}
            <div className="space-y-6">{(hasConversation ? messages : []).map(message => <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
              {message.role === "assistant" && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#d4c17a]/10 text-[#d4c17a]"><Bot size={17} /></span>}
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:px-5 sm:py-4 ${message.role === "user" ? "rounded-tr-sm border border-[#d4c17a]/20 bg-[#d4c17a]/10" : "rounded-tl-sm border border-white/[0.07] bg-[#151a20]"}`}><p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b2bbc7]">{message.role === "user" ? "You" : "Coach Invictus"}</p><p className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p></div>
            </article>)}</div>
          </>}
          {sending && <div className="mt-6 flex items-center gap-3 text-sm text-[#b2bbc7]" role="status"><Loader2 size={18} className="animate-spin text-[#d4c17a]" /> Coach is thinking…</div>}
        </div>
      </div>
      <div className="shrink-0 border-t border-white/[0.07] bg-[#0d1014] px-4 pb-3 pt-3 sm:px-8 sm:pb-5">
        <div className="mx-auto max-w-3xl">
          {error && <p role="alert" className="mb-3 rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-xs leading-5 text-red-200">{error}</p>}
          <form onSubmit={send} className="flex items-end gap-2 rounded-2xl border border-white/[0.12] bg-[#151a20] p-2 focus-within:border-[#d4c17a]/60">
            <label htmlFor="coach-message" className="sr-only">Message Coach Invictus</label>
            <textarea id="coach-message" ref={inputRef} rows={2} value={input} disabled={sending} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} placeholder="What would you like to work on?" className="max-h-36 min-h-12 w-full resize-y border-0 bg-transparent px-3 py-2 text-base leading-6 text-[#f4f6f8] outline-none placeholder:text-[#7f8b9b] sm:text-sm" />
            <button type="submit" disabled={sending || !activeId || !input.trim() || creating || messagesLoading || messagesError} aria-label={sending ? "Sending message" : "Send message"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4c17a] text-[#0d1014] transition hover:bg-[#e4d393] disabled:cursor-not-allowed disabled:opacity-35">{sending ? <Loader2 size={19} className="animate-spin" /> : <ArrowUp size={21} />}</button>
          </form>
          <p className="mt-2 text-center text-[10px] leading-4 text-[#8c98a8]">Enter to send · Shift + Enter for a new line</p>
        </div>
      </div>
    </div>
    <dialog ref={drawerRef} onCancel={() => setDrawerOpen(false)} onClick={event => { if (event.target === event.currentTarget) setDrawerOpen(false); }} aria-labelledby="coach-history-title" className="m-0 h-dvh max-h-none w-[min(88vw,360px)] max-w-none border-r border-white/10 bg-[#151a20] p-5 text-[#f4f6f8] backdrop:bg-black/70">
      <div className="flex h-full flex-col"><div className="mb-6 flex items-center justify-between"><h2 id="coach-history-title" className="text-lg font-semibold">Conversations</h2><button type="button" className="icon-button" onClick={() => setDrawerOpen(false)} aria-label="Close conversation history"><X size={20} /></button></div><button type="button" disabled={creating || sending} onClick={newSession} className="button-primary mb-5 flex items-center justify-center gap-2"><Plus size={16} /> New session</button><div className="min-h-0 flex-1 overflow-y-auto"><SessionList {...listProps} /></div></div>
    </dialog>
    <dialog ref={deleteRef} onCancel={event => { if (deleting) event.preventDefault(); else setDeleteId(null); }} aria-labelledby="coach-delete-title" className="m-auto w-[calc(100%_-_40px)] max-w-sm rounded-2xl border border-white/10 bg-[#1c232c] p-6 text-[#f4f6f8] backdrop:bg-black/70"><h2 id="coach-delete-title" className="text-lg font-semibold">Delete this session?</h2><p className="mt-3 text-sm leading-6 text-[#b2bbc7]">This conversation will be removed from your history. This action cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button type="button" className="button-secondary" disabled={deleting} onClick={() => setDeleteId(null)}>Keep session</button><button type="button" disabled={deleting} onClick={deleteSession} className="rounded-xl bg-red-300 px-4 py-2 text-sm font-semibold text-[#151a20] disabled:opacity-50">{deleting ? "Deleting…" : "Delete"}</button></div></dialog>
  </section>;
}
