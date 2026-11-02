import { useEffect, useState } from "react";
import { Archive, ArrowDown, ArrowUp, Check, ChevronDown, Pause, Play, Plus, Target } from "lucide-react";
import { DAILY_PRIORITY_LIMIT, formatCountdown, getDailyTasks, remainingFocusMs } from "../data/dailyPlanner";

const secondaryButton = "rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-40";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-3 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-40";

export default function DailyPlanner({
  today, tasks, taskIds, session, pending, error, ready,
  addTask, changePlan, toggleTask, archiveTask, startFocus, controlFocus, retry,
}) {
  const [newTask, setNewTask] = useState("");
  const [destination, setDestination] = useState("today");
  const [minutes, setMinutes] = useState(25);
  const [now, setNow] = useState(Date.now);
  const [visibleLater, setVisibleLater] = useState(8);
  const daily = getDailyTasks(tasks, taskIds);
  const nextTask = daily.find(task => !task.done);
  const completeCount = daily.filter(task => task.done).length;
  const later = tasks.filter(task => !task.done && !task.archived && !taskIds.includes(task.id));
  const completed = tasks.filter(task => task.done && !task.archived && !taskIds.includes(task.id));
  const archived = tasks.filter(task => task.archived && !taskIds.includes(task.id));
  const full = taskIds.length >= DAILY_PRIORITY_LIMIT;
  const remaining = remainingFocusMs(session, now);
  const activeTask = tasks.find(task => task.id === session?.taskId);
  const disabled = pending || !ready;
  const finished = daily.length > 0 && completeCount === daily.length;

  useEffect(() => {
    if (!session) return;
    const updateClock = () => setNow(Date.now());
    updateClock();
    const timer = setInterval(updateClock, 1000);
    window.addEventListener("focus", updateClock);
    document.addEventListener("visibilitychange", updateClock);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", updateClock);
      document.removeEventListener("visibilitychange", updateClock);
    };
  }, [session]);

  const capture = async event => {
    event.preventDefault();
    if (!newTask.trim()) return;
    const saved = await addTask(newTask, destination === "today" && !full);
    if (saved) setNewTask("");
  };

  return (
    <section aria-labelledby="daily-plan-heading" aria-busy={pending || !ready} className="daily-planner mb-6 rounded-2xl border border-yellow-400/25 bg-[#111] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-1 text-xs text-gray-400">{new Date(`${today}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</p>
          <h2 id="daily-plan-heading" className="flex items-center gap-2 text-xl font-semibold text-yellow-400"><Target size={21} aria-hidden="true" /> Your day</h2>
        </div>
        {ready && <span className="text-sm text-gray-300">{completeCount}/{daily.length} priorities complete</span>}
      </div>

      {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
        <p>{error}</p>
        <button type="button" onClick={retry} disabled={pending} className="mt-1 underline underline-offset-4">Retry connection</button>
      </div>}

      {!ready ? <p role="status" className="py-6 text-sm text-gray-300">Loading your daily plan...</p> : <>
        {session ? (
          <div className="mb-5 rounded-xl border border-yellow-400/25 bg-yellow-400/5 p-4" aria-label="Focus session">
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">{remaining === 0 ? "Session finished" : session.status === "paused" ? "Focus paused" : "One thing at a time"}</p>
            <h3 className="mt-2 break-words text-lg font-semibold">{session.taskText}</h3>
            <p role="timer" aria-label="Focus time remaining" className="my-4 font-display text-4xl tabular-nums text-yellow-300">{formatCountdown(remaining)}</p>
            <p role="status" className="mb-4 text-sm text-gray-300">{remaining === 0 ? "Time is up. Is the task done, or does it need another session?" : "Your timer stays with you when you leave or close the app."}</p>
            <div className="flex flex-wrap gap-2">
              {remaining > 0 && <button disabled={disabled} onClick={() => controlFocus(session.status === "paused" ? "resume" : "pause")} className={secondaryButton}>
                {session.status === "paused" ? <Play size={16} className="mr-2 inline" /> : <Pause size={16} className="mr-2 inline" />}{session.status === "paused" ? "Resume" : "Pause"}
              </button>}
              {activeTask && !activeTask.done && <button disabled={disabled} onClick={() => toggleTask(activeTask)} className={primaryButton}><Check size={16} /> Mark task done</button>}
              <button disabled={disabled} onClick={() => controlFocus("end")} className={secondaryButton}>{remaining === 0 ? "Keep task open" : "End session"}</button>
            </div>
          </div>
        ) : nextTask ? (
          <div className="mb-5 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">Up next</p>
            <h3 className="my-2 break-words text-lg font-semibold">{nextTask.text}</h3>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-xs text-gray-300">Focus length
                <select value={minutes} onChange={event => setMinutes(Number(event.target.value))} className="mt-1 block min-h-11 rounded-lg border border-white/15 bg-[#1a1a1a] px-3 text-base text-white">
                  <option value={15}>15 minutes</option><option value={25}>25 minutes</option><option value={50}>50 minutes</option>
                </select>
              </label>
              <button disabled={disabled} onClick={() => startFocus(nextTask, minutes)} className={primaryButton}><Play size={16} /> Start focus</button>
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded-xl bg-white/5 p-4">
            <h3 className="font-semibold text-gray-100">{finished ? "Your priorities are complete." : "What would make today a good day?"}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">{finished ? "You've done what you planned. Capture anything else in Later, or take a break." : "Choose up to three concrete tasks. Start with one small enough to act on now; keep everything else in Later."}</p>
          </div>
        )}

        {daily.length > 0 && <>
          <div role="progressbar" aria-label="Daily priority completion" aria-valuenow={completeCount} aria-valuemin={0} aria-valuemax={daily.length} className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-yellow-400 transition-[width]" style={{ width: `${completeCount / daily.length * 100}%` }} />
          </div>
          <ol aria-label="Today's priorities" className="mb-5 space-y-2">
            {daily.map((task, index) => <li key={task.id} className="flex items-start gap-2 rounded-xl border border-white/10 bg-[#1a1a1a] p-2">
              <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                <input type="checkbox" checked={Boolean(task.done)} disabled={disabled} onChange={() => toggleTask(task)} aria-label={`Mark ${task.text} ${task.done ? "incomplete" : "done"}`} className="h-5 w-5 cursor-pointer accent-yellow-400" />
              </label>
              <div className="min-w-0 flex-1 py-2">
                <p className={`break-words text-sm ${task.done ? "text-gray-400 line-through" : "text-gray-100"}`}>{task.text}</p>
                {!task.done && <p className="mt-1 text-xs text-gray-400">{session?.taskId === task.id ? "In focus" : index === daily.findIndex(item => !item.done) ? "Next priority" : "After that"}</p>}
              </div>
              {!task.done && <div className="flex shrink-0">
                {task.id !== nextTask?.id && <button disabled={disabled || Boolean(session)} onClick={() => changePlan(task, "first")} aria-label={`Make ${task.text} next`} title="Make next" className="rounded-lg px-3 text-gray-300 hover:bg-white/10 disabled:opacity-40"><ArrowUp size={16} /></button>}
                <button disabled={disabled || session?.taskId === task.id} onClick={() => changePlan(task, "remove")} aria-label={`Move ${task.text} to Later`} title="Move to Later" className="rounded-lg px-3 text-gray-300 hover:bg-white/10 disabled:opacity-40"><ArrowDown size={16} /></button>
              </div>}
            </li>)}
          </ol>
        </>}

        <form onSubmit={capture} className="border-t border-white/10 pt-4">
          <label htmlFor="capture-task" className="mb-2 block text-sm font-medium text-gray-200">Capture a task</label>
          <input id="capture-task" value={newTask} maxLength={240} onChange={event => setNewTask(event.target.value)} placeholder="e.g. Draft the first page of my proposal" className="min-h-11 w-full min-w-0 rounded-lg border border-white/20 bg-[#1a1a1a] px-3 py-2 text-white placeholder:text-gray-500" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select aria-label="Add task to" value={full ? "later" : destination} onChange={event => setDestination(event.target.value)} className="min-h-11 rounded-lg border border-white/15 bg-[#1a1a1a] px-3 text-base">
              <option value="today" disabled={full}>Today ({daily.length}/3)</option><option value="later">Later</option>
            </select>
            <button type="submit" disabled={disabled || !newTask.trim()} className={secondaryButton}><Plus size={16} aria-hidden="true" className="mr-1 inline" />Add task</button>
            <span role="status" className="text-xs text-gray-400">{pending ? "Saving..." : full ? "Your day is full. New tasks go to Later." : `${DAILY_PRIORITY_LIMIT - daily.length} priority ${DAILY_PRIORITY_LIMIT - daily.length === 1 ? "slot" : "slots"} available`}</span>
          </div>
        </form>

        <details className="mt-5 border-t border-white/10 pt-2" open={daily.length === 0 || undefined}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-200">Later ({later.length})<ChevronDown size={16} aria-hidden="true" /></summary>
          <p className="mb-3 text-xs leading-relaxed text-gray-400">Unfinished tasks stay here until you choose them again. Each day starts with a fresh plan.</p>
          {later.length === 0 ? <p className="py-2 text-sm text-gray-400">Nothing waiting. Capture an idea above when it comes to you.</p> : <ul className="space-y-2">
            {later.slice(0, visibleLater).map(task => <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/5 p-3">
              <div className="flex min-w-0 flex-1 items-start gap-1">
                <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                  <input type="checkbox" checked={false} disabled={disabled} onChange={() => toggleTask(task)} aria-label={`Mark ${task.text} done`} className="h-5 w-5 cursor-pointer accent-yellow-400" />
                </label>
                <div className="min-w-0 flex-1 py-2"><p className="break-words text-sm text-gray-200">{task.text}</p>{task.lastPlannedOn && task.lastPlannedOn < today && <p className="mt-1 text-xs text-gray-400">From an earlier day</p>}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button disabled={disabled || full} onClick={() => changePlan(task, "add")} aria-label={`Plan ${task.text} today`} className={secondaryButton}>Do today</button>
                <button disabled={disabled || session?.taskId === task.id} onClick={() => archiveTask(task)} aria-label={`Archive ${task.text}`} title="Archive task" className="rounded-lg px-3 text-gray-400 hover:bg-white/10 disabled:opacity-40"><Archive size={16} /></button>
              </div>
            </li>)}
          </ul>}
          {later.length > visibleLater && <button onClick={() => setVisibleLater(value => value + 8)} className={`${secondaryButton} mt-3`}>Show more tasks</button>}
        </details>

        {completed.length > 0 && <details className="mt-2 border-t border-white/10 pt-2">
          <summary className="min-h-11 cursor-pointer py-3 text-sm text-gray-400">Completed tasks ({completed.length})</summary>
          <ul className="space-y-2">{completed.map(task => <li key={task.id} className="flex items-center justify-between gap-3 text-sm text-gray-400"><span className="min-w-0 break-words line-through">{task.text}</span><button disabled={disabled} onClick={() => toggleTask(task)} className={secondaryButton} aria-label={`Reopen ${task.text}`}>Reopen</button></li>)}</ul>
        </details>}
        {archived.length > 0 && <details className="mt-2 border-t border-white/10 pt-2">
          <summary className="min-h-11 cursor-pointer py-3 text-sm text-gray-400">Archived tasks ({archived.length})</summary>
          <ul className="space-y-2">{archived.map(task => <li key={task.id} className="flex items-center justify-between gap-3 text-sm text-gray-400"><span className="min-w-0 break-words">{task.text}</span><button disabled={disabled} onClick={() => archiveTask(task)} className={secondaryButton} aria-label={`Restore ${task.text}`}>Restore</button></li>)}</ul>
        </details>}
      </>}
    </section>
  );
}
