# Invictus App — Claude Memory File

## Project Overview

**Invictus** is a personal performance PWA (Progressive Web App) built with React 19 + Vite.
Live URL: **https://invictus-app.vercel.app**
Repo path: `C:\Users\jabra\OneDrive\Desktop\Invictus`

### Tech Stack
- **Frontend**: React 19, Vite (rolldown-vite 7.1.14), Tailwind CSS, Framer Motion, Lucide React
- **Auth**: Firebase Auth (email/password + Google OAuth)
- **Database**: Firestore (`invictus-8f5ad` project)
- **AI**: OpenAI via `/api/chat.js` Vercel serverless function (CoachContext)
- **Exercise Data**: AscendAPI ExerciseDB with videos (`edb-with-videos-and-images-by-ascendapi.p.rapidapi.com`)
- **Deployment**: Vercel (`vercel --prod --yes`)
- **PWA**: Workbox (skipWaiting + clientsClaim)

### Fonts
- Poppins (400, 600) — body
- Orbitron (700) — display/headings (`font-display`)

---

## App Structure

```
src/
  pages/
    Auth.jsx          — login/signup (email + Google OAuth)
    Dashboard.jsx     — home page, stats, habits, goals
    Workout.jsx       — full workout system (COMPLETE REWRITE)
    Meals.jsx         — nutrition/meal planning (COMPLETE REWRITE)
    Trading.jsx       — futures trading journal
    Coach.jsx         — AI coach chat
  components/
    WorkoutOnboarding.jsx   — multi-step workout profile wizard
    TradeModal.jsx          — trade entry form
    MacroSummary.jsx        — macro progress rings
    MealLogModal.jsx        — log a meal
    TradeStats.jsx          — trading P&L summary
    UserMenu.jsx            — top-right user avatar/logout
  context/
    CoachContext.jsx  — global AI context (plans, chat, onSnapshot)
  layout/
    MainLayout.jsx    — bottom nav + header (swipe removed)
  data/
    exercises.js      — exercise library + weight recommendation engine
  firebase.js         — Firebase init
api/
  chat.js             — OpenAI proxy (serverless)
  exercisedb.js       — ExerciseDB proxy (serverless, keeps API key server-side)
```

---

## Firestore Data Structure

```
users/{uid}/
  profile/info          — workout profile (sex, age, weight kg, height cm, experience, goal, days, timeline)
  workout_plan/current  — AI-generated workout plan JSON
  workouts/{date}       — completed workout logs (date key = "YYYY-MM-DD")
  meal_setup/info       — nutrition profile (sex, age, weight, height, activity, goal, diet, meals, calories, protein, carbs, fat)
  meal_plan/current     — AI-generated 7-day meal plan JSON
  meals/{docId}         — individual meal logs (date, name, macros)
  trades/{docId}        — trade journal entries
  coach_sessions/{id}   — AI coach chat sessions
    messages/{id}       — chat messages within a session
```

### Firestore Security Rules (permanent — deployed May 2025)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Environment Variables (Vercel)

| Key | Used In |
|-----|---------|
| `OPENAI_API_KEY` | `api/chat.js` |
| `EXERCISEDB_API_KEY` | `api/exercisedb.js` |

ExerciseDB API key: `3c83b4398cmsh03e9ee5596528afp12b04cjsndaee07532199`
ExerciseDB host: `edb-with-videos-and-images-by-ascendapi.p.rapidapi.com`

---

## Key Decisions & Patterns

### Navigation
- Bottom nav with 5 tabs: Workout, Meals, Dashboard (home), Trading, Coach
- **No swipe navigation** — removed completely (was causing accidental tab switches)
- Coach page hides both header AND bottom nav (full-screen chat)
- Nav hides on scroll down, reappears on scroll up

### Global Profile Sharing
- Workout onboarding saves to `users/{uid}/profile/info`
- Meals wizard loads workout profile on mount and pre-fills sex/age/weight/height
- Shows green "✓ Loaded from your workout profile" badge on pre-filled steps

