import { useState } from 'react';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { finishPlanningTask } from '../lib/taskWrites';
import { db } from '../firebase';
import { buildSchedule, routineBlocks } from '../lib/scheduler';
import { clockMinutes, minutesClock, zonedMinute, zonedDay } from '../lib/planningTime';
import { prayerTimes } from '../lib/prayerTimes';
import { remainingFocusMs } from '../data/dailyPlanner';

function TaskDetails({task,data}) {
  const [draft,setDraft]=useState({estimateMinutes:task.estimateMinutes||25,dueDate:task.dueDate||'',priority:task.priority||2,splittable:Boolean(task.splittable),goalId:task.goalId||''});
  const patch=value=>setDraft(current=>({...current,...value}));
  return <details className="mt-2"><summary className="cursor-pointer py-2 text-xs text-gold">Duration, deadline and goal</summary><form className="planning-form-grid mt-2" onSubmit={event=>{event.preventDefault();void data.mutate(uid=>updateDoc(doc(db,'users',uid,'todos',task.id),{...draft,goalTitle:data.goals.find(goal=>goal.id===draft.goalId)?.name||''}));}}>
    <label>Minutes<input type="number" min="5" max="480" required value={draft.estimateMinutes} onChange={event=>patch({estimateMinutes:Number(event.target.value)})} className="planning-field"/></label>
    <label>Deadline<input type="date" value={draft.dueDate} onChange={event=>patch({dueDate:event.target.value})} className="planning-field"/></label>
    <label>Priority<select className="planning-field" value={draft.priority} onChange={event=>patch({priority:Number(event.target.value)})}><option value={1}>High</option><option value={2}>Normal</option><option value={3}>Low</option></select></label>
    <label>Linked goal<select className="planning-field" value={draft.goalId} onChange={event=>patch({goalId:event.target.value})}><option value="">No goal</option>{data.goals.filter(goal=>!goal.archived).map(goal=><option key={goal.id} value={goal.id}>{goal.name}</option>)}</select></label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={draft.splittable} onChange={event=>patch({splittable:event.target.checked})}/>Can split into shorter blocks</label><button disabled={data.pending} className="button-secondary">Save task details</button>
  </form></details>;
}
export default function DaySchedule({data}) {
  const [hours,setHours]=useState({start:data.dayPlan.start||data.settings.start,end:data.dayPlan.end||data.settings.end,breakMinutes:data.dayPlan.breakMinutes??data.settings.breakMinutes});
  const [selected,setSelected]=useState(data.dayPlan.taskIds||data.priorities.taskIds||[]);
  const [fixed,setFixed]=useState(data.dayPlan.fixed||[]);
  const [legacy,setLegacy]=useState(data.dayPlan.includeLegacy!==false);
  const [title,setTitle]=useState(''),[time,setTime]=useState('12:00'),[duration,setDuration]=useState(30);
  const [proposal,setProposal]=useState(null),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  const tasks=data.tasks.filter(task=>!task.done&&!task.archived);
  function preview(){
    setError('');setSaved(false);
    try{
      const legacyBlocks=legacy?data.legacySchedule.map(item=>({id:'legacy-'+item.id,title:item.label,start:Number(item.timeSort),duration:Number(item.durationMinutes)||30,kind:'fixed'})):[];
      const reserved=[...fixed.filter(block=>!block.taskId||tasks.some(task=>task.id===block.taskId)),...legacyBlocks,...routineBlocks(data.routines,data.day),...(data.settings.prayer.enabled?prayerTimes(data.day,data.settings.prayer):[])];
      const isToday=data.day===zonedDay();
      const ongoing=isToday&&data.focus?.status==='running'&&remainingFocusMs(data.focus)>0;
      if(ongoing)reserved.push({id:'current-focus',title:data.focus.taskText,start:zonedMinute(),duration:Math.ceil(remainingFocusMs(data.focus)/60000),kind:'focus'});
      const result=buildSchedule({day:data.day,tasks:selected.map(id=>tasks.find(task=>task.id===id)).filter(task=>task&&(!ongoing||task.id!==data.focus.taskId)),fixed:reserved,...hours,nowMinute:isToday?zonedMinute()+1:0});
      setProposal(result);
    }catch(err){setError(err.message);}
  }
  const shown=proposal?.blocks||data.dayPlan.blocks||[];
  async function save(){
    const expected=data.dayPlan.revision||0;
    const success=await data.mutate(uid=>runTransaction(db,async transaction=>{
      const reference=doc(db,'users',uid,'day_schedules',data.day);
      const current=await transaction.get(reference);
      if((current.data()?.revision||0)!==expected)throw new Error('Your schedule changed on another device. Replan using the latest version.');
      transaction.set(reference,{date:data.day,timeZone:'America/Toronto',...hours,taskIds:selected,fixed,includeLegacy:legacy,blocks:proposal.blocks,revision:expected+1,updatedAt:new Date()});
      transaction.set(doc(db,'users',uid,'planning_settings','info'),hours,{merge:true});
    }));
    if(success){setSaved(true);setProposal(null);}
  }
  return <div className="planning-two-column">
    <section className="panel"><div className="section-heading"><div><h2>Design a day that fits</h2><p>{data.day} · All times in Ajax / America/Toronto</p></div></div>
      <div className="planning-form-grid"><label>Start<input type="time" value={hours.start} onChange={event=>{setHours(current=>({...current,start:event.target.value}));setProposal(null);}} className="planning-field"/></label><label>Finish<input type="time" value={hours.end} onChange={event=>{setHours(current=>({...current,end:event.target.value}));setProposal(null);}} className="planning-field"/></label><label>Break between tasks (min)<input type="number" min="0" max="30" value={hours.breakMinutes} onChange={event=>{setHours(current=>({...current,breakMinutes:Number(event.target.value)}));setProposal(null);}} className="planning-field"/></label></div>
      <p className="my-4 text-xs leading-6 text-gray-400">Choose work for today. Replanning fits unfinished tasks into remaining time, ordered by deadlines and priority. Fixed events, routines and enabled prayer periods stay protected.</p>
      {!tasks.length?<p className="text-sm text-gray-400">Capture a task on your Dashboard or add tasks to a goal first.</p>:<ul className="space-y-3">{tasks.map(task=><li key={task.id} className="rounded-xl border border-white/10 p-3"><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={selected.includes(task.id)} onChange={event=>{setSelected(current=>event.target.checked?[...current,task.id]:current.filter(id=>id!==task.id));setProposal(null);}}/><span className="min-w-0 flex-1 break-words text-sm">{task.text}{task.goalTitle&&<span className="mt-1 block text-xs text-gold">{task.goalTitle}</span>}</span><span className="text-xs text-gray-400">{task.estimateMinutes||25} min</span></label><TaskDetails key={task.id+'-'+task.estimateMinutes+'-'+task.dueDate+'-'+task.priority+'-'+task.goalId+'-'+task.splittable} task={task} data={data}/></li>)}</ul>}
      <details className="mt-5"><summary className="cursor-pointer py-3 text-sm font-semibold">Fixed commitments ({fixed.length})</summary><form onSubmit={event=>{event.preventDefault();setFixed(current=>[...current,{id:crypto.randomUUID(),title:title.trim(),start:clockMinutes(time),duration:Number(duration),kind:'fixed'}]);setTitle('');setProposal(null);}} className="space-y-3"><label className="block text-xs">Commitment<input required maxLength={180} value={title} onChange={event=>setTitle(event.target.value)} className="planning-field" placeholder="Meeting, meal, workout..."/></label><div className="planning-form-grid"><label>Time<input required type="time" value={time} onChange={event=>setTime(event.target.value)} className="planning-field"/></label><label>Minutes<input required type="number" min="5" max="480" value={duration} onChange={event=>setDuration(event.target.value)} className="planning-field"/></label></div><button className="button-secondary">Add fixed block</button></form><ul className="mt-3">{fixed.map(block=><li key={block.id} className="flex min-h-11 items-center justify-between gap-2 text-sm"><span>{minutesClock(block.start)} · {block.title} ({block.duration} min)</span><button aria-label={'Remove fixed block '+block.title} className="button-secondary" onClick={()=>{setFixed(current=>current.filter(item=>item.id!==block.id));setProposal(null);}}>Remove</button></li>)}</ul></details>
      {data.legacySchedule.length>0&&<label className="mt-3 flex min-h-11 items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={legacy} onChange={event=>{setLegacy(event.target.checked);setProposal(null);}}/>Include existing schedule entries (30 minutes unless specified)</label>}
      <div className="mt-5 flex flex-wrap gap-2"><button disabled={data.pending} onClick={preview} className="button-primary">Replan the rest of today</button>{proposal&&<button disabled={data.pending||proposal.conflicts.length>0} onClick={save} className="button-secondary">Accept schedule</button>}</div>
      {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}{saved&&<p role="status" className="mt-3 text-sm text-emerald-300">Schedule saved. Reminders follow the accepted blocks.</p>}
    </section>
    <section className="panel"><div className="section-heading"><div><h2>{proposal?'Proposed timeline':'Your timeline'}</h2><p>Tasks only move when you accept a new schedule.</p></div></div>
      {proposal&&<><p className="mb-3 text-sm text-gray-300">{proposal.plannedMinutes} minutes of work fit today.</p>{proposal.conflicts.length>0&&<div role="alert" className="mb-4 rounded-xl border border-amber-300/30 p-3 text-sm text-amber-200">Fixed commitments overlap: {proposal.conflicts.map(pair=>pair.join(' / ')).join('; ')}. Adjust them before relying on this plan.</div>}
      {proposal.overflow.length>0&&<div role="status" className="mb-4 rounded-xl border border-amber-300/30 p-3"><h3 className="text-sm font-semibold text-amber-200">Does not fit today</h3><ul className="mt-2 space-y-2 text-xs text-gray-300">{proposal.overflow.map(task=><li key={task.id}>{task.text} · {task.duration} min · {task.reason}</li>)}</ul><p className="mt-2 text-xs text-gray-400">These tasks stay open. Shorten the work, free a block, or choose another day.</p></div>}</>}
      {!shown.length?<p className="py-8 text-sm text-gray-400">Choose tasks and replan to preview a realistic day.</p>:<ol className="space-y-3">{shown.map(block=><li key={block.id} className={'schedule-block '+(block.kind==='prayer'?'prayer-block':'')}><p className="text-xs text-gold">{minutesClock(block.start)}–{minutesClock(block.start+block.duration)} · {block.duration} min</p><p className="mt-1 break-words text-sm font-medium">{block.title}</p><p className="mt-1 text-xs capitalize text-gray-400">{block.kind==='fixed'?'Protected commitment':block.kind}</p>{block.kind==='task'&&<div className="mt-3 flex flex-wrap gap-2"><button disabled={data.pending||data.tasks.some(task=>task.id===block.taskId&&task.done)} className="button-secondary" onClick={()=>data.mutate(uid=>finishPlanningTask(uid,block.taskId,data.day))}>Mark done</button><button disabled={block.locked||data.pending} className="button-secondary" onClick={()=>{setFixed(current=>[...current,{...block,id:'locked-'+block.id,kind:'task',locked:true}]);setSelected(current=>current.filter(id=>id!==block.taskId));setProposal(null);setSaved(false);}}>Keep this time</button></div>}</li>)}</ol>}
      <label className="mt-5 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={data.settings.scheduleReminders} disabled={data.pending} onChange={event=>data.saveSettings({scheduleReminders:event.target.checked})}/>Remind me at accepted task start times</label>
    </section>
  </div>;
}
