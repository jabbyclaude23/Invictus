import { useState } from 'react';
import { collection, doc, updateDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { dayOfWeek } from '../lib/planningTime';
import ReminderSettings from './ReminderSettings';
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const STARTERS=[
  {name:'Morning direction',time:'08:00',durationMinutes:15,days:[0,1,2,3,4,5,6],steps:['Choose a meaningful goal for today','Pick the next concrete action','Review today’s schedule']},
  {name:'Trading preparation',time:'09:15',durationMinutes:15,days:[1,2,3,4,5],steps:['Review my written trading rules','Mark the levels I am watching','Confirm my risk and allowed time window']},
  {name:'Evening reset',time:'20:30',durationMinutes:15,days:[0,1,2,3,4,5,6],steps:['Review what I finished','Move unfinished work deliberately','Prepare one thing for tomorrow']},
];
export default function RoutinesPanel({data}) {
  const [editing,setEditing]=useState(null),[name,setName]=useState(''),[time,setTime]=useState('08:00'),[duration,setDuration]=useState(15),[days,setDays]=useState([0,1,2,3,4,5,6]),[steps,setSteps]=useState('');
  const [open,setOpen]=useState(new URLSearchParams(location.search).get('routine'));
  function edit(routine){setEditing(routine.id);setName(routine.name);setTime(routine.time);setDuration(routine.durationMinutes);setDays(routine.days);setSteps(routine.steps.map(step=>typeof step==='string'?step:step.text).join('\n'));}
  async function save(event){event.preventDefault();const items=steps.split('\n').map(text=>text.trim()).filter(Boolean).slice(0,20);if(!items.length||!days.length)return;
    const saved=await data.mutate(uid=>{const reference=editing?doc(db,'users',uid,'routines',editing):doc(collection(db,'users',uid,'routines'));const batch=writeBatch(db);batch.set(reference,{name:name.trim(),time,durationMinutes:Number(duration),days,steps:items,...(!editing?{enabled:true,remind:true,createdAt:new Date()}:{}),updatedAt:new Date()},{merge:true});if(editing)batch.set(doc(db,'users',uid,'routine_logs',data.day),{[editing]:{ticks:{},completed:false}},{merge:true});return batch.commit();});
    if(saved){setEditing(null);setName('');setSteps('');}
  }
  async function tick(routine,index,checked){
    await data.mutate(uid=>runTransaction(db,async transaction=>{
      const reference=doc(db,'users',uid,'routine_logs',data.day);
      const log=await transaction.get(reference);
      const ticks={...log.data()?.[routine.id]?.ticks,[index]:checked};
      const completed=routine.steps.every((_,i)=>ticks[i]);
      transaction.set(reference,{[routine.id]:{ticks,completed,updatedAt:new Date()}},{merge:true});
    }));
  }
  return <div><section className="panel"><div className="section-heading"><div><h2>Routines that start themselves</h2><p>Checklists repeat on your chosen days. Completion resets each Ajax calendar day.</p></div></div>
    {!data.routines.length&&<div className="empty-state"><p>Start with morning direction, trading preparation and an evening reset, or create your own.</p><button disabled={data.pending} className="button-secondary" onClick={()=>data.mutate(uid=>{const batch=writeBatch(db);STARTERS.forEach(item=>batch.set(doc(db,'users',uid,'routines','starter-'+item.name.toLowerCase().replaceAll(' ','-')),{...item,enabled:true,remind:true,createdAt:new Date()}));return batch.commit();})}>Add starter routines</button></div>}
    <div className="grid gap-4 md:grid-cols-2">{data.routines.map(routine=><article key={routine.id} className="rounded-xl border border-white/10 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">{routine.name}</h3><p className="mt-1 text-xs text-gold">{routine.time} · {routine.durationMinutes} min</p><p className="mt-2 text-xs text-gray-400">{(routine.days||[]).map(day=>DAYS[day]).join(' · ')}{!routine.days?.includes(dayOfWeek(data.day))?' · Not scheduled today':''}</p></div><button disabled={data.pending} className="button-secondary" onClick={()=>edit(routine)}>Edit</button></div>
      <label className="mt-3 flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={routine.enabled!==false} disabled={data.pending} onChange={event=>data.mutate(uid=>updateDoc(doc(db,'users',uid,'routines',routine.id),{enabled:event.target.checked}))}/>Active</label>
      <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={routine.remind!==false} disabled={data.pending} onChange={event=>data.mutate(uid=>updateDoc(doc(db,'users',uid,'routines',routine.id),{remind:event.target.checked}))}/>Reminder at start time</label>
      <button className="button-primary mt-2" onClick={()=>setOpen(open===routine.id?null:routine.id)}>{data.routineLog[routine.id]?.completed?'Review completed routine':open===routine.id?'Close checklist':'Start routine'}</button>
      {open===routine.id&&<ul className="mt-4 space-y-2">{(routine.steps||[]).map((step,index)=><li key={index}><label className="flex min-h-11 items-start gap-3 py-2 text-sm"><input type="checkbox" disabled={data.pending} checked={Boolean(data.routineLog[routine.id]?.ticks?.[index])} onChange={event=>tick(routine,index,event.target.checked)}/><span>{typeof step==='string'?step:step.text}</span></label></li>)}</ul>}
    </article>)}</div>
    <form onSubmit={save} className="mt-6 space-y-4 border-t border-white/10 pt-5"><h3 className="text-base font-semibold">{editing?'Edit routine':'Create a routine'}</h3><div className="planning-form-grid"><label>Name<input required maxLength={120} value={name} onChange={event=>setName(event.target.value)} className="planning-field"/></label><label>Start time (Ajax)<input required type="time" value={time} onChange={event=>setTime(event.target.value)} className="planning-field"/></label><label>Minutes<input required type="number" min="5" max="240" value={duration} onChange={event=>setDuration(event.target.value)} className="planning-field"/></label></div><fieldset><legend className="mb-2 text-xs">Repeat on</legend><div className="flex flex-wrap gap-3">{DAYS.map((label,index)=><label key={label} className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" checked={days.includes(index)} onChange={event=>setDays(current=>event.target.checked?[...current,index]:current.filter(day=>day!==index))}/>{label}</label>)}</div></fieldset><label className="block text-xs">Checklist (one step per line)<textarea required maxLength={3000} rows={4} value={steps} onChange={event=>setSteps(event.target.value)} className="planning-field"/></label><div className="flex gap-2"><button disabled={data.pending||!days.length} className="button-primary">Save routine</button>{editing&&<button type="button" className="button-secondary" onClick={()=>{setEditing(null);setName('');setSteps('');}}>Cancel edit</button>}</div></form>
  </section><ReminderSettings data={data}/></div>;
}
