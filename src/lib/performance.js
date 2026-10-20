function optionalNumber(value, min, max, label, integer = false) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) throw new Error(`${label} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}.`);
  return parsed;
}
export function normalizeCheckin(input = {}) {
  if (!Array.isArray(input.priorities ?? [] ) || (input.priorities ?? []).length > 3) throw new Error('Choose up to three priorities for the day.');
  return {
    priorities: (input.priorities || []).map(item => ({ text: String(item?.text || '').trim().slice(0, 180), done: Boolean(item?.done) })),
    sleepHours: optionalNumber(input.sleepHours, 0, 24, 'Sleep'),
    focusMinutes: optionalNumber(input.focusMinutes, 0, 1440, 'Focused minutes', true),
    energy: optionalNumber(input.energy, 1, 5, 'Energy', true),
    reflection: String(input.reflection || '').trim().slice(0, 1500),
  };
}
// Each form owns only its submitted fields, so other tabs cannot restore stale sections.
export function normalizeCheckinPatch(patch = {}) {
  const normalized = normalizeCheckin(patch);
  return Object.fromEntries(Object.keys(normalized).filter(key => Object.hasOwn(patch, key)).map(key => [key, normalized[key]]));
}
export function summarizeCheckins(records = []) {
  const entered = key => records.filter(row => row[key] !== '' && row[key] != null && Number.isFinite(Number(row[key]))).map(row => Number(row[key]));
  const average = values => values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length * 10) / 10 : null;
  const priorities = records.flatMap(row => row.priorities || []).filter(item => String(item.text || '').trim());
  return { days: records.length, focusMinutes: entered('focusMinutes').length ? entered('focusMinutes').reduce((sum, value) => sum + value, 0) : null, averageSleep: average(entered('sleepHours')), averageEnergy: average(entered('energy')), prioritiesDone: priorities.filter(item => item.done).length, prioritiesTotal: priorities.length };
}
export function measurementStatus(stat, previous) {
  const value = Number(stat.value);
  const target = stat.target === '' || stat.target == null || !Number.isFinite(Number(stat.target)) ? null : Number(stat.target);
  const hasPrevious = previous !== '' && previous != null && Number.isFinite(Number(previous));
  const delta = hasPrevious ? Math.round((value - Number(previous)) * 10000) / 10000 : null;
  const reached = target == null ? false : stat.direction === 'decrease' ? value <= target : stat.direction === 'increase' ? value >= target : value === target;
  return { delta, target, remaining: target == null ? null : reached ? 0 : Math.round(Math.abs(value - target) * 10000) / 10000, reached };
}
