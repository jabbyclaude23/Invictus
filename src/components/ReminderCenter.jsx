import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { Bell, X } from 'lucide-react';
import { db } from '../firebase';
import usePlanningData from '../hooks/usePlanningData';
import { dueEvents, reminderEvents } from '../lib/reminderEvents';
import { dayAt } from '../lib/planningTime';
export default function ReminderCenter() {
  const data = usePlanningData();
  const [alert, setAlert] = useState(null);
  const seen = useRef(new Set());
  useEffect(() => {
    if (!data.ready || alert) return;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      const events = [...reminderEvents(data.day,{settings:data.settings,routines:data.routines,schedule:data.dayPlan,routineLog:data.routineLog,tasks:data.tasks}),...(data.snoozes||[])];
      const due = dueEvents(events,Date.now()).sort((a,b)=>(a.kind==='prayer'?0:1)-(b.kind==='prayer'?0:1));
      for (const event of due) {
        const key = 'invictus-alert-' + data.user.uid + '-' + event.id + '-' + event.at;
        if(seen.current.has(key))continue;
        try { if (localStorage.getItem(key)) continue; localStorage.setItem(key,'1'); } catch { /* Visible alerts still work if storage is blocked. */ }
        seen.current.add(key);
        setAlert(event);
        break;
      }
    };
    const timer = setInterval(check,15000); check();
    window.addEventListener('focus',check);
    return () => {clearInterval(timer);window.removeEventListener('focus',check);};
  },[data.ready,data.day,data.user?.uid,data.settings,data.routines,data.dayPlan,data.routineLog,data.snoozes,data.tasks,alert]);
  useEffect(() => setAlert(null),[data.user?.uid]);
  if (!alert) return null;
  return <aside role="status" aria-label="Current reminder" className="reminder-banner">
    <div className="flex items-start justify-between gap-3"><div><p className="eyebrow flex items-center gap-2"><Bell size={14}/>INVICTUS REMINDER</p><h2 className="text-base font-semibold">{alert.title}</h2><p className="mt-2 text-xs leading-5 text-gray-300">{alert.body}</p></div><button className="icon-button" aria-label="Dismiss reminder" onClick={()=>setAlert(null)}><X size={18}/></button></div>
    {alert.kind==='prayer' && <audio controls preload="none" src="/audio/azaan.mp3" className="mt-3 w-full" aria-label="Play azaan recording"/>}
    {data.error && <p role="alert" className="mt-2 text-xs text-red-300">{data.error}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Link className="button-primary" to={alert.url||'/plan'} onClick={()=>setAlert(null)}>{alert.kind==='prayer'?'Prayer times':'Start'}</Link><button disabled={data.pending} className="button-secondary" onClick={async()=>{
      if(await data.mutate(uid=>setDoc(doc(db,'users',uid,'reminder_snoozes',alert.id),{...alert,id:alert.id,at:Date.now()+5*60000}))) setAlert(null);
    }}>Snooze 5 min</button></div>
    <details className="mt-3"><summary className="cursor-pointer py-3 text-xs text-gray-300">Reschedule this reminder</summary><form className="space-y-3" onSubmit={async event=>{
      event.preventDefault();const value=new FormData(event.currentTarget).get('when');
      if(await data.mutate(uid=>{const at=dayAt(value.slice(0,10),value.slice(11,16));if(at<=Date.now())throw new Error('Choose a future time.');return setDoc(doc(db,'users',uid,'reminder_snoozes',alert.id),{...alert,at});}))setAlert(null);
    }}><label className="block text-xs">New alert time (Ajax)<input className="planning-field" name="when" required type="datetime-local"/></label><button disabled={data.pending} className="button-secondary">Save reminder time</button></form></details>
  </aside>;
}
