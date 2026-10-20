export function habitSummary(habits) {
  const completed = habits.filter(h => Number(h.progress) >= (Number(h.target) || 1)).length;
  return { completed, total: habits.length, percent: habits.length ? Math.round(completed / habits.length * 100) : 0 };
}

export function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Preserve existing records. A timezone migration needs an explicit data policy.
export function legacyHabitDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function formatPnl(value) {
  const number = Number(value) || 0;
  return `${number < 0 ? '-' : number > 0 ? '+' : ''}$${Math.abs(number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
