// Deliberately separate from src/main.jsx and the production Vite configuration.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CoachProvider } from '../src/context/CoachContext.jsx';
import MainLayout from '../src/layout/MainLayout.jsx';
import Auth from '../src/pages/Auth.jsx';
import Dashboard from '../src/pages/Dashboard.jsx';
import Workout from '../src/pages/Workout.jsx';
import Meals from '../src/pages/Meals.jsx';
import Trading from '../src/pages/Trading.jsx';
import Coach from '../src/pages/Coach.jsx';
import ProtectedRoute from '../src/components/ProtectedRoute.jsx';
import { mealPlan, workoutPlan } from './fixtures/data.js';
import './fixtures/firebase.js';
import '../src/index.css';

const nativeFetch = window.fetch.bind(window);
window.fetch = async (resource, options = {}) => {
  const url = new URL(resource instanceof Request ? resource.url : resource, location.origin);
  if (url.hostname === 'wger.de') return new Response(JSON.stringify({ results: [] }), { headers: { 'Content-Type': 'application/json' } });
  if (url.pathname === '/api/exercisedb') {
    const data = url.searchParams.get('type') === 'detail'
      ? { overview: 'Local fixture exercise instructions. Use a controlled range of motion and a comfortable load.', instructions: ['Set up in a stable position.', 'Move with control and keep your breathing steady.', 'Stop if the movement causes pain.'], equipments: ['Dumbbells'], imageUrl: null, videoUrl: null }
      : [{ exerciseId: 'local-exercise', name: url.searchParams.get('q') || 'Local fixture exercise', equipments: ['Dumbbells'], imageUrl: null }];
    return new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (url.pathname === '/api/chat') {
    // An intentional short delay makes pending/disabled states reviewable.
    await new Promise(resolve => setTimeout(resolve, 600));
    if (window.__fixture.failChat) throw new Error('Local fixture: forced coach failure');
    const payload = JSON.parse(options.body || '{}');
    let reply = 'Choose one achievable action for today, give it a specific time, and review how it went. Consistency grows from a plan you can repeat. What would make that next step easier?';
    if (payload.topic === 'trading') reply = 'You waited for confirmation and respected your planned risk. Review whether the entry matched your written setup. For your next session, record the intended stop before entering and compare execution against the plan.';
    if (payload.topic === 'plan_generation') {
      const instruction = payload.systemOverride || '';
      const result = instruction.includes('Estimate the macros') ? { calories: 540, protein: 42, carbs: 60, fat: 15 } : /nutritionist|meal plan/i.test(instruction) ? mealPlan : workoutPlan;
      reply = JSON.stringify(result);
    }
    return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (/firebase|googleapis|openai/i.test(url.hostname)) throw new Error('External service access is disabled in the local preview');
  return nativeFetch(resource, options);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CoachProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="workout" element={<Workout />} />
            <Route path="meals" element={<Meals />} />
            <Route path="trading" element={<Trading />} />
            <Route path="coach" element={<Coach />} />
          </Route>
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </BrowserRouter>
    </CoachProvider>
  </React.StrictMode>,
);
