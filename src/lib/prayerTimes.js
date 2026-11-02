import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan';
import { dayAt, zonedDay, zonedMinute, shiftDay } from './planningTime.js';

export const AJAX = { name: 'Ajax, Ontario', latitude: 43.8509, longitude: -79.0204, timeZone: 'America/Toronto' };
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYER_NAMES = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };
export const PRAYER_METHODS = { NorthAmerica: 'ISNA / North America', MuslimWorldLeague: 'Muslim World League', Karachi: 'Karachi', MoonsightingCommittee: 'Moonsighting Committee' };
export const DEFAULT_PRAYER = { enabled: false, method: 'NorthAmerica', madhab: 'Hanafi', offsets: {}, muted: [], blockMinutes: 15, leadMinutes: 0 };
export function prayerTimes(day = zonedDay(), settings = {}) {
  const options = { ...DEFAULT_PRAYER, ...settings };
  const method = Object.hasOwn(PRAYER_METHODS, options.method) ? options.method : 'NorthAmerica';
  const params = CalculationMethod[method]();
  params.madhab = options.madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const [year, month, date] = day.split('-').map(Number);
  const result = new PrayerTimes(new Coordinates(AJAX.latitude, AJAX.longitude), new Date(year, month - 1, date), params);
  return PRAYERS.map(key => {
    const offset = Math.max(-60, Math.min(60, Number(options.offsets?.[key]) || 0));
    const at = result[key].getTime() + offset * 60000;
    return { id: 'prayer-' + day + '-' + key, key, title: PRAYER_NAMES[key], at, start: zonedMinute(new Date(at), AJAX.timeZone), duration: Math.max(5, Math.min(60, Number(options.blockMinutes) || 15)), kind: 'prayer' };
  });
}
export function nextPrayer(now, settings) {
  const day = zonedDay(new Date(now), AJAX.timeZone);
  return [...prayerTimes(day, settings), ...prayerTimes(shiftDay(day, 1), settings)].find(prayer => prayer.at > now);
}
function icsStamp(at) { return new Date(at).toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z'); }
export function prayerCalendar(startDay, settings, days = 30) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Invictus//Ajax Prayer Times//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Ajax prayer times'];
  for (let day = 0; day < days; day++) for (const prayer of prayerTimes(shiftDay(startDay, day), settings)) {
    lines.push('BEGIN:VEVENT', 'UID:' + prayer.id + '@invictus-app.vercel.app', 'DTSTAMP:' + icsStamp(Date.now()), 'DTSTART:' + icsStamp(prayer.at), 'DTEND:' + icsStamp(prayer.at + prayer.duration * 60000), 'SUMMARY:' + prayer.title + ' - Ajax', 'DESCRIPTION:Calculated prayer start. Not mosque iqamah. Method ' + settings.method, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + prayer.title + ' prayer', 'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
export function prayerTimeLabel(at) { return new Date(at).toLocaleTimeString('en-CA', { timeZone: AJAX.timeZone, hour: 'numeric', minute: '2-digit' }); }
// Exported for date-boundary validation in consumers.
export const ajaxMidnight = day => dayAt(day, '00:00', AJAX.timeZone);
