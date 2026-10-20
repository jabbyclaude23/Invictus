import { useState } from 'react';
import { BarChart3, Check, Minus, Plus, Pencil, Trash2 } from 'lucide-react';
import HabitDetailModal from './HabitDetailModal';
import { getIcon } from '../data/iconMap';

export default function HabitCard({ habit, onUpdate, onDelete, onEdit, pending }) {
  const [showHistory, setShowHistory] = useState(false);
  const target = Number(habit.target) || 1;
  const progress = Number(habit.progress) || 0;
  const complete = progress >= target;
  return <>
    <article className={`habit-row ${complete ? 'is-complete' : ''}`}>
      <div className="habit-main">
        {!habit.target ? <button className="habit-check" disabled={pending} onClick={() => onUpdate(habit.id, complete ? 0 : 1)} aria-label={`${complete ? 'Reopen' : 'Complete'} ${habit.name}`} aria-pressed={complete}>{complete && <Check size={17} />}</button> : <span className="habit-symbol">{getIcon(habit)}</span>}
        <div className="min-w-0"><h3>{habit.name}</h3>{habit.description && <p>{habit.description}</p>}{habit.target && <span className="text-xs text-gray-400">{progress} / {target} completed</span>}</div>
      </div>
      <div className="habit-tools">
        {habit.target && <div className="habit-stepper"><button aria-label={`Decrease ${habit.name}`} disabled={pending || progress <= 0} onClick={() => onUpdate(habit.id, Math.max(0, progress - 1))}><Minus size={14} /></button><span>{progress}</span><button aria-label={`Increase ${habit.name}`} disabled={pending} onClick={() => onUpdate(habit.id, progress + 1)}><Plus size={14} /></button></div>}
        <button className="icon-button" aria-label={`History for ${habit.name}`} onClick={() => setShowHistory(true)}><BarChart3 size={16} /></button>
        <button className="icon-button" aria-label={`Edit ${habit.name}`} onClick={() => onEdit(habit)}><Pencil size={15} /></button>
        <button className="icon-button destructive" disabled={pending} aria-label={`Delete ${habit.name}`} onClick={() => onDelete(habit.id)}><Trash2 size={15} /></button>
      </div>
    </article>
    {showHistory && <HabitDetailModal habit={habit} onClose={() => setShowHistory(false)} />}
  </>;
}
