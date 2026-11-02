import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;
let DailyPlanner;
before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
  DailyPlanner = (await server.ssrLoadModule("/src/components/DailyPlanner.jsx")).default;
});
after(async () => { await server?.close(); });

const noop = () => {};
const base = {
  today: "2026-11-01", tasks: [], taskIds: [], session: null, ready: true, pending: false, error: "",
  addTask: noop, changePlan: noop, toggleTask: noop, archiveTask: noop, startFocus: noop, controlFocus: noop, retry: noop,
};
const render = props => renderToStaticMarkup(createElement(DailyPlanner, { ...base, ...props }));

test("loading does not present an empty day as if data had loaded", () => {
  const html = render({ ready: false });
  assert.match(html, /Loading your daily plan/);
  assert.doesNotMatch(html, /What would make today/);
});

test("first use gives an actionable prompt and a labelled task capture", () => {
  const html = render();
  assert.match(html, /What would make today a good day/);
  assert.match(html, /for="capture-task"/);
  assert.match(html, /3 priority slots available/);
});

test("legacy tasks appear in Later without being committed to today", () => {
  const html = render({ tasks: [{ id: "legacy", text: "An existing task", done: false }] });
  assert.match(html, /Later \(1\)/);
  assert.match(html, /Plan An existing task today/);
  assert.doesNotMatch(html, /Start focus/);
});

test("a full day sends new tasks to Later and exposes the next task", () => {
  const html = render({
    tasks: ["a", "b", "c"].map(id => ({ id, text: `Task ${id}`, done: false })), taskIds: ["b", "a", "c"],
  });
  assert.match(html, /Up next<\/p><h3[^>]*>Task b/);
  assert.match(html, /<option value="later" selected="">/);
  assert.match(html, /Your day is full/);
  assert.match(html, /Make Task a next/);
});

test("timer expiry asks for the result and never claims the task is complete", () => {
  const html = render({
    tasks: [{ id: "a", text: "Proposal", done: false }], taskIds: ["a"],
    session: { taskId: "a", taskText: "Proposal", status: "running", endsAt: 1 },
  });
  assert.match(html, /Session finished/);
  assert.match(html, /00:00/);
  assert.match(html, /Mark task done/);
  assert.match(html, /Keep task open/);
  assert.match(html, /0\/1 priorities complete/);
});

test("a paused session exposes resume and preserves remaining time", () => {
  const html = render({ session: { taskText: "Proposal", status: "paused", remainingMs: 90000 } });
  assert.match(html, /Focus paused/);
  assert.match(html, /01:30/);
  assert.match(html, /Resume/);
});

test("completion encourages stopping, and archived work remains recoverable", () => {
  const html = render({
    tasks: [{ id: "a", text: "Done", done: true }, { id: "b", text: "Old idea", archived: true }], taskIds: ["a"],
  });
  assert.match(html, /Your priorities are complete/);
  assert.match(html, /Archived tasks \(1\)/);
  assert.match(html, /Restore Old idea/);
  assert.match(html, /Later \(0\)/);
});

test("failed saves have an accessible recovery action and user text is escaped", () => {
  const html = render({ error: "Could not save", tasks: [{ id: "a", text: '<script>alert("hello")</script>' }] });
  assert.match(html, /role="alert"/);
  assert.match(html, /Retry connection/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});
