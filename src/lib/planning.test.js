import test from 'node:test';
import assert from 'node:assert/strict';
import { dayAt, zonedDay, zonedMinute } from './planningTime.js';
import { buildSchedule, routineBlocks } from './scheduler.js';
import { prayerTimes, nextPrayer, prayerCalendar } from './prayerTimes.js';
import { reminderEvents, dueEvents, quietAt } from './reminderEvents.js';
import { normalizeGoalPlan } from './goalPlan.js';
test('Ajax date and daylight saving use Toronto even when the server is in UTC',()=>{
  assert.equal(zonedDay(new Date('2026-11-02T02:00:00Z')),'2026-11-01');
  assert.equal(new Date(dayAt('2026-07-01','12:00')).toISOString(),'2026-07-01T16:00:00.000Z');
  assert.equal(new Date(dayAt('2026-12-01','12:00')).toISOString(),'2026-12-01T17:00:00.000Z');
  assert.throws(()=>dayAt('2026-03-08','02:30'),/does not exist/);
});
test('calculated prayers have exactly five starts, no sunrise reminder, and ordered times',()=>{
  const prayers=prayerTimes('2026-11-01');
  assert.deepEqual(prayers.map(p=>p.key),['fajr','dhuhr','asr','maghrib','isha']);
  prayers.forEach((p,i)=>{assert.equal(zonedDay(new Date(p.at)),'2026-11-01');assert.equal(zonedMinute(new Date(p.at)),p.start);if(i)assert.ok(p.at>prayers[i-1].at);});
});
test('Hanafi changes Asr and prayer offsets affect only the requested prayer',()=>{
  const normal=prayerTimes('2026-11-01',{madhab:'Shafi'});
  const hanafi=prayerTimes('2026-11-01',{madhab:'Hanafi',offsets:{fajr:3}});
  assert.ok(hanafi[2].at>normal[2].at);
  assert.equal(hanafi[0].at-normal[0].at,180000);
  assert.equal(hanafi[4].at,normal[4].at);
});
test('tomorrow Fajr is returned after Isha and calendar export includes dated UTC alarms',()=>{
  const tonight=Date.parse('2026-11-02T03:00:00Z');
  assert.equal(nextPrayer(tonight,{}).key,'fajr');
  assert.equal(zonedDay(new Date(nextPrayer(tonight,{}).at)),'2026-11-02');
  const calendar=prayerCalendar('2026-11-01',{method:'NorthAmerica'},2);
  assert.equal((calendar.match(/BEGIN:VEVENT/g)||[]).length,10);
  assert.equal((calendar.match(/BEGIN:VALARM/g)||[]).length,10);
  assert.match(calendar,/DTSTART:\d{8}T\d{6}Z/);
});
test('scheduler protects fixed commitments and puts due high priority work first',()=>{
  const result=buildSchedule({day:'2026-11-01',start:'09:00',end:'12:00',breakMinutes:0,fixed:[{id:'prayer',title:'Prayer',start:600,duration:15}],tasks:[{id:'low',text:'Later',estimateMinutes:30,priority:3},{id:'urgent',text:'Deadline',estimateMinutes:60,dueDate:'2026-11-01'}]});
  assert.equal(result.blocks.find(b=>b.taskId==='urgent').start,540);
  assert.equal(result.blocks.find(b=>b.taskId==='low').start,615);
  assert.equal(result.blocks.find(b=>b.id==='prayer').start,600);
  assert.equal(result.overflow.length,0);
});
test('scheduler reports overload without partially reserving work that cannot fit',()=>{
  const result=buildSchedule({day:'2026-11-01',start:'09:00',end:'10:00',breakMinutes:0,tasks:[{id:'big',text:'Big',estimateMinutes:90,splittable:true},{id:'small',text:'Small',estimateMinutes:30}]});
  assert.equal(result.overflow[0].id,'big');
  assert.equal(result.blocks.length,1);
  assert.equal(result.blocks[0].taskId,'small');
});
test('splittable work fits around a prayer and conflicts remain visible',()=>{
  const result=buildSchedule({day:'2026-11-01',start:'09:00',end:'10:45',breakMinutes:0,tasks:[{id:'a',text:'Work',estimateMinutes:90,splittable:true}],fixed:[{id:'p',title:'Prayer',start:585,duration:15}]});
  assert.deepEqual(result.blocks.filter(b=>b.kind==='task').map(b=>b.duration),[45,45]);
  const overlap=buildSchedule({day:'2026-11-01',fixed:[{title:'Meeting',start:600,duration:30},{title:'Prayer',start:610,duration:15}]});
  assert.deepEqual(overlap.conflicts,[['Meeting','Prayer']]);
});
test('replanning uses remaining time and omits completed or archived tasks',()=>{
  const result=buildSchedule({day:'2026-11-01',start:'09:00',end:'12:00',nowMinute:660,tasks:[{id:'done',done:true},{id:'archived',archived:true},{id:'open',text:'Open',estimateMinutes:25}]});
  assert.equal(result.blocks.length,1);
  assert.equal(result.blocks[0].start,660);
});
test('routines recur only on selected days and can be disabled',()=>{
  const routine={id:'a',name:'Prep',time:'09:15',days:[1,2,3,4,5],durationMinutes:15};
  assert.equal(routineBlocks([routine],'2026-11-01').length,0);
  assert.equal(routineBlocks([routine],'2026-11-02')[0].start,555);
  assert.equal(routineBlocks([{...routine,enabled:false}],'2026-11-02').length,0);
});
test('prayer alerts bypass routine quiet hours, respect individual mutes and never include sunrise',()=>{
  const settings={quietEnabled:true,quietStart:'22:00',quietEnd:'07:00',prayer:{enabled:true,muted:['isha']}};
  const events=reminderEvents('2026-11-01',{settings,routines:[{id:'r',name:'Early',time:'05:00'}]});
  assert.equal(events.length,4);
  assert.ok(events.every(event=>event.kind==='prayer'));
  assert.ok(events.some(event=>event.title==='Fajr prayer'));
  assert.ok(quietAt(dayAt('2026-11-01','23:00'),settings));
});
test('finished routines and completed scheduled tasks do not generate reminders',()=>{
  const events=reminderEvents('2026-11-01',{settings:{scheduleReminders:true},routines:[{id:'r',name:'Routine',time:'09:00'}],routineLog:{r:{completed:true}},tasks:[{id:'a',done:true}],schedule:{blocks:[{id:'b',taskId:'a',title:'Done',start:600,kind:'task'}]}});
  assert.equal(events.length,0);
});
test('late reminders are bounded and subscriptions never replay older events',()=>{
  const now=1000000,events=[{at:now-60000},{at:now+1},{at:now-600000}];
  assert.equal(dueEvents(events,now).length,1);
  assert.equal(dueEvents(events,now,now).length,0);
});
test('goal plans reject missing steps, normalize estimates and bound output',()=>{
  assert.throws(()=>normalizeGoalPlan(null),/no milestones/);
  const result=normalizeGoalPlan({milestones:[{title:' First week ',tasks:[{text:' Draft an outline ',estimateMinutes:999},{text:''}]}]});
  assert.equal(result[0].title,'First week');
  assert.equal(result[0].tasks[0].text,'Draft an outline');
  assert.equal(result[0].tasks[0].estimateMinutes,240);
});
