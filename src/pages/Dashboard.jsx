import { useState } from 'react';
import { ArrowUpRight, ArrowRight, Plus, Dumbbell, Utensils, TrendingUp, Check, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCoach } from '../context/useCoach';
import useDashboardData from '../hooks/useDashboardData';
import { habitSummary } from '../lib/dashboard';
import { dailyQuotes } from '../data/quotes';
import ScheduleTab from '../components/ScheduleTab';
import HabitCard from '../components/HabitCard';
import StatCard from '../components/StatCard';
import AddHabitModal from '../components/AddHabitModal';
import AddStatModal from '../components/AddStatModal';
import GoalTracker from '../components/GoalTracker';
import TodoList from '../components/TodoList';
import DailyFocus, { PerformanceSnapshot } from '../components/DailyFocus';
import useDailyFocus from '../hooks/useDailyFocus';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Dashboard() {
  const data = useDashboardData();
  const focus = useDailyFocus();
  const { plans } = useCoach();
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const summary = habitSummary(data.habits);
  const now = new Date();
  const firstName = data.user?.displayName?.split(' ')[0];
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const workout = plans?.workout?.weekly_schedule?.find(day => day.day === DAYS[now.getDay()]);
  const targets = plans?.meal?.daily_targets;
  const quote = dailyQuotes[Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000) % dailyQuotes.length];

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR DAILY OVERVIEW</p>
          <h1>{greeting}{firstName ? `, ${firstName}` : ''}<span className="text-gold">.</span></h1>
          <p className="page-description">Small actions. Stronger every day.</p>
        </div>
        <button className="button-primary" onClick={() => setModal('habit')}><Plus size={17} /> Add habit</button>
      </div>

      {data.error && <div className="status-error" role="alert"><span>{data.error}</span><button className="button-secondary" onClick={data.reload}>Try again</button></div>}

      <div className="dashboard-topline">
        {quote && <blockquote className="quote-feature panel"><span>ONE THOUGHT FOR TODAY</span><p>“{quote}”</p><a href="#daily-focus" className="button-secondary">Give today a direction <ArrowRight size={14} /></a></blockquote>}
        <ScheduleTab />
      </div>
      <div id="daily-focus"><DailyFocus focus={focus} /></div>
      <PerformanceSnapshot />

      <div className="journey-grid">
        <Link className="journey-card" to="/workout"><span className="journey-icon text-red-300"><Dumbbell size={21} /></span><div><span>Workout</span><strong>{workout?.focus || (plans?.workout ? 'Recovery & your program' : 'Build your training plan')}</strong></div><ArrowUpRight size={17} /></Link>
        <Link className="journey-card" to="/meals"><span className="journey-icon text-emerald-300"><Utensils size={21} /></span><div><span>Meals</span><strong>{targets?.calories ? `${targets.calories.toLocaleString()} kcal daily target` : 'Fuel your progress'}</strong></div><ArrowUpRight size={17} /></Link>
        <Link className="journey-card" to="/trading"><span className="journey-icon text-blue-300"><TrendingUp size={21} /></span><div><span>Trading</span><strong>Review your execution</strong></div><ArrowUpRight size={17} /></Link>
      </div>

      {data.loading ? <div className="panel dashboard-loading" role="status"><Loader2 size={22} className="animate-spin text-gold" /><span>Loading your day…</span></div> : (
        <div className="dashboard-columns">
          <div className="dashboard-primary">
            <section className="panel habits-panel" id="daily-habits">
              <div className="section-heading"><div><h2>Daily habits</h2><p>Consistency starts with the next step.</p></div><button className="icon-button" aria-label="Add habit" onClick={() => setModal('habit')}><Plus size={18} /></button></div>
              {data.habits.length ? <>
                <div className="habit-list" aria-busy={data.pending}>
                  {data.habits.map(habit => <HabitCard key={habit.id} habit={habit} pending={data.pending} onUpdate={data.updateHabit} onDelete={data.removeHabit} onEdit={h => { setEditing(h); setModal('edit'); }} />)}
                </div>
                <div className="habit-summary"><span>{summary.completed} of {summary.total} complete</span><span>{summary.percent === 100 ? 'All done for today' : 'One step at a time'}</span></div>
              </> : <div className="empty-state"><span className="empty-icon"><Check size={24} /></span><h3>Your routine starts here</h3><p>Add the habits you want to make part of your day.</p><button className="button-secondary" onClick={() => setModal('habit')}><Plus size={16} /> Create your first habit</button></div>}
              {data.pending && <p role="status" className="text-xs text-gold mt-3">Saving your progress…</p>}
            </section>
            <TodoList />

          </div>
          <aside className="dashboard-secondary" aria-label="Schedule and progress">

            <section className="coach-invitation"><span className="journey-icon text-gold"><Sparkles size={21} /></span><h2>A little guidance goes a long way.</h2><p>Bring your training, nutrition, and daily progress into one conversation.</p><Link to="/coach" className="button-secondary">Talk to your coach <ArrowUpRight size={16} /></Link></section>
            <section className="panel stats-panel"><div className="section-heading"><div><h2>Your measurements</h2><p>Log real values, with units and a clear target.</p></div><button className="icon-button" aria-label="Add stat" onClick={() => setModal('stat')}><Plus size={18} /></button></div>
              {data.stats.length ? <div className="space-y-3">{data.stats.map(stat => <StatCard key={stat.id} stat={stat} pending={data.pending} onUpdate={data.updateStat} onDelete={data.removeStat} />)}</div> : <div className="empty-state compact"><p>Track a measurement that supports your goals, such as body weight or daily steps.</p><button className="button-secondary" onClick={() => setModal('stat')}><Plus size={16} /> Add a stat</button></div>}
            </section>

          </aside>
        </div>
      )}
      <div className="dashboard-goals"><GoalTracker /></div>
      {modal === 'habit' && <AddHabitModal onClose={() => setModal(null)} onAdd={data.addHabit} />}
      {modal === 'edit' && editing && <AddHabitModal habitToEdit={editing} onClose={() => setModal(null)} onUpdate={data.editHabit} />}
      {modal === 'stat' && <AddStatModal onClose={() => setModal(null)} onAdd={data.addStat} />}
    </div>
  );
}
