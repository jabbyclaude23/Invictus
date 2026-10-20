// Local UI test data only. Never loaded by the production Vite configuration.
export const fixtureUser = { uid: 'local-preview-user', displayName: 'Alex Morgan', email: 'alex@example.test', photoURL: null, emailVerified: true };
export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const workoutPlan = {
  program_name: 'Strength & consistency', timeline_weeks: 8, days_per_week: 4,
  weekly_schedule: weekdays.map((day, index) => ({ day, focus: index % 2 ? 'Lower body & core' : 'Upper body strength', estimatedDuration: '55 min', exercises: [
    { name: 'Dumbbell Bench Press', muscle: 'chest', sets: 3, reps: '8-12', weight_suggestion: '22 kg per hand', rest_seconds: 90 },
    { name: 'Dumbbell Row', muscle: 'back', sets: 3, reps: '10-12', weight_suggestion: '24 kg', rest_seconds: 75 },
    { name: 'Goblet Squat', muscle: 'legs', sets: 3, reps: '10-12', weight_suggestion: '24 kg', rest_seconds: 90 },
    { name: 'Plank', muscle: 'core', sets: 3, reps: '45 seconds', weight_suggestion: 'Bodyweight', rest_seconds: 45 },
  ] })),
};
export const mealPlan = { daily_targets: { calories: 2400, protein: 180, carbs: 270, fat: 67 }, days: weekdays.map(day => ({ day, meals: [
  { meal: 'Breakfast', time: '8:00 AM', foods: ['Greek yogurt', 'Oats', 'Mixed berries'], macros: { calories: 520, protein: 38, carbs: 64, fat: 12 } },
  { meal: 'Lunch', time: '12:30 PM', foods: ['Grilled chicken', 'Brown rice', 'Roasted vegetables'], macros: { calories: 680, protein: 52, carbs: 78, fat: 18 } },
  { meal: 'Snack', time: '3:30 PM', foods: ['Cottage cheese', 'Apple', 'Almonds'], macros: { calories: 380, protein: 32, carbs: 38, fat: 11 } },
  { meal: 'Dinner', time: '7:00 PM', foods: ['Salmon', 'Sweet potato', 'Green salad'], macros: { calories: 820, protein: 58, carbs: 90, fat: 26 } },
] })) };
export function seedData(empty = false) {
  const data = {};
  const base = `users/${fixtureUser.uid}`;
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  // Match the dashboard's persisted UTC day key.
  const legacyDay = date;
  const put = (path, value) => { data[`${base}/${path}`] = value; };
  data[base] = { name: fixtureUser.displayName, email: fixtureUser.email, createdAt: now };
  if (empty) return data;
  put('profile/info', { age: '29', weight: '78', height: '178', sex: 'Male', experience: 'Intermediate (1–3 years)', goal: 'Build Muscle', days: '4 days', duration: '60 minutes', location: 'Gym', equipment: ['Dumbbells', 'Barbells', 'Cables / Machines'], targetAreas: ['Chest', 'Back'], injuries: '', timeline: '8 weeks', createdAt: now });
  put('workout_plan/current', { ...workoutPlan, createdAt: now });
  put('meal_setup/info', { diet: 'Mediterranean', goal: 'Build Muscle', meals: '4', notes: 'Practical meals, plenty of vegetables.', createdAt: now });
  put('meal_plan/current', { ...mealPlan, createdAt: now });
  [ ['water', 'Drink water', 'Build a steady hydration habit', 8, 5, 'water'], ['read', 'Read 20 pages', 'Make room for a quieter mind', 20, 20, 'book'], ['walk', 'Walk outside', 'An intentional break from the screen', 30, 10, 'walk'] ].forEach(([id, name, description, target, progress, icon]) => {
    put(`habits/${id}`, { name, description, target, progress, icon, createdAt: now, updatedAt: now });
    put(`habits/${id}/progress/${legacyDay}`, { progress, date: legacyDay, completed: progress >= target });
    for (let i = 1; i <= 7; i++) { const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); put(`habits/${id}/progress/${day}`, { progress: Math.round(target * (0.4 + i / 15)), date: day }); }
  });
  [ ['weight', 'Body weight', 78.4, 'weight'], ['steps', 'Daily steps', 8420, 'walk'], ['sleep', 'Sleep hours', 7.5, 'moon'] ].forEach(([id, name, value, icon]) => {
    put(`stats/${id}`, { name, value, icon, createdAt: now, updatedAt: now });
    for (let i = 0; i < 7; i++) { const day = new Date(Date.now() - i * 86400000).toDateString(); put(`stats/${id}/history/${day}`, { date: day, value: value - i * (id === 'steps' ? 110 : 0.1) }); }
  });
  put('goals/strength', { name: 'Complete 16 training sessions', progress: 9, target: 16, createdAt: now });
  put('goals/reading', { name: 'Read 4 books this month', progress: 2, target: 4, createdAt: now });
  put('todos/review', { text: 'Review this week’s training plan', done: true, createdAt: now });
  put('todos/prep', { text: 'Prepare tomorrow’s lunch', done: false, createdAt: now });
  put('todos/journal', { text: 'Write a short trading reflection', done: false, createdAt: now });
  put('schedule/morning', { label: 'Morning walk & hydration', time: '7:00 AM', timeSort: 420 });
  put('schedule/training', { label: 'Strength training', time: '5:30 PM', timeSort: 1050 });
  put('schedule/winddown', { label: 'Read & wind down', time: '9:00 PM', timeSort: 1260 });
  put('meals/breakfast', { name: 'Greek yogurt & berry bowl', mealType: 'Breakfast', ingredients: 'Greek yogurt, oats, berries', calories: 520, protein: 38, carbs: 64, fat: 12, date, createdAt: now });
  put('meals/lunch', { name: 'Chicken & rice bowl', mealType: 'Lunch', ingredients: 'Chicken, rice, roasted vegetables', calories: 680, protein: 52, carbs: 78, fat: 18, date, createdAt: now });
  [ ['es', 'ES', 'Long', 5840, 5852, 600, 'Opening range breakout'], ['nq', 'NQ', 'Short', 20420, 20430, -200, 'Pullback into resistance'], ['mes', 'MES', 'Long', 5830, 5838, 40, 'Support reclaim'] ].forEach(([id, symbol, side, entry, exit, pnl, setup], i) => put(`trading/${id}`, { symbol, side, entry, exit, pnl, contracts: 1, setup, notes: 'Waited for confirmation and respected the planned risk.', createdAt: new Date(Date.now() - i * 3600000), time: new Date(Date.now() - i * 3600000) }));
  const previous = new Date(Date.now() - 86400000);
  put(`workouts/${previous.toISOString().slice(0, 10)}`, { date: previous, createdAt: previous, type: 'Upper body strength', durationMin: 54, exercises: { 'Dumbbell Bench Press': [{ weight: 22, reps: 10 }, { weight: 22, reps: 10 }, { weight: 22, reps: 9 }] } });
  put('coach_sessions/weekly-check-in', { title: 'A stronger week ahead', createdAt: now, updatedAt: now });
  put('coach_sessions/weekly-check-in/messages/greeting', { role: 'assistant', content: 'Welcome back, Alex. What would you like to focus on today?', createdAt: new Date(Date.now() - 60000) });
  put('coach_sessions/weekly-check-in/messages/question', { role: 'user', content: 'I want to stay consistent with training this week without overcomplicating it.', createdAt: new Date(Date.now() - 40000) });
  put('coach_sessions/weekly-check-in/messages/reply', { role: 'assistant', content: 'Start by protecting four training windows in your calendar. Keep your current program and aim to finish each session before adding more volume.\n\nFor today: complete your upper body session, prepare one protein-rich meal, and take a short walk. Which training window will be easiest to protect?', createdAt: new Date(Date.now() - 20000) });
  put('coach_sessions/nutrition', { title: 'Simple meal prep ideas', createdAt: previous, updatedAt: previous });
  put('coach_sessions/nutrition/messages/start', { role: 'assistant', content: 'A little preparation can make your week easier. Let’s start with lunches you enjoy.', createdAt: previous });
  return data;
}
