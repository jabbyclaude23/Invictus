# Daily planning in Invictus

The home screen now starts with a daily plan. The product hypothesis is that choosing a small amount of work and presenting a clear next action will make Invictus more useful than opening a screen full of trackers. This is an assumption based on the existing screen and the reported lack of use; no usage analytics or personal productivity results were available.

## Daily use

1. Choose one to three concrete tasks for today. Existing to-dos appear in Later, and new tasks can go to Today or Later.
2. Start a 15, 25, or 50 minute focus session on the next priority. Use the up arrow to change which task is next.
3. Mark the task done when the work is actually finished. A timer ending asks for the result; it does not complete the task.
4. Move work back to Later when the day changes. A new local calendar day opens a fresh plan and leaves unfinished work available for deliberate selection.

Focus sessions support pause/resume and survive navigation and reopening. They use an absolute deadline rather than counting timer ticks. This does not add a background notification or alarm while the app is closed. Ending a session keeps the task open.

Completed tasks can be reopened. Stale backlog tasks can be archived and restored. The current app's design, daily check-in, seven-day summary, goals, habits, workouts, meals, trading, and Coach remain available. The planner comes before the quote and routine. The earlier separate priority form is replaced by this planner.

## Persistence

- Existing `users/{uid}/todos/{id}` documents are reused. Optional fields added: `lastPlannedOn`, `completedOn`, `completedAt`, and `archived`. Legacy documents work without migration.
- `users/{uid}/daily_checkins/{YYYY-MM-DD}` stores ordered `taskIds`, with at most three selected tasks, including completed priorities. It also stores the matching text/completion snapshots in `priorities` so the existing seven-day summary and Coach context stay current. Other check-in fields are preserved.
- Today's priorities from the earlier form are carried into todos once, using deterministic IDs and a transaction. Earlier days' records stay unchanged.
- `users/{uid}/focus_session/current` stores the active task, deadline, pause state, and session identity. There is at most one session per user.
- Firestore transactions protect the daily limit when multiple devices update the same plan. Transactions also mark a task complete, update the daily snapshot, and clear its active session together. See [Firestore transactions and batched writes](https://firebase.google.com/docs/firestore/manage-data/transactions).
- All three realtime subscriptions have error handlers and clean up when the account, date, or connection retry changes.
- Dates use the device's local calendar. Devices using different time zones can show different daily plans.
- Saving needs a connection. Offline actions show a message instead of claiming to have saved. No new analytics, AI calls, dependencies, or permissions are required.

## Validation

Run `npm test` for local-date boundaries, selection limits, legacy task handling, background timer recovery, pause/resume arithmetic, and server-rendered empty/loading/full/completed/error states. Run `npm run build` for the production and PWA build.

Browser control was disabled in this environment's Work settings. Phone/desktop appearance, keyboard interactions, and authenticated live Firestore round trips still need browser verification. Server-rendered state checks do not establish those results.

## Evaluate the change

For the next five days, use Invictus to choose the day's priorities before starting work. At the end of each day, check whether the next action was clear, how many chosen priorities were completed, and whether capture felt quick enough to keep using. This is a small personal trial, not evidence of a guaranteed productivity gain. If the friction is elsewhere, use that observation to decide the next change.
