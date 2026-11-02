import test from "node:test";
import process from "node:process";
import assert from "node:assert/strict";
import { addPriority, formatCountdown, getDailyTasks, localDateKey, remainingFocusMs } from "./dailyPlanner.js";

test("calendar keys follow local time, including the evening before UTC midnight", () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/Toronto";
  try {
    assert.equal(localDateKey(new Date("2026-11-02T02:30:00Z")), "2026-11-01");
    assert.equal(localDateKey(new Date("2026-11-02T05:01:00Z")), "2026-11-02");
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("legacy todos stay available, and today's selection has a stable order", () => {
  const tasks = [{ id: "old", text: "Legacy task", done: false }, { id: "a", done: true }, { id: "b", done: false }];
  assert.deepEqual(getDailyTasks(tasks, ["b", "a", "b", "deleted"]).map(task => task.id), ["b", "a"]);
  assert.deepEqual(getDailyTasks(tasks), []);
  assert.equal(tasks[0].done, false);
});

test("adding a fourth priority fails without dropping or changing existing tasks", () => {
  const ids = ["a", "b", "c"];
  assert.throws(() => addPriority(ids, "d"), /three priorities/);
  assert.deepEqual(ids, ["a", "b", "c"]);
  assert.deepEqual(addPriority(ids, "b"), ids);
  assert.deepEqual(addPriority(["a", "a"], "b"), ["a", "b"]);
});

test("focus time is derived from a deadline so backgrounding and reopening do not reset it", () => {
  const session = { status: "running", endsAt: 1000000 };
  assert.equal(remainingFocusMs(session, 100000), 900000);
  assert.equal(remainingFocusMs(session, 999000), 1000);
  assert.equal(remainingFocusMs(session, 2000000), 0);
  assert.equal(session.status, "running"); // Time expiring never completes a task.
});

test("paused time does not elapse, and resuming preserves the remaining duration", () => {
  const paused = { status: "paused", remainingMs: 42000, endsAt: 1 };
  assert.equal(remainingFocusMs(paused, 9000000), 42000);
  const resumed = { ...paused, status: "running", endsAt: 9000000 + paused.remainingMs };
  assert.equal(remainingFocusMs(resumed, 9001000), 41000);
  assert.equal(remainingFocusMs(null), 0);
});

test("countdown rounds up so an active session does not display zero early", () => {
  assert.equal(formatCountdown(1500000), "25:00");
  assert.equal(formatCountdown(1), "00:01");
  assert.equal(formatCountdown(-1), "00:00");
});