### Onboarding Persistence
- `WorkoutOnboarding.jsx` saves progress to **localStorage** (key: `invictus_workout_onboarding`)
  - Uses localStorage (not sessionStorage) so progress survives PWA restarts and navigation
  - Cleared on completion
- Meals wizard does NOT persist (it's short and loads from workout profile)

### Overflow/Scroll Fix
```css
html, body {
  overflow-x: hidden;
  width: 100%;
  max-width: 100vw;
  position: relative;
}
```

### iOS Keyboard Fix
```css
textarea, input { font-size: 16px !important; }
```

---

## Workout System (Workout.jsx)

### View States
- `"plan"` — shows weekly schedule, today's CTA, history button
- `"active"` — in-progress workout (timer, exercise list, progress bar)
- `"exercise"` — full-screen exercise detail
- `"history"` — workout log history

### Exercise Flow
1. AI generates plan via `PLAN_PROMPT` → stored at `workout_plan/current`
2. "Start Workout" loads today's exercises from the plan
3. Tap exercise → ExerciseDetail full-screen view
4. Log sets/reps/weight → "Done — Log Exercise"
5. Prev/Next navigation between exercises
6. "Finish" → saves to `workouts/{todayStr()}`

### ExerciseDB Integration
- Proxy: `/api/exercisedb?type=name|bodyPart|detail|bodyParts&q=...&id=...`
- `fetchExerciseData(name)` — searches by name, scores results with `nameSimilarity()`, returns best match
- `fetchExerciseDetail(exerciseId)` — full detail: videoUrl, imageUrls (360p/480p/720p/1080p), instructions, exerciseTips
- `fetchAlternatives(BODYPART, excludeName)` — live alternatives from same muscle group
- **Confidence threshold**: only show video + instructions if match score ≥ 0.65
- Caches: `EX_CACHE` (name search), `DETAIL_CACHE` (by exerciseId), `ALT_CACHE` (by bodyPart)

### ExerciseDetail Features
- 480p image loads immediately; ▶ Video button swaps to MP4 autoplay
- "How to perform" expandable numbered instructions
- Pro tips section (from exerciseTips field)
- Weight recommendation badge (from `getWeightRec()` in exercises.js)
- Last session data shown
- Swap button → live grid of 8 alternatives with thumbnails from same bodyPart
- Add Set / remove set
- Prev/Next buttons (fixed above Done button)

### Weight Recommendations (exercises.js)
```js
getWeightRec(exerciseName, profile)
// profile needs: weight (kg), sex, experience
// Returns { display: "~60 kg", value: 60, unit: "kg" }
// EXP_MULT: Beginner=0.55, Intermediate=1.0, Advanced=1.50
// SEX_MULT: Male=1.0, Female=0.65
// Rounds to nearest 2.5 kg, min 5 kg
// Converts to lbs if profile uses lbs
```

### Workout History
- Clock icon (top-right of plan page) → full-screen history view
- Sorted newest-first, expandable per-workout with sets×reps×weight
- Trash icon deletes log + resets `todayLogged` if it was today

### Reset Today's Log
- "Re-do" link appears next to "Completed today ✓"
- Deletes `workouts/{todayStr()}` doc + resets UI state

### BodyPart Mapping (AscendAPI → internal)
```js
BODYPART_MAP = {
  chest:"CHEST", back:"BACK", shoulders:"SHOULDERS",
  arms:"UPPER ARMS", biceps:"BICEPS", triceps:"TRICEPS",
  legs:"THIGHS", quads:"QUADRICEPS", hamstrings:"HAMSTRINGS",
  glutes:"HIPS", calves:"CALVES", core:"WAIST", abs:"WAIST"
}
```

---

## Meals System (Meals.jsx)

### TDEE Calculation
```js
calcTDEE(data)
// Mifflin-St Jeor BMR × activity multiplier
// Activity: Sedentary=1.2 → Extremely Active=1.9
// Goal adjustments: Build Muscle=+300, Lose Fat=-400, Maintain=0, Recomp=-200
// Protein: Build Muscle/Recomp=2.2g/kg, Lose Fat=2.0g/kg, Maintain=1.8g/kg
```

### Wizard Steps
sex → age → weight (lbs/kg toggle) → height (ft+in/cm toggle) → activity → goal → diet → meals per day

### Pre-fill from Workout Profile
```js
parseWorkoutProfile(profile)
// Parses weight_display ("175 lbs" or "80 kg") and height_display ("5'10\"" or "178 cm")
// Pre-fills corresponding wizard form fields
// Shows "✓ Loaded from your workout profile" badge
```

---

## Trading System (TradeModal.jsx + Trading.jsx)

### Symbols (futures only)
`NQ, MNQ, ES, MES, RTY`

### Multipliers ($/point)
```js
MULTIPLIER = { NQ: 20, MNQ: 2, ES: 50, MES: 5, RTY: 50 }
```

### Auto P&L Formula
```js
const points = side === "Long" ? exitPrice - entryPrice : entryPrice - exitPrice;
const pnl = Math.round(points * MULTIPLIER[symbol] * contracts * 100) / 100;
```

### Trading Rules (user's actual rules — shown as multi-select tags)
`15m Confirm, Trend Aligned, EMA Stack, 13 EMA Entry, Flag/Structure, Key Level, HOD/LOD Trim, Time Window`

Time windows: NO 9:30-9:45, Primary 9:45-12:00, Secondary 1:45-3:30. Max 2-3 trades/day.

---

## Coach System (CoachContext.jsx + Coach.jsx)

### CoachContext
- Global React context with `onSnapshot` subscriptions (all have error handlers)
- `generatePlan(systemPrompt, userPrompt)` → calls `/api/chat.js`, saves to Firestore, returns parsed JSON
- `askCoach(message)` → sends to active session
- `plans.workout` and `plans.meal` — live-subscribed from Firestore

### Coach.jsx Send Button
- Disabled when `sending || !activeId || !input.trim()`
- Shows "Connecting to coach session..." when `!activeId`
- `z-20` on input container to prevent tap-through issues

### /api/chat.js
- Proxies to OpenAI
- Used for both plan generation (JSON mode) and coach chat

---

## Styling Conventions

### Color Themes per Page
```css
.glow-workout  { rgba(255,0,72,0.25) }    /* red */
.glow-meals    { rgba(0,255,100,0.25) }   /* green */
.glow-trading  { rgba(0,150,255,0.25) }   /* blue */
.glow-coach    { rgba(255,165,0,0.25) }   /* orange */
.glow-dashboard{ rgba(212,175,55,0.25) }  /* gold */
```

### Standard Card Style
```jsx
className="bg-[#111] border border-white/5 rounded-2xl"
```

### Bottom Nav Active State
```css
.nav-active { color: #D4AF37; animation: glowPulseSoft 3s ease-in-out infinite; }
```

---

## Common Gotchas

1. **Firestore rules** — were on 30-day test mode and expired. Permanent rules now deployed.
2. **try/finally** — ALL async handlers that set loading state must use try/finally to clear it
3. **iPhone keyboard zoom** — `font-size: 16px !important` on all inputs
4. **Smart quotes** — never use `"` or `"` in JSX strings (causes build errors)
5. **`overflow-x: hidden`** — must be on both `html` AND `body`
6. **ExerciseDB name matching** — AI uses short names ("Bench Press"), API has long names ("Barbell Bench Press"). Use `nameSimilarity()` scorer, gate video/instructions at score ≥ 0.65
7. **localStorage vs sessionStorage** — use localStorage for onboarding progress (sessionStorage gets cleared on PWA navigation)
8. **CoachContext `onSnapshot` errors** — all 7 subscriptions must have error callbacks or silent failures swallow the error

---

## Deployment

```bash
cd "C:\Users\jabra\OneDrive\Desktop\Invictus"
npm run build          # verify build first
vercel --prod --yes    # deploy
```

Build output goes to `dist/`. PWA service worker generated by Workbox.
No need to update Vercel CLI — it works as-is.
