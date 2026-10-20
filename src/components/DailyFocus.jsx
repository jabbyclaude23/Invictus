import { useEffect, useState } from 'react';
import { Check, Compass, Moon, Timer, BatteryMedium } from 'lucide-react';
import { useCoach } from '../context/useCoach';
import { summarizeCheckins } from '../lib/performance';

const slots = priorities => Array.from({ length: 3 }, (_, index) => ({ text: priorities?.[index]?.text || '', done: Boolean(priorities?.[index]?.done) }));
const field = 'w-full rounded-xl border border-white/10 bg-[#101419] px-3 py-3 text-sm';
function Priorities({ record, pending, disabled, save }) {
  const [items, setItems] = useState(() => slots(record?.priorities));
  const [saved, setSaved] = useState(false);
  const source = JSON.stringify(record?.priorities || []);
  useEffect(() => { setItems(slots(JSON.parse(source))); }, [source]);
  const change = (index, text) => { setSaved(false); setItems(previous => previous.map((item, i) => i === index ? { ...item, text } : item)); };
  const toggle = async index => {
    const previous = items;
    const next = items.map((item, i) => i === index ? { ...item, done: !item.done } : item);
    setItems(next);
    if (!await save({ priorities: next })) setItems(previous);
  };
  return <form onSubmit={async event => { event.preventDefault(); setSaved(await save({ priorities: items })); }}>
    <div className="section-heading"><div><h2>Today's three priorities</h2><p>Choose the outcomes that would make today meaningful.</p></div><Compass size={20} className="text-gold" /></div>
    <div className="space-y-3">{items.map((item, index) => <div key={index} className="flex items-center gap-3">
      <input type="checkbox" checked={item.done} disabled={pending || disabled || !item.text.trim()} aria-label={`Complete priority ${index + 1}: ${item.text || 'not set'}`} onChange={() => toggle(index)} className="h-5 w-5 shrink-0 accent-[#d4c17a]" />
      <input aria-label={`Priority ${index + 1}`} maxLength={180} value={item.text} disabled={pending || disabled} onChange={event => change(index, event.target.value)} placeholder={['What matters most today?', 'What will move you forward?', 'What will you do for yourself?'][index]} className={`${field} ${item.done ? 'line-through text-gray-500' : ''}`} />
    </div>)}</div>
    <div className="mt-4 flex items-center justify-between gap-3"><span aria-live="polite" className="text-xs text-gray-400">{saved ? 'Priorities saved' : 'A clear day starts with a short list.'}</span><button disabled={pending || disabled} className="button-secondary">{pending ? 'Saving…' : 'Save priorities'}</button></div>
  </form>;
}
function Checkin({ record, pending, disabled, save }) {
  const [sleep, setSleep] = useState(record?.sleepHours ?? '');
  const [focus, setFocus] = useState(record?.focusMinutes ?? '');
  const [energy, setEnergy] = useState(record?.energy ?? '');
  const [reflection, setReflection] = useState(record?.reflection || '');
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSleep(record?.sleepHours ?? ''); setFocus(record?.focusMinutes ?? ''); setEnergy(record?.energy ?? ''); setReflection(record?.reflection || ''); }, [record?.sleepHours, record?.focusMinutes, record?.energy, record?.reflection]);
  return <form onChange={() => setSaved(false)} onSubmit={async event => { event.preventDefault(); setSaved(await save({ sleepHours: sleep, focusMinutes: focus, energy, reflection })); }}>
    <div className="section-heading"><div><h2>A quick check-in</h2><p>Notice your energy. Protect your attention. Reflect briefly.</p></div><BatteryMedium size={20} className="text-gold" /></div>
    <div className="grid grid-cols-2 gap-4">
      <label className="text-xs text-gray-400"><span className="mb-2 flex items-center gap-2"><Moon size={14} /> Sleep last night</span><div className="relative"><input aria-label="Sleep hours last night" type="number" min="0" max="24" step="0.25" value={sleep} onChange={event => setSleep(event.target.value)} disabled={pending || disabled} placeholder="Not logged" className={`${field} pr-12`} /><span className="absolute right-3 top-3.5 text-xs">hrs</span></div></label>
      <label className="text-xs text-gray-400"><span className="mb-2 flex items-center gap-2"><Timer size={14} /> Focused work today</span><div className="relative"><input aria-label="Focused work minutes today" type="number" min="0" max="1440" step="1" value={focus} onChange={event => setFocus(event.target.value)} disabled={pending || disabled} placeholder="Not logged" className={`${field} pr-12`} /><span className="absolute right-3 top-3.5 text-xs">min</span></div></label>
    </div>
    <fieldset className="mt-5"><legend className="mb-3 text-xs text-gray-400">How is your energy?</legend><div className="grid grid-cols-5 gap-2">{['Low', 'Below usual', 'Steady', 'Good', 'High'].map((label, i) => <label key={label} className={`cursor-pointer rounded-xl border p-2 text-center ${Number(energy) === i + 1 ? 'border-gold/50 bg-gold/10 text-gold' : 'border-white/10 text-gray-400'}`}><input className="sr-only peer" type="radio" name="daily-energy" value={i + 1} checked={Number(energy) === i + 1} disabled={pending || disabled} onChange={() => setEnergy(i + 1)} aria-label={`Energy ${i + 1}: ${label}`} /><span className="block rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold"><strong className="text-sm">{i + 1}</strong><span className="mt-1 block text-[9px] leading-4">{label}</span></span></label>)}</div></fieldset>
    <label className="mt-5 block text-xs text-gray-400">What helped today, or what got in the way?<textarea aria-label="Daily reflection" rows={2} maxLength={1500} value={reflection} onChange={event => setReflection(event.target.value)} disabled={pending || disabled} placeholder="A short note for you and your coach…" className={`${field} mt-2 resize-y`} /></label>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span aria-live="polite" className="text-xs text-gray-400">{saved ? 'Check-in saved' : 'Only log what is useful to you.'}</span><button disabled={pending || disabled} className="button-secondary"><Check size={15} />{pending ? 'Saving…' : 'Save check-in'}</button></div>
  </form>;
}
export function PerformanceSnapshot() {
  const { context } = useCoach();
  const records = context?.dailyCheckins || [];
  const summary = summarizeCheckins(records);
  return <section className="panel performance-snapshot"><div className="section-heading"><div><h2>Your last seven days</h2><p>See how your focus, rest, and priorities are developing.</p></div><span className="text-xs text-gray-400">{summary.days} {summary.days === 1 ? 'day' : 'days'} logged</span></div>
    <div className="performance-grid">{[
      { label: 'Focused work', value: summary.focusMinutes ?? '—', unit: summary.focusMinutes == null ? 'Not logged yet' : 'min total', icon: Timer },
      { label: 'Sleep', value: summary.averageSleep ?? '—', unit: summary.averageSleep == null ? 'Not logged yet' : 'hrs / night logged', icon: Moon },
      { label: 'Energy', value: summary.averageEnergy ?? '—', unit: summary.averageEnergy == null ? 'Not logged yet' : 'out of 5, average', icon: BatteryMedium },
      { label: 'Priorities finished', value: summary.prioritiesTotal ? `${summary.prioritiesDone}/${summary.prioritiesTotal}` : '—', unit: summary.prioritiesTotal ? 'of the priorities you set' : 'Set your first priorities', icon: Compass },
    ].map(({ label, value, unit, icon: Icon }) => <div key={label} className="performance-metric"><div className="flex items-center gap-2 text-xs text-gray-400"><Icon size={15} />{label}</div><strong>{value}</strong><span>{unit}</span></div>)}</div>
  </section>;
}
export default function DailyFocus({ focus }) {
  return <section className="panel daily-focus-panel" aria-busy={focus.loading || focus.pending}>
    {focus.error && <div role="alert" className="status-error"><span>{focus.error}</span><button className="button-secondary" onClick={focus.retry}>Try again</button></div>}
    {focus.loading ? <p role="status" className="text-sm text-gray-400">Loading your daily focus…</p> : <div className="daily-focus-grid"><Priorities key={`priorities-${focus.date}`} record={focus.data} pending={focus.pending} disabled={!focus.loaded} save={focus.save} /><Checkin key={`checkin-${focus.date}`} record={focus.data} pending={focus.pending} disabled={!focus.loaded} save={focus.save} /></div>}
  </section>;
}
