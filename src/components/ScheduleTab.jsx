import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, ChevronDown, PenSquare, Check, X } from "lucide-react";
import { collection, addDoc, deleteDoc, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

function timeData(value) {
  const [hour, minute] = value.split(":").map(Number);
  return { time: `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`, timeSort: hour * 60 + minute };
}
const field = "min-h-11 min-w-0 rounded-xl border border-white/10 bg-[#101419] px-3 text-sm text-white";
const iconButton = "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-[#d4c17a] disabled:opacity-40";
export default function ScheduleTab() {
  const [expanded, setExpanded] = useState(true);
  const [items, setItems] = useState([]);
  const [newLabel, setNewLabel] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editTime, setEditTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!auth.currentUser) throw new Error();
        const snapshot = await getDocs(query(collection(db, "users", auth.currentUser.uid, "schedule"), orderBy("timeSort")));
        if (active) setItems(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
      } catch { if (active) setError("Couldn't load your schedule. Refresh to try again."); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);
  async function mutate(action) {
    if (busy.current || loading) return;
    busy.current = true; setPending(true); setError("");
    try { if (!auth.currentUser) throw new Error(); await action(auth.currentUser.uid); }
    catch { setError("Couldn't save your schedule. Please try again."); }
    finally { busy.current = false; setPending(false); }
  }
  function add(event) {
    event.preventDefault();
    if (!newLabel.trim() || !newTime) return;
    mutate(async uid => {
      const item = { label: newLabel.trim(), ...timeData(newTime) };
      const result = await addDoc(collection(db, "users", uid, "schedule"), item);
      setItems(current => [...current, { ...item, id: result.id }].sort((a, b) => a.timeSort - b.timeSort));
      setNewLabel(""); setNewTime("");
    });
  }
  function edit(item) {
    setEditingId(item.id); setEditLabel(item.label);
    const [clock, period] = item.time.split(" ");
    const [hour, minute] = clock.split(":").map(Number);
    setEditTime(`${String((hour % 12) + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  function save(event, id) {
    event.preventDefault();
    if (!editLabel.trim() || !editTime) return;
    mutate(async uid => {
      const item = { label: editLabel.trim(), ...timeData(editTime) };
      await updateDoc(doc(db, "users", uid, "schedule", id), item);
      setItems(current => current.map(entry => entry.id === id ? { ...entry, ...item } : entry).sort((a, b) => a.timeSort - b.timeSort));
      setEditingId(null);
    });
  }
  return <section className="panel p-5 sm:p-6" aria-busy={loading || pending}>
    <h2><button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="daily-schedule" className="flex w-full items-center justify-between text-left text-[15px] font-semibold text-white">Your schedule<ChevronDown size={17} className={`text-gray-500 ${expanded ? "rotate-180" : ""}`} /></button></h2>
    <p className="mt-1 text-xs leading-5 text-gray-400">Give your priorities a place in the day.</p>
    {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    {expanded && <div id="daily-schedule" className="mt-5 space-y-4">
      {loading ? <p role="status" className="text-sm text-gray-400">Loading schedule…</p> : !items.length ? <p className="text-sm leading-6 text-gray-400">Your day, by design. Add a routine to get started.</p> : <ul className="space-y-2">{items.map(item => <li key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2">
        {editingId === item.id ? <form onSubmit={event => save(event, item.id)} className="flex flex-wrap items-center gap-2">
          <input aria-label="Routine name" required value={editLabel} onChange={event => setEditLabel(event.target.value)} disabled={pending} className={`${field} flex-1 basis-32`} />
          <input aria-label="Routine time" type="time" required value={editTime} onChange={event => setEditTime(event.target.value)} disabled={pending} className={`${field} w-32`} />
          <button type="submit" aria-label="Save routine" disabled={pending} className={iconButton}><Check size={16} /></button><button type="button" aria-label="Cancel editing routine" disabled={pending} onClick={() => setEditingId(null)} className={iconButton}><X size={16} /></button>
        </form> : <div className="flex items-center gap-2"><div className="min-w-0 flex-1 px-1"><p className="text-[11px] font-medium text-[#d4c17a]">{item.time}</p><p className="mt-1 break-words text-sm text-gray-200">{item.label}</p></div><button type="button" aria-label={`Edit routine: ${item.label}`} disabled={pending} onClick={() => edit(item)} className={iconButton}><PenSquare size={15} /></button><button type="button" aria-label={`Delete routine: ${item.label}`} disabled={pending} onClick={() => { if (window.confirm(`Delete "${item.label}" from your schedule?`)) mutate(async uid => { await deleteDoc(doc(db, "users", uid, "schedule", item.id)); setItems(current => current.filter(entry => entry.id !== item.id)); }); }} className={iconButton}><Trash2 size={15} /></button></div>}
      </li>)}</ul>}
      <form onSubmit={add} className="flex flex-wrap items-center gap-2"><input aria-label="New routine name" required value={newLabel} onChange={event => setNewLabel(event.target.value)} disabled={loading || pending} placeholder="Add a routine" className={`${field} flex-1 basis-36`} /><input aria-label="New routine time" type="time" required value={newTime} onChange={event => setNewTime(event.target.value)} disabled={loading || pending} className={`${field} w-32`} /><button type="submit" aria-label="Add routine" disabled={loading || pending || !newLabel.trim() || !newTime} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4c17a] text-black disabled:opacity-40"><Plus size={18} /></button></form>
      {pending && <p role="status" className="text-xs text-gray-400">Saving schedule…</p>}
    </div>}
  </section>;
}
