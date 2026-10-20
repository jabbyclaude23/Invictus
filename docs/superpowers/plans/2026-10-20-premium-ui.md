# Invictus Premium UI Implementation Plan

**Goal:** Redesign the current deployed Invictus app while preserving its complete workout, nutrition, trading, dashboard, and coach capabilities.

**Architecture:** Keep Firebase schemas and existing feature logic. Introduce a shared visual language, persistent responsive shell, accessible dialog behavior, and a dashboard data hook. Extend the existing page compositions rather than replace functioning planners with simpler journals.

**Tech stack:** React 19, Tailwind 3, Firebase, React Router, Lucide, Framer Motion, Vite.

**Source:** jabbyclaude23/Invictus at 723bfab52ee16ebe52267b0df8dcb46e4b111d06, verified against Vercel production. The old repository's brief is superseded wherever it describes placeholders or different schemas.

## Tasks

- [x] Shell and authentication: replace `src/layout/MainLayout.jsx`, `src/pages/Auth.jsx`, and `src/components/UserMenu.jsx`. Keep all routes; persist navigation on every page; use semantic forms and actionable auth feedback. Verify mobile safe areas and keyboard access.
- [x] Shared design system: replace decorative glow styles in `src/index.css`, define graphite surfaces and muted gold tokens in `tailwind.config.js`, apply consistent controls and restrained motion across existing components. Retain semantic domain colors.
- [x] Daily dashboard: extract `src/hooks/useDashboardData.js`; rebuild `src/pages/Dashboard.jsx` around habits and tasks, with schedule, goals, stats, and links to existing plans. Preserve add/edit/history flows. Persist stat edits immediately. Show real loading and errors.
- [x] Dashboard correctness: write `src/lib/dashboard.test.js` first using Node's test runner, verify failure, implement local-day helpers and summary calculations in `src/lib/dashboard.js`, rerun tests. Avoid UTC midnight rollover overwriting a new day's records.
- [x] Existing feature screens: improve Workout and Meals page widths, headers, weekly grids and mobile controls without changing planner behavior. Improve Trading summary, expandable rows, P&L formatting, mutation feedback, and dialog save failures.
- [x] Coach: redesign `src/pages/Coach.jsx` around readable messages, persistent composer, desktop sessions, accessible mobile history, suggestions, and reliable pending/error handling.
- [x] Dialogs and usability: introduce reusable dialog focus/Escape behavior; apply to affected add/edit overlays; provide explicit labels and prevent silent failed saves.
- [x] Verification: run Node tests and production build; inspect baseline and changed lint output; inspect all six routes using a local fixture harness for protected UI without changing production authentication. Clearly distinguish fixture validation from live Firebase/AI validation.
- [x] Delivery: review actual diff and source SHA, commit locally, determine authenticated publishing permissions, and publish a reviewable branch/PR only with appropriate repository access. Do not deploy production during redesign review.

## Acceptance checks

At 375, 430, 768, and 1440px: navigation stays available; content and fixed actions do not overlap; no horizontal overflow; dialogs fit viewport and restore focus; controls have visible focus and labels; empty and error states are clear. Use real calculations and explicitly labelled fixture data in local tests. Preserve the existing `/trading` collection, full workout exercise flow, meal setup and planning, historical records, and coach sessions.

## Verified implementation notes

- All current feature flows were retained; no replacement journals or collection migrations were introduced.
- Habit day keys remain UTC for compatibility with existing stored history. Rollover reloads records without writing yesterday's progress into the new day. Stats snapshot on load/day rollover if missing, and edits atomically save current value and daily history.
- Production authentication and services are unchanged. The fixture alias configuration lives exclusively in tests/vite.config.js and is never imported by production.
- Verification: production build, clean source lint, eight Node tests, fixture engine verification, 24 route/viewport checks, nine workflow groups, and six empty/error-state groups.
- Live Firebase rules/indexes, Google OAuth, external AI/exercise APIs, and physical iOS keyboard behavior remain staging smoke-test items.
