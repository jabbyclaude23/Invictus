import { useEffect, useId, useState } from 'react';
import { BarChart3, Trash2, Pencil, Check, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../firebase';
import StatDetailModal from './StatDetailModal';
import { measurementStatus } from '../lib/performance';
import { legacyHabitDayKey } from '../lib/dashboard';

export function MeasurementFields({ unit, setUnit, target, setTarget, direction, setDirection, disabled }) {
  const unitList = useId();
  return <div className="grid grid-cols-2 gap-3">
    <label className="text-xs text-gray-400">Unit<input aria-label="Measurement unit" maxLength={24} value={unit} onChange={event => setUnit(event.target.value)} list={unitList} placeholder="lbs, steps, hours…" disabled={disabled} className="mt-2 w-full rounded-lg border border-white/10 bg-accent px-3 py-2" /><datalist id={unitList}>{['lbs','kg','steps','hours','minutes','USD','pages','sessions'].map(value => <option key={value} value={value} />)}</datalist></label>
    <label className="text-xs text-gray-400">Target <span className="text-gray-500">(optional)</span><input aria-label="Measurement target" type="number" step="any" value={target} onChange={event => setTarget(event.target.value)} placeholder="No target" disabled={disabled} className="mt-2 w-full rounded-lg border border-white/10 bg-accent px-3 py-2" /></label>
    <label className="col-span-2 text-xs text-gray-400">What are you aiming for?<select aria-label="Measurement direction" value={direction} onChange={event => setDirection(event.target.value)} disabled={disabled} className="mt-2 w-full rounded-lg border border-white/10 bg-accent px-3 py-2"><option value="track">Just observe this measurement</option><option value="increase">Build toward a higher value</option><option value="decrease">Work toward a lower value</option></select></label>
  </div>;
}
export default function StatCard({ stat, onUpdate, onDelete, pending }) {
  const [draft, setDraft] = useState('');
  const [unit, setUnit] = useState(stat.unit || '');
  const [target, setTarget] = useState(stat.target ?? '');
  const [direction, setDirection] = useState(stat.direction || 'track');
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const [previous, setPrevious] = useState(null);
  const [historyError, setHistoryError] = useState(false);
  const value = Number(stat.value) || 0;
  useEffect(() => {
    if (!auth.currentUser) return;
    let active = true;
    const today = legacyHabitDayKey();
    getDocs(query(collection(db,'users',auth.currentUser.uid,'stats',stat.id,'history'),orderBy('date','desc'),limit(14))).then(snapshot => {
      const rows = snapshot.docs.map(item => item.data()).filter(row => row.date < today && Number.isFinite(Number(row.value)) && (row.unit || '') === (stat.unit || '')).sort((a,b) => String(b.date).localeCompare(String(a.date)));
      if(active) { setPrevious(rows[0]?.value ?? null); setHistoryError(false); }
    }).catch(() => { if(active) setHistoryError(true); });
    return () => { active = false; };
  }, [stat.id, stat.value, stat.unit]);
  const status = measurementStatus(stat, previous);
  const startEditing = () => { setDraft(String(value)); setUnit(stat.unit || ''); setTarget(stat.target ?? ''); setDirection(stat.direction || 'track'); setEditing(true); };
  const save = async event => {
    event.preventDefault();
    if (draft.trim() === '' || !Number.isFinite(Number(draft)) || (target !== '' && !Number.isFinite(Number(target)))) return;
    if (await onUpdate(stat.id, Number(draft), { unit:unit.trim(),target:target === '' ? null : Number(target),direction })) setEditing(false);
  };
  const helpful = status.delta != null && (stat.direction === 'decrease' ? status.delta < 0 : stat.direction === 'increase' ? status.delta > 0 : false);
  return <>
    <article className="stat-tile">
      <div className="flex items-center gap-2"><h3 className="flex-1 text-sm font-semibold">{stat.name}</h3><button className="icon-button" onClick={() => setHistory(true)} aria-label={`History for ${stat.name}`}><BarChart3 size={16} /></button><button className="icon-button destructive" disabled={pending} onClick={() => onDelete(stat.id)} aria-label={`Delete ${stat.name}`}><Trash2 size={15} /></button></div>
      {editing ? <form onSubmit={save} className="mt-4 space-y-4"><label className="block text-xs text-gray-400">Current value<input aria-label={`Value for ${stat.name}`} type="number" step="any" required value={draft} onChange={event => setDraft(event.target.value)} disabled={pending} className="mt-2 w-full rounded-lg border border-white/10 bg-accent px-3 py-2" autoFocus /></label><MeasurementFields {...{unit,setUnit,target,setTarget,direction,setDirection}} disabled={pending} /><div className="flex justify-end gap-2"><button type="button" disabled={pending} className="button-secondary" onClick={() => setEditing(false)}>Cancel</button><button className="button-primary" disabled={pending}><Check size={15} />{pending ? 'Saving…':'Save value'}</button></div></form> : <>
        <div className="mt-3 flex flex-wrap items-end gap-x-2"><strong className="text-3xl font-semibold tabular-nums tracking-tight">{value.toLocaleString()}</strong><span className="pb-1 text-xs text-gray-400">{stat.unit || 'unit not set'}</span></div>
        {status.delta != null && <p className={`mt-2 flex items-center gap-1 text-xs ${helpful ? 'text-emerald-300':'text-gray-400'}`}>{status.delta < 0 ? <ArrowDownRight size={14} />:<ArrowUpRight size={14} />}{status.delta === 0 ? 'Unchanged from the previous day recorded' : `${Math.abs(status.delta).toLocaleString()} ${stat.unit || ''} ${status.delta < 0 ? 'lower' : 'higher'} than the previous day recorded`}</p>}
        {historyError && <p className="mt-2 text-xs text-gray-400">Comparison unavailable. Your current value is shown.</p>}
        {status.target != null && <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.025] px-3 py-2 text-xs text-gray-400"><span>Target: {status.target.toLocaleString()} {stat.unit || ''}</span><span className={`mt-1 block ${status.reached ? 'text-emerald-300':'text-gold'}`}>{status.reached ? 'Target reached' : `${status.remaining.toLocaleString()} ${stat.unit || ''} from your target`}</span></div>}
        <button className="button-secondary mt-4 w-full" disabled={pending} onClick={startEditing}><Pencil size={14} />Log value</button>
      </>}
    </article>
    {history && <StatDetailModal stat={stat} onClose={() => setHistory(false)} />}
  </>;
}
