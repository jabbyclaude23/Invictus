import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Archive, Trash2, Check, RotateCcw, X, Flag } from "lucide-react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import useDialog from "../hooks/useDialog";

const field = "mt-2 w-full rounded-xl border border-white/10 bg-[#101419] px-3 py-3 text-sm text-white";
const titleOf = goal => goal.name || goal.title || "Untitled goal";
const statusOf = goal => goal.status || (Number(goal.target) > 0 && Number(goal.progress) >= Number(goal.target) ? "achieved" : "active");

function GoalForm({ goal, onClose, onSave, pending, error }) {
  const [name, setName] = useState(goal ? titleOf(goal) : "");
  const [why, setWhy] = useState(goal?.why || "");
  const [nextAction, setNextAction] = useState(goal?.nextAction || "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate || "");
  const dialog = useDialog(pending ? null : onClose);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-5 py-6 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="goal-form-title" aria-busy={pending} className="panel w-full max-w-lg overflow-y-auto">
      <div className="section-heading"><h2 id="goal-form-title">{goal ? "Edit your goal" : "What are you working toward?"}</h2><button type="button" disabled={pending} onClick={onClose} aria-label="Close goal form" className="icon-button"><X size={18} /></button></div>
      <form onSubmit={event => { event.preventDefault(); if (name.trim()) onSave({ name: name.trim(), why: why.trim(), nextAction: nextAction.trim(), targetDate }); }} className="space-y-4">
        <label className="block text-xs text-gray-300">What do you want to achieve?<textarea required maxLength={600} rows={2} value={name} onChange={event => setName(event.target.value)} disabled={pending} className={field} placeholder="Write a goal in your own words" /></label>
        <label className="block text-xs text-gray-300">Why it matters <span className="text-gray-500">(optional)</span><textarea maxLength={1200} rows={2} value={why} onChange={event => setWhy(event.target.value)} disabled={pending} className={field} placeholder="What would this change for you?" /></label>
        <label className="block text-xs text-gray-300">Your next small action <span className="text-gray-500">(optional)</span><input maxLength={600} value={nextAction} onChange={event => setNextAction(event.target.value)} disabled={pending} className={field} placeholder="One step you can take from here" /></label>
        <label className="block text-xs text-gray-300">Target date <span className="text-gray-500">(optional)</span><input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} disabled={pending} className={field} /></label>
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3 pt-2"><button type="button" className="button-secondary" disabled={pending} onClick={onClose}>Cancel</button><button type="submit" className="button-primary" disabled={pending || !name.trim()}>{pending ? "Saving…" : goal ? "Save goal" : "Add goal"}</button></div>
      </form>
    </section>
  </div>;
}

