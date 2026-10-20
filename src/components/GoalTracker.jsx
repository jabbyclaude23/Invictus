import { useEffect, useRef, useState } from "react";
import { Plus, Minus, Trash2, Edit2, Check, ChevronDown, X } from "lucide-react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";

const iconButton = "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] text-gray-400 hover:bg-white/5 hover:text-[#d4c17a] disabled:opacity-30";
const field = "min-h-11 min-w-0 rounded-xl border border-white/10 bg-[#101419] px-3 text-sm text-white";
export default function GoalTracker() {
  const [goals, setGoals] = useState([]);
  const [newGoal, setNewGoal] = useState("");
  const [target, setTarget] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [tempProgress, setTempProgress] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!auth.currentUser) throw new Error();
        const snapshot = await getDocs(query(collection(db, "users", auth.currentUser.uid, "goals"), orderBy("createdAt")));
        if (active) setGoals(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
      } catch { if (active) setError("Couldn't load your goals. Refresh to try again."); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);
  async function mutate(action) {
    if (busy.current || loading) return;
    busy.current = true; setPending(true); setError("");
    try { if (!auth.currentUser) throw new Error(); await action(auth.currentUser.uid); }
    catch { setError("Couldn't save your goal. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  function add(event) {
    event.preventDefault();
    const number = Number(target);
    if (!newGoal.trim()) { setError("Give your goal a name."); return; }
    if (!Number.isFinite(number) || number <= 0) { setError("Choose a target greater than zero."); return; }
    mutate(async uid => {
      const item = { name: newGoal.trim(), progress: 0, target: number, createdAt: new Date() };
      const result = await addDoc(collection(db, "users", uid, "goals"), item);
      setGoals(current => [...current, { ...item, id: result.id }]);
      setNewGoal(""); setTarget("");
    });
  }
  function changeProgress(goal, value) {
    const number = Number(value);
    if (value === "" || !Number.isFinite(number) || number < 0 || number > goal.target) {
      setError(`Enter progress between 0 and ${goal.target}.`); return;
    }
    mutate(async uid => {
      await updateDoc(doc(db, "users", uid, "goals", goal.id), { progress: number });
      setGoals(current => current.map(item => item.id === goal.id ? { ...item, progress: number } : item));
      setEditingId(null);
    });
  }
  return <section className="panel p-5 sm:p-6" aria-busy={loading || pending}>
    <h2><button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="mini-goals" className="flex w-full items-center justify-between text-left text-[15px] font-semibold text-white">Mini goals<ChevronDown size={17} className={`text-gray-500 ${expanded ? "rotate-180" : ""}`} /></button></h2>
    <p className="mt-1 text-xs leading-5 text-gray-400">Turn a bigger ambition into measurable steps.</p>
    {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    {expanded && <div id="mini-goals" className="mt-5 space-y-4">
      {loading ? <p role="status" className="text-sm text-gray-400">Loading goals…</p> : !goals.length ? <p className="text-sm leading-6 text-gray-400">Start small. Name a goal and set a target to track.</p> : <ul className="grid gap-3 sm:grid-cols-2">{goals.map(goal => {
        const progress = Number(goal.progress) || 0;
        const goalTarget = Number(goal.target);
        const percent = goalTarget > 0 ? Math.max(0, Math.min(progress / goalTarget * 100, 100)) : 0;
        return <li key={goal.id} className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-start justify-between gap-2"><h3 className="break-words text-sm font-medium leading-6 text-gray-200">{goal.name}</h3><button type="button" aria-label={`Delete goal: ${goal.name}`} disabled={pending} onClick={() => { if (window.confirm(`Delete "${goal.name}" and its progress?`)) mutate(async uid => { await deleteDoc(doc(db, "users", uid, "goals", goal.id)); setGoals(current => current.filter(item => item.id !== goal.id)); if (editingId === goal.id) setEditingId(null); }); }} className="flex h-7 w-7 shrink-0 items-center justify-center text-gray-500 hover:text-red-300 disabled:opacity-40"><Trash2 size={14} /></button></div>
          <div className="my-3 flex items-center justify-between gap-3 text-xs"><span className={percent >= 100 ? "text-emerald-300" : "text-gray-400"}>{percent >= 100 ? "Complete" : "In progress"}</span><span className="tabular-nums text-[#d4c17a]">{progress} / {goal.target}</span></div>
          <progress aria-label={`${goal.name} progress`} value={percent} max={100} className="h-1.5 w-full accent-[#d4c17a]" />
          {editingId === goal.id ? <form onSubmit={event => { event.preventDefault(); changeProgress(goal, tempProgress); }} className="mt-4 flex gap-2"><input aria-label={`Progress for ${goal.name}`} type="number" min="0" max={goal.target} step="any" required value={tempProgress} onChange={event => setTempProgress(event.target.value)} disabled={pending} className={`${field} w-full flex-1`} /><button type="submit" aria-label="Save goal progress" disabled={pending} className={iconButton}><Check size={15} /></button><button type="button" aria-label="Cancel editing goal" disabled={pending} onClick={() => setEditingId(null)} className={iconButton}><X size={15} /></button></form> : <div className="mt-4 flex items-center gap-2"><button type="button" aria-label={`Decrease ${goal.name} progress by one`} disabled={pending || progress <= 0 || goalTarget <= 0} onClick={() => changeProgress(goal, Math.max(0, progress - 1))} className={iconButton}><Minus size={15} /></button><button type="button" aria-label={`Increase ${goal.name} progress by one`} disabled={pending || progress >= goalTarget || goalTarget <= 0} onClick={() => changeProgress(goal, Math.min(goalTarget, progress + 1))} className={iconButton}><Plus size={15} /></button><button type="button" aria-label={`Edit ${goal.name} progress`} disabled={pending} onClick={() => { setEditingId(goal.id); setTempProgress(String(progress)); }} className="ml-auto flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs text-gray-400 hover:text-[#d4c17a] disabled:opacity-40"><Edit2 size={13} />Edit</button></div>}
        </li>;
      })}</ul>}
      <form onSubmit={add} className="flex flex-wrap gap-2"><input aria-label="New goal name" required value={newGoal} onChange={event => setNewGoal(event.target.value)} disabled={loading || pending} placeholder="Name your next goal" className={`${field} flex-1 basis-36`} /><input aria-label="Goal target, greater than zero" type="number" required min="0.00000001" step="any" value={target} onChange={event => setTarget(event.target.value)} disabled={loading || pending} placeholder="Target" className={`${field} w-24`} /><button type="submit" aria-label="Add goal" disabled={loading || pending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4c17a] text-black disabled:opacity-40"><Plus size={18} /></button></form>
      {pending && <p role="status" className="text-xs text-gray-400">Saving goal…</p>}
    </div>}
  </section>;
}
