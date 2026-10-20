import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";

export default function TodoList() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
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
        const snapshot = await getDocs(query(collection(db, "users", auth.currentUser.uid, "todos"), orderBy("createdAt")));
        if (active) setTasks(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
      } catch { if (active) setError("Couldn't load your tasks. Refresh to try again."); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);
  async function mutate(action) {
    if (busy.current || loading) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      if (!auth.currentUser) throw new Error();
      await action(auth.currentUser.uid);
    } catch { setError("Couldn't save that change. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  function add(event) {
    event.preventDefault();
    if (!newTask.trim()) return;
    mutate(async uid => {
      const item = { text: newTask.trim(), done: false, createdAt: new Date() };
      const result = await addDoc(collection(db, "users", uid, "todos"), item);
      setTasks(current => [...current, { ...item, id: result.id }]);
      setNewTask("");
    });
  }
  const done = tasks.filter(task => task.done).length;
  return <section className="panel p-5 sm:p-6" aria-busy={loading || pending}>
    <h2><button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="daily-tasks" className="flex w-full items-center justify-between text-left text-[15px] font-semibold text-white">Daily tasks<ChevronDown size={17} className={`text-gray-500 ${expanded ? "rotate-180" : ""}`} /></button></h2>
    <p className="mt-1 text-xs leading-5 text-gray-400">Clear the small things. Keep your day moving.</p>
    {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    {expanded && <div id="daily-tasks" className="mt-5 space-y-4">
      {loading ? <p role="status" className="text-sm text-gray-400">Loading tasks…</p> : tasks.length ? <>
        <div className="flex items-center justify-between text-xs text-gray-400"><span>{done} of {tasks.length} complete</span><span>{Math.round(done / tasks.length * 100)}%</span></div>
        <progress aria-label="Task completion" value={done} max={tasks.length} className="h-1 w-full accent-[#d4c17a]" />
        <ul className="space-y-2">{tasks.map(task => <li key={task.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] pl-3 pr-1">
          <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2"><input type="checkbox" checked={task.done} disabled={pending} onChange={() => mutate(async uid => { await updateDoc(doc(db, "users", uid, "todos", task.id), { done: !task.done }); setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !task.done } : item)); })} className="h-4 w-4 shrink-0 accent-[#d4c17a]" /><span className={`break-words text-sm ${task.done ? "text-gray-500 line-through" : "text-gray-200"}`}>{task.text}</span></label>
          <button type="button" aria-label={`Delete task: ${task.text}`} disabled={pending} onClick={() => { if (window.confirm(`Delete "${task.text}"?`)) mutate(async uid => { await deleteDoc(doc(db, "users", uid, "todos", task.id)); setTasks(current => current.filter(item => item.id !== task.id)); }); }} className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-500 hover:text-red-300 disabled:opacity-40"><Trash2 size={15} /></button>
        </li>)}</ul>
      </> : <p className="text-sm leading-6 text-gray-400">A clear slate. Add your first task below.</p>}
      <form onSubmit={add} className="flex gap-2"><input aria-label="New task" required value={newTask} onChange={event => setNewTask(event.target.value)} disabled={loading || pending} placeholder="What needs your attention?" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#101419] px-3 py-3 text-sm text-white placeholder:text-gray-500" /><button type="submit" aria-label="Add task" disabled={loading || pending || !newTask.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#d4c17a] text-black disabled:opacity-40"><Plus size={18} /></button></form>
      {pending && <p role="status" className="text-xs text-gray-400">Saving task…</p>}
    </div>}
  </section>;
}
