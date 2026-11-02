import { clockMinutes, dayOfWeek } from './planningTime.js';

export const DEFAULT_DAY = { start: '08:00', end: '21:00', breakMinutes: 5 };
export function routineBlocks(routines, day) {
  return routines.filter(item => item.enabled !== false && (item.days || [0,1,2,3,4,5,6]).includes(dayOfWeek(day))).map(item => ({ id: 'routine-' + item.id, routineId: item.id, title: item.name, start: clockMinutes(item.time || '08:00'), duration: Number(item.durationMinutes) || 15, kind: 'routine', remind: item.remind !== false }));
}
export function buildSchedule({ day, tasks = [], fixed = [], start = '08:00', end = '21:00', breakMinutes = 5, nowMinute = 0 }) {
  const from = Math.max(clockMinutes(start), Math.ceil(nowMinute));
  const until = clockMinutes(end);
  if (until <= clockMinutes(start)) throw new Error('Your finishing time must be after your starting time.');
  const occupied = fixed.map(block => ({ ...block, start: Number(block.start), duration: Number(block.duration) })).filter(block => Number.isFinite(block.start) && Number.isFinite(block.duration) && block.duration > 0);
  const conflicts = [];
  occupied.forEach((block, index) => occupied.slice(index + 1).forEach(other => {
    if (block.start < other.start + other.duration && other.start < block.start + block.duration) conflicts.push([block.title, other.title]);
  }));
  const slots = [];
  let cursor = from;
  for (const block of [...occupied].sort((a,b) => a.start-b.start)) {
    if (block.start >= until) break;
    if (block.start > cursor) slots.push({ start: cursor, end: Math.min(until, block.start) });
    cursor = Math.max(cursor, block.start + block.duration);
  }
  if (cursor < until) slots.push({ start: cursor, end: until });
  const ranked = tasks.filter(task => !task.done && !task.archived).map((task, order) => ({ ...task, order })).sort((a,b) => {
    const deadlineA = a.dueDate && a.dueDate <= day ? 0 : 1;
    const deadlineB = b.dueDate && b.dueDate <= day ? 0 : 1;
    return deadlineA-deadlineB || (Number(a.priority)||2)-(Number(b.priority)||2) || (a.dueDate||'9999').localeCompare(b.dueDate||'9999') || a.order-b.order;
  });
  const planned = [], overflow = [];
  for (const task of ranked) {
    const duration = Math.max(5, Math.min(480, Number(task.estimateMinutes) || 25));
    let remaining = duration, part = 0;
    // Reserve a task's parts together, so a partial fit cannot silently hide remaining work.
    const trialSlots = slots.map(slot => ({ ...slot })), parts = [];
    for (const slot of trialSlots) {
      const capacity = slot.end - slot.start;
      const chunk = task.splittable ? Math.min(remaining, capacity) : remaining;
      if (chunk > capacity || (chunk < 15 && remaining > chunk)) continue;
      if (chunk <= 0) continue;
      parts.push({ id: 'task-' + task.id + '-' + part++, taskId: task.id, title: task.text, start: slot.start, duration: chunk, kind: 'task', goalId: task.goalId || null });
      slot.start += chunk + Math.max(0, Math.min(30, Number(breakMinutes) || 0));
      remaining -= chunk;
      if (!remaining) break;
    }
    if (remaining) overflow.push({ ...task, duration, reason: task.splittable ? 'Not enough free time today' : 'No uninterrupted block long enough' });
    else { planned.push(...parts); slots.splice(0, slots.length, ...trialSlots); }
  }
  return { blocks: [...occupied, ...planned].sort((a,b) => a.start-b.start), overflow, conflicts, plannedMinutes: planned.reduce((total,item)=>total+item.duration,0), requestedMinutes: ranked.reduce((total,item)=>total+(Number(item.estimateMinutes)||25),0) };
}
