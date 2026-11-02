export const PLANNING_ZONE = 'America/Toronto';
export function zonedParts(value = new Date(), timeZone = PLANNING_ZONE) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(value).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
export function zonedDay(value = new Date(), zone = PLANNING_ZONE) {
  const p = zonedParts(value, zone);
  return [p.year, p.month, p.day].join('-');
}
export function clockMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) throw new Error('Enter a valid time.');
  const [hours, minutes] = value.split(':').map(Number);
  if (hours > 23 || minutes > 59) throw new Error('Enter a valid time.');
  return hours * 60 + minutes;
}
export function minutesClock(value) {
  return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
}
export function zonedMinute(value = new Date(), zone = PLANNING_ZONE) {
  const p = zonedParts(value, zone);
  return Number(p.hour) * 60 + Number(p.minute);
}
export function dayAt(day, clock, zone = PLANNING_ZONE) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Enter a valid date.');
  clockMinutes(clock);
  const expected = day + 'T' + clock;
  const raw = Date.parse(expected + ':00Z');
  let candidate = raw;
  for (let i = 0; i < 4; i++) {
    const p = zonedParts(new Date(candidate), zone);
    const actual = [p.year, p.month, p.day].join('-') + 'T' + p.hour + ':' + p.minute;
    if (actual === expected) return candidate;
    candidate += raw - Date.parse(actual + ':00Z');
  }
  throw new Error('That local time does not exist on this date. Choose another time.');
}
export function shiftDay(day, count) {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export const dayOfWeek = day => new Date(day + 'T12:00:00Z').getUTCDay();