export default function GoalTracker() {
  const [uid, setUid] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState(null);
  const busy = useRef(false);
  useEffect(() => auth.onAuthStateChanged(user => {
    setUid(user?.uid || null); setGoals([]); setEditing(null); setError(""); setLoading(Boolean(user));
  }), []);
  useEffect(() => {
    if (!uid) return;
    let active = true;
    setLoading(true); setError("");
    getDocs(query(collection(db, "users", uid, "goals"), orderBy("createdAt")))
      .then(snapshot => { if (active) setGoals(snapshot.docs.map(item => ({ ...item.data(), id: item.id }))); })
      .catch(() => { if (active) setError("Your goals couldn't be loaded. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uid, attempt]);

  async function mutate(operation) {
    if (busy.current || loading || !uid) return false;
    if (auth.currentUser?.uid !== uid) { setError("Please sign in again before changing your goals."); return false; }
    busy.current = true; setPending(true); setError("");
    try {
      await operation(uid);
      return true;
    } catch {
      if (auth.currentUser?.uid === uid) setError("Your goal couldn't be saved. Please try again.");
      return false;
    } finally { busy.current = false; setPending(false); }
  }
  function update(goal, changes) {
    return mutate(async account => {
      const patch = { ...changes, updatedAt: new Date() };
      await updateDoc(doc(db, "users", account, "goals", goal.id), patch);
      if (auth.currentUser?.uid === account) setGoals(current => current.map(item => item.id === goal.id ? { ...item, ...patch } : item));
    });
  }
  async function save(details) {
    if (editing?.id) {
      if (await update(editing, details)) setEditing(null);
    } else {
      const saved = await mutate(async account => {
        const item = { ...details, status: "active", createdAt: new Date(), updatedAt: new Date() };
        const result = await addDoc(collection(db, "users", account, "goals"), item);
        if (auth.currentUser?.uid === account) setGoals(current => [...current, { ...item, id: result.id }]);
      });
      if (saved) setEditing(null);
    }
  }
  const visibleGoals = goals.filter(goal => showArchived || !goal.archived);
  return <section className="panel goals-panel" aria-labelledby="goals-title" aria-busy={loading || pending}>
    <div className="section-heading"><div><h2 id="goals-title">Goals</h2><p>A direction that matters to you. A next step you can take.</p></div><button type="button" className="button-secondary" disabled={loading || pending || !uid} onClick={() => { setError(""); setEditing({}); }}><Plus size={16} />Add goal</button></div>
    {error && !editing && <div role="alert" className="status-error"><span>{error}</span><button type="button" className="button-secondary" disabled={pending} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
    {loading ? <p role="status" className="py-6 text-sm text-gray-400">Loading your goals…</p> : !uid ? <p className="text-sm text-gray-400">Sign in to keep your goals here.</p> : !visibleGoals.length ? <div className="empty-state"><span className="empty-icon"><Flag size={22} /></span><h3>{goals.length ? "Your goals are archived" : "Make room for what matters"}</h3><p>{goals.length ? "Show archived goals to revisit them, or start a new one." : "Write what you're trying to achieve. You can figure out the details as you go."}</p><button type="button" className="button-secondary" onClick={() => { setError(""); setEditing({}); }}>Write a goal</button></div> : <ul className="grid gap-4 md:grid-cols-2">{visibleGoals.map(goal => {
      const achieved = statusOf(goal) === "achieved";
      const legacy = Number(goal.target) > 0;
      return <li key={goal.id} className="rounded-xl border border-white/[0.08] bg-white/[0.015] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className={`text-[10px] font-semibold uppercase tracking-wider ${achieved ? "text-emerald-300" : "text-gold"}`}>{goal.archived ? "Archived" : achieved ? "Achieved" : "Active goal"}</span>{goal.targetDate && <time dateTime={goal.targetDate} className="text-xs text-gray-400">By {new Date(`${goal.targetDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>}</div>
        <h3 className="whitespace-pre-wrap break-words text-base font-semibold leading-7 text-white">{titleOf(goal)}</h3>
        {goal.why && <div className="mt-4"><p className="text-[10px] uppercase tracking-wider text-gray-500">Why it matters</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-300">{goal.why}</p></div>}
        {goal.nextAction && <div className="mt-4 rounded-lg bg-[#d4c17a]/5 p-3"><p className="text-[10px] uppercase tracking-wider text-gold">Next small action</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-200">{goal.nextAction}</p></div>}
        {legacy && <p className="mt-4 text-xs text-gray-400">Existing tracked progress: <span className="text-gray-200">{goal.progress ?? 0} / {goal.target}</span></p>}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
          {!goal.archived && <button type="button" disabled={pending} onClick={() => update(goal, { status: achieved ? "active" : "achieved" })} className="button-secondary">{achieved ? <RotateCcw size={14} /> : <Check size={14} />}{achieved ? "Reopen" : "Mark achieved"}</button>}
          <button type="button" className="icon-button" disabled={pending} aria-label={`Edit goal: ${titleOf(goal)}`} onClick={() => { setError(""); setEditing(goal); }}><Pencil size={15} /></button>
          <button type="button" className="icon-button" disabled={pending} aria-label={`${goal.archived ? "Restore" : "Archive"} goal: ${titleOf(goal)}`} onClick={() => update(goal, { archived: !goal.archived })}>{goal.archived ? <RotateCcw size={15} /> : <Archive size={15} />}</button>
          <button type="button" className="icon-button destructive ml-auto" disabled={pending} aria-label={`Delete goal: ${titleOf(goal)}`} onClick={() => { if (window.confirm(`Delete "${titleOf(goal)}"? This cannot be undone.`)) mutate(async account => { await deleteDoc(doc(db, "users", account, "goals", goal.id)); if (auth.currentUser?.uid === account) setGoals(current => current.filter(item => item.id !== goal.id)); }); }}><Trash2 size={15} /></button>
        </div>
      </li>;
    })}</ul>}
    {goals.some(goal => goal.archived) && <button type="button" className="mt-5 text-xs text-gray-400 hover:text-white" aria-pressed={showArchived} onClick={() => setShowArchived(value => !value)}>{showArchived ? "Hide archived goals" : `Show archived goals (${goals.filter(goal => goal.archived).length})`}</button>}
    {pending && <p role="status" className="mt-4 text-xs text-gold">Saving your goal…</p>}
    {editing && <GoalForm key={`${uid}-${editing.id || "new"}`} goal={editing.id ? editing : null} onClose={() => setEditing(null)} onSave={save} pending={pending} error={error} />}
  </section>;
}
