import { useState } from 'react';
import { BarChart3, Minus, Plus, Trash2, Pencil, Check } from 'lucide-react';
import StatDetailModal from './StatDetailModal';
import { getIcon } from '../data/iconMap';

export default function StatCard({ stat, onUpdate, onDelete, pending }) {
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const value = Number(stat.value) || 0;
  const save = async event => {
    event.preventDefault();
    if (draft.trim() === '' || !Number.isFinite(Number(draft))) return;
    const saved = await onUpdate(stat.id, Number(draft));
    if (saved) setEditing(false);
  };
  return <>
    <article className="stat-tile">
      <div className="flex items-center gap-2 text-sm"><span className="text-gold">{getIcon(stat)}</span><h3 className="flex-1 font-semibold">{stat.name}</h3><button className="icon-button" onClick={() => setHistory(true)} aria-label={`History for ${stat.name}`}><BarChart3 size={16} /></button><button className="icon-button destructive" disabled={pending} onClick={() => onDelete(stat.id)} aria-label={`Delete ${stat.name}`}><Trash2 size={15} /></button></div>
      <div className="flex items-center justify-between gap-2 mt-3">
        {editing ? <form onSubmit={save} className="flex items-center gap-2 min-w-0"><input aria-label={`Value for ${stat.name}`} type="number" step="any" required value={draft} onChange={e => setDraft(e.target.value)} className="w-24 rounded-lg bg-accent px-2 py-1" autoFocus /><button className="icon-button" aria-label="Save stat" disabled={pending}><Check size={17} /></button><button type="button" className="text-xs text-gray-400" onClick={() => setEditing(false)}>Cancel</button></form> : <button className="stat-value" onClick={() => { setDraft(String(value)); setEditing(true); }} aria-label={`Edit ${stat.name}, current value ${value}`}>{value.toLocaleString()}<Pencil size={12} /></button>}
        {!editing && <div className="habit-stepper"><button disabled={pending} aria-label={`Decrease ${stat.name}`} onClick={() => onUpdate(stat.id, value - 1)}><Minus size={14} /></button><button disabled={pending} aria-label={`Increase ${stat.name}`} onClick={() => onUpdate(stat.id, value + 1)}><Plus size={14} /></button></div>}
      </div>
    </article>
    {history && <StatDetailModal stat={stat} onClose={() => setHistory(false)} />}
  </>;
}
