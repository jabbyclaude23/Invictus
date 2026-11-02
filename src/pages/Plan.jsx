import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Flag, ListChecks, Moon } from 'lucide-react';
import usePlanningData from '../hooks/usePlanningData';
import DaySchedule from '../components/DaySchedule';
import GoalTracker from '../components/GoalTracker';
import RoutinesPanel from '../components/RoutinesPanel';
import PrayerPanel from '../components/PrayerPanel';
import { zonedDay } from '../lib/planningTime';
const tabs=[{id:'schedule',name:'Schedule',icon:CalendarDays},{id:'goals',name:'Goals',icon:Flag},{id:'routines',name:'Routines',icon:ListChecks},{id:'prayer',name:'Prayer',icon:Moon}];
export default function Plan() {
  const [params,setParams]=useSearchParams();
  const current=tabs.some(tab=>tab.id===params.get('tab'))?params.get('tab'):'schedule';
  const requestedDay=current==='schedule'&&/^\d{4}-\d{2}-\d{2}$/.test(params.get('date')||'')?params.get('date'):undefined;
  const data=usePlanningData(requestedDay);
  return <div className="feature-page planning-page"><div className="page-heading"><div><p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p><h1>Plan your day<span className="text-gold">.</span></h1><p className="page-description">Connect your goals, protect your time, and build routines you can follow.</p></div></div>
    <nav aria-label="Planning sections" className="planning-tabs">{tabs.map(({id,name,icon:Icon})=><button key={id} aria-current={current===id?'page':undefined} className={current===id?'selected':''} onClick={()=>setParams({...Object.fromEntries(params),tab:id})}><Icon size={17}/>{name}</button>)}</nav>
    {current==='schedule'&&<label className="mb-5 block max-w-xs text-sm text-gray-300">Schedule date<input className="planning-field" type="date" min={zonedDay()} value={data.day} onChange={event=>{if(event.target.value)setParams({tab:'schedule',date:event.target.value});}}/></label>}
    {data.error&&<div role="alert" className="status-error"><span>{data.error}</span><button className="button-secondary" disabled={data.pending} onClick={data.retry}>Retry</button></div>}
    {!data.ready?<div role="status" className="dashboard-loading">Loading your plan...</div>:<div key={data.day+'-'+current+'-'+(params.get('routine')||'')}>
      {current==='schedule'&&<DaySchedule data={data}/>}
      {current==='goals'&&<GoalTracker/>}
      {current==='routines'&&<RoutinesPanel data={data}/>}
      {current==='prayer'&&<PrayerPanel data={data}/>}
    </div>}
  </div>;
}
