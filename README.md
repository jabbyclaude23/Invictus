# Invictus

A personal performance PWA for daily habits, training, nutrition, trading, and contextual coaching. Built with React 19, Vite, Tailwind, Firebase Auth/Firestore, and a Vercel API backend.

Current production project: https://invictus-app.vercel.app

Source repository: https://github.com/jabbyclaude23/Invictus

## Local development

Use Node 22, run `npm ci`, then `npm run dev`.

Configure the existing Firebase project through an untracked `.env.local`:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

The deployed API uses the existing `OPENAI_API_KEY` and `EXERCISEDB_API_KEY` server environment variables. Local Vite does not run Vercel API functions; use the deployment tooling or the isolated fixture preview below when checking API-driven interfaces.

## Verification

```sh
npm test
npm run test:fixtures
npm run lint
npm run build
```

The UI redesign preserves existing collection paths, plans, history, futures calculations, and authentication. Habit history retains its established UTC date keys; no timezone migration is performed. Daily stat snapshots are created on load/day rollover when missing, and edits atomically update the current value and history.

## Isolated UI preview

Run `npm run preview:fixtures`, then open http://127.0.0.1:4174. This separate Vite configuration renders the actual screens against persisted synthetic data and mock APIs. It is never referenced by the production build.

Use `?empty=1` for new-account states and `?signedout=1` for auth. See [fixture controls](tests/fixtures/README.md) for failure simulation.

With Playwright CLI installed and a browser session open:

```sh
playwright-cli open http://127.0.0.1:4174
playwright-cli run-code --filename=tests/browser-layout.js
playwright-cli run-code --filename=tests/browser-workflows.js
playwright-cli run-code --filename=tests/browser-states.js
playwright-cli run-code --filename=tests/browser-daily-focus.js
```

[Desktop/mobile previews](docs/previews/README.md) show synthetic data. The browser scripts cover six routes at 375/430/768/1440px, save/reload/error recovery, dialog focus, workout logging, futures P&L, meal estimates, and Coach retries. They do not replace testing live Firebase rules/indexes, Google OAuth, external AI/exercise APIs, or a physical iPhone keyboard.

## Daily focus and measurements

The dashboard places quote and schedule first, followed by three priorities, a daily check-in and a seven-day summary. Check-ins use local calendar dates in `users/{uid}/daily_checkins/{YYYY-MM-DD}`. Separate form saves update only their submitted fields. Missing metrics stay unknown rather than becoming zero.

Goals retain the existing `users/{uid}/goals` collection and support written outcomes, reasons, next actions, dates, achieved status and archiving. Legacy numeric progress stays visible. Measurements support explicit units, values, optional targets and desired direction. History compares entries with the same unit; changing units does not automatically convert old values.

New workout setup accepts body weight in pounds, retains the entered value/display and converts once to canonical kg for existing calculations. Existing profiles are not migrated. Weekly exercise rows, logging cards and detail views share a strict movement/equipment-aware resolver. It uses documented cursor pagination and real provider media fields. Unavailable exact demonstrations show a placeholder rather than another exercise; reduced-motion users see static media when available.

The coach uses goals and check-ins for warm, psychologically informed support. Explicit JSON plan prompts retain their original contract. [TradeOS investigation and connection requirements](docs/tradeos-connection.md) explain the remaining cross-app integration work; live TradeOS statistics are not connected in this release.
