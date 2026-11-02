import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
let server,fixture,DaySchedule,PrayerPanel,RoutinesPanel,finishPlanningTask;
before(async()=>{
  const memory=new Map();
  globalThis.localStorage=globalThis.sessionStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
  globalThis.window=globalThis;globalThis.location={search:''};
  server=await createServer({configFile:'tests/vite.config.js',resolve:{alias:{'firebase/firestore':fileURLToPath(new URL('./fixtures/firebase.js',import.meta.url))}},server:{middlewareMode:true},appType:'custom'});
  fixture=await server.ssrLoadModule('/tests/fixtures/firebase.js');
  DaySchedule=(await server.ssrLoadModule('/src/components/DaySchedule.jsx')).default;
  PrayerPanel=(await server.ssrLoadModule('/src/components/PrayerPanel.jsx')).default;
  RoutinesPanel=(await server.ssrLoadModule('/src/components/RoutinesPanel.jsx')).default;
  finishPlanningTask=(await server.ssrLoadModule('/src/lib/taskWrites.js')).finishPlanningTask;
});
after(async()=>{await server?.close();delete globalThis.window;delete globalThis.location;delete globalThis.localStorage;delete globalThis.sessionStorage;});
const base=()=>({settings:{start:'08:00',end:'21:00',breakMinutes:5,quietEnabled:true,quietStart:'22:00',quietEnd:'07:00',prayer:{enabled:true,method:'NorthAmerica',madhab:'Hanafi',offsets:{},muted:[],blockMinutes:15,leadMinutes:0}},day:'2026-11-01',dayPlan:{},priorities:{},tasks:[],goals:[],routines:[],legacySchedule:[],routineLog:{},saveSettings:async()=>true,mutate:async()=>true});
test('schedule empty state directs the user toward tasks without inventing a plan',()=>{
  const html=renderToStaticMarkup(createElement(DaySchedule,{data:base()}));
  assert.match(html,/Capture a task/);
  assert.match(html,/Replan the rest of today/);
  assert.doesNotMatch(html,/Accept schedule/);
});
test('prayer screen labels Hanafi, has five starts, playable audio and calendar fallback',()=>{
  const html=renderToStaticMarkup(createElement(PrayerPanel,{data:base()}));
  for(const prayer of ['Fajr','Dhuhr','Asr','Maghrib','Isha'])assert.match(html,new RegExp(prayer));
  assert.match(html,/<option value="Hanafi" selected="">/);
  assert.match(html,/audio\/azaan.mp3/);
  assert.match(html,/Export 30 days/);
  assert.match(html,/rather than mosque azaan or iqamah/);
});
test('routines provide a useful first-use option and preserve timezone context',()=>{
  const html=renderToStaticMarkup(createElement(RoutinesPanel,{data:base()}));
  assert.match(html,/Add starter routines/);
  assert.match(html,/one step per line/);
  assert.match(html,/Start time \(Ajax\)/);
});
test('completing scheduled work updates the existing priorities and clears focus atomically',async()=>{
  const {db,auth,doc,setDoc,getDoc}=fixture,uid=auth.currentUser.uid,day='2026-11-01';
  const task=doc(db,'users',uid,'todos','scheduled');
  const plan=doc(db,'users',uid,'daily_checkins',day);
  const focus=doc(db,'users',uid,'focus_session','current');
  await setDoc(task,{text:'Work that matters',done:false});
  await setDoc(plan,{taskIds:['scheduled'],priorities:[{text:'Work that matters',done:false}],sleepHours:7.5});
  await setDoc(focus,{taskId:'scheduled'});
  await finishPlanningTask(uid,'scheduled',day);
  assert.equal((await getDoc(task)).data().done,true);
  assert.equal((await getDoc(plan)).data().priorities[0].done,true);
  assert.equal((await getDoc(plan)).data().sleepHours,7.5);
  assert.equal((await getDoc(focus)).exists(),false);
});
test('a failed scheduled completion leaves task, priority and focus unchanged',async()=>{
  const {db,auth,doc,setDoc,getDoc}=fixture,uid=auth.currentUser.uid,day='2026-11-01';
  const task=doc(db,'users',uid,'todos','failed');
  const plan=doc(db,'users',uid,'daily_checkins',day);
  const focus=doc(db,'users',uid,'focus_session','current');
  await setDoc(task,{text:'Still open',done:false});
  await setDoc(plan,{taskIds:['failed'],priorities:[{text:'Still open',done:false}]});
  await setDoc(focus,{taskId:'failed'});
  window.__fixture.failWrites=true;
  try{await assert.rejects(finishPlanningTask(uid,'failed',day));}finally{window.__fixture.failWrites=false;}
  assert.equal((await getDoc(task)).data().done,false);
  assert.equal((await getDoc(plan)).data().priorities[0].done,false);
  assert.equal((await getDoc(focus)).exists(),true);
});
