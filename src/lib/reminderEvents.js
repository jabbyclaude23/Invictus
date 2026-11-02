import { dayAt, dayOfWeek, zonedDay, zonedMinute, PLANNING_ZONE } from './planningTime.js';
import { prayerTimes, DEFAULT_PRAYER } from './prayerTimes.js';
export function quietAt(at, settings = {}) {
  if (!settings.quietEnabled) return false;
  const minute = zonedMinute(new Date(at), PLANNING_ZONE);
  const parse = time => { const [h,m] = time.split(':').map(Number); return h*60+m; };
  const start = parse(settings.quietStart || '22:00'), end = parse(settings.quietEnd || '07:00');
  return start > end ? minute >= start || minute < end : minute >= start && minute < end;
}
export function reminderEvents(day, { settings = {}, routines = [], schedule = {}, routineLog = {}, tasks = [] } = {}) {
  const events = [];
  const prayer = { ...DEFAULT_PRAYER, ...settings.prayer };
  if (prayer.enabled) for (const time of prayerTimes(day, prayer)) {
    if (prayer.muted?.includes(time.key)) continue;
    events.push({ id: time.id, at: time.at - (Number(prayer.leadMinutes)||0)*60000, title: time.title + ' prayer', body: 'Ajax, Ontario · Calculated prayer start ' + new Date(time.at).toLocaleTimeString('en-CA', {timeZone: PLANNING_ZONE,hour:'numeric',minute:'2-digit'}), kind: 'prayer', url: '/plan?tab=prayer&prayer=' + time.key });
  }
  for (const routine of routines) {
    if (routine.enabled === false || routine.remind === false || !(routine.days || [0,1,2,3,4,5,6]).includes(dayOfWeek(day))) continue;
    if (routineLog[routine.id]?.completed) continue;
    const at = dayAt(day, routine.time || '08:00');
    if (!quietAt(at, settings)) events.push({ id: 'routine-' + day + '-' + routine.id, at, title: routine.name, body: 'Your routine is ready. Start with the first step.', kind: 'routine', url: '/plan?tab=routines&routine=' + encodeURIComponent(routine.id) });
  }
  if (settings.scheduleReminders) for (const block of schedule.blocks || []) {
    if (block.kind !== 'task') continue;
    if (tasks.some(task=>task.id===block.taskId&&(task.done||task.archived))) continue;
    const at = dayAt(day, String(Math.floor(block.start/60)).padStart(2,'0') + ':' + String(block.start%60).padStart(2,'0'));
    if (!quietAt(at, settings)) events.push({ id: 'block-' + day + '-' + block.id, at, title: block.title, body: 'Your scheduled focus block is starting.', kind:'task', url:'/plan?tab=schedule' });
  }
  return events.sort((a,b)=>a.at-b.at);
}
export function dueEvents(events, now, enabledAt = 0) { return events.filter(event => event.at >= enabledAt && event.at <= now && now-event.at < 5*60000); }
export function todayReminderEvents(input, now = Date.now()) { return reminderEvents(zonedDay(new Date(now)), input); }
