export const DAILY_PRIORITY_LIMIT = 3;

// Calendar days follow the person using the app, rather than UTC midnight.
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getDailyTasks(tasks, taskIds = []) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  return [...new Set(taskIds)].map(id => byId.get(id)).filter(Boolean);
}

export function addPriority(taskIds, id) {
  const ids = [...new Set(taskIds)];
  if (ids.includes(id)) return ids;
  if (ids.length >= DAILY_PRIORITY_LIMIT) {
    throw new Error("Your day already has three priorities. Move one back to Later first.");
  }
  return [...ids, id];
}

export function remainingFocusMs(session, now = Date.now()) {
  if (!session) return 0;
  return Math.max(0, session.status === "paused" ? session.remainingMs : session.endsAt - now);
}

export function formatCountdown(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
