import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, runTransaction, writeBatch } from "firebase/firestore";
import { auth, db } from "../firebase";
import { addPriority, localDateKey, remainingFocusMs } from "../data/dailyPlanner";

export default function useDailyPlanner() {
  const [uid, setUid] = useState(null);
  const [today, setToday] = useState(() => localDateKey());
  const [tasks, setTasks] = useState([]);
  const [taskIds, setTaskIds] = useState([]);
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const busyRef = useRef(false);

  useEffect(() => auth.onAuthStateChanged(user => {
    setUid(user?.uid ?? null);
    setTasks([]);
    setTaskIds([]);
    setSession(null);
    setLoaded({});
    setError("");
  }), []);

  useEffect(() => {
    const refreshDate = () => setToday(localDateKey());
    const timer = setInterval(refreshDate, 1000);
    window.addEventListener("focus", refreshDate);
    document.addEventListener("visibilitychange", refreshDate);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshDate);
      document.removeEventListener("visibilitychange", refreshDate);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    setLoaded({});
    setTaskIds([]);
    const failed = () => setError("Could not load your plan. Check your connection and retry.");
    const unsubs = [
      onSnapshot(collection(db, "users", uid, "todos"), snapshot => {
        const items = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
        items.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
        setTasks(items);
        setLoaded(value => ({ ...value, tasks: true }));
      }, failed),
      onSnapshot(doc(db, "users", uid, "daily_checkins", today), snapshot => {
        // Carry today's existing priority list into the task planner exactly once.
        if (!Array.isArray(snapshot.data()?.taskIds) && snapshot.data()?.priorities?.some(item => item.text?.trim())) {
          void runTransaction(db, async transaction => {
            const reference = doc(db, "users", uid, "daily_checkins", today);
            const current = await transaction.get(reference);
            if (Array.isArray(current.data()?.taskIds)) return;
            const priorities = (current.data()?.priorities ?? []).filter(item => item.text?.trim()).slice(0, 3);
            const ids = priorities.map((_, index) => `daily-${today}-${index}`);
            priorities.forEach((item, index) => transaction.set(doc(db, "users", uid, "todos", ids[index]), {
              text: item.text, done: Boolean(item.done), createdAt: new Date(), lastPlannedOn: today,
              ...(item.done ? { completedOn: today } : {}),
            }));
            transaction.set(reference, { taskIds: ids }, { merge: true });
          }).catch(failed);
          return;
        }
        setTaskIds(snapshot.data()?.taskIds ?? []);
        setLoaded(value => ({ ...value, plan: true }));
      }, failed),
      onSnapshot(doc(db, "users", uid, "focus_session", "current"), snapshot => {
        setSession(snapshot.exists() ? snapshot.data() : null);
        setLoaded(value => ({ ...value, session: true }));
      }, failed),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, [uid, today, retry]);

  const ready = Boolean(uid && loaded.tasks && loaded.plan && loaded.session);

  // Keep input on failure and prevent double submissions before React rerenders.
  const perform = async operation => {
    if (!ready || busyRef.current) return false;
    if (today !== localDateKey()) {
      setToday(localDateKey());
      return false;
    }
    if (!navigator.onLine) {
      setError("You're offline. Reconnect to save changes; your existing plan is still here.");
      return false;
    }
    busyRef.current = true;
    setPending(true);
    setError("");
    try {
      await operation();
      return true;
    } catch (err) {
      setError(err.code ? "Could not save that change. Check your connection and try again." : err.message);
      return false;
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  };

  const planRef = () => doc(db, "users", uid, "daily_checkins", today);
  const focusRef = () => doc(db, "users", uid, "focus_session", "current");
  const taskRef = id => doc(db, "users", uid, "todos", id);

  const readTasks = async (transaction, ids) => {
    const snapshots = await Promise.all(ids.map(id => transaction.get(taskRef(id))));
    return snapshots.filter(snapshot => snapshot.exists()).map(snapshot => ({ ...snapshot.data(), id: snapshot.id }));
  };
  const savePlan = (transaction, ids, selected) => transaction.set(planRef(), {
    taskIds: ids, date: today, updatedAt: new Date(),
    priorities: ids.map(id => selected.find(task => task.id === id)).filter(Boolean).map(task => ({ text: task.text, done: Boolean(task.done) })),
  }, { merge: true });

  const addTask = (text, forToday) => perform(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const ref = doc(collection(db, "users", uid, "todos"));
    await runTransaction(db, async transaction => {
      const plan = forToday ? await transaction.get(planRef()) : null;
      const selected = forToday ? await readTasks(transaction, plan.data()?.taskIds ?? []) : [];
      const ids = forToday ? addPriority(selected.map(task => task.id), ref.id) : null;
      const item = {
        text: trimmed.slice(0, 240), done: false, createdAt: new Date(),
        ...(forToday ? { lastPlannedOn: today } : {}),
      };
      transaction.set(ref, item);
      if (forToday) savePlan(transaction, ids, [...selected, { ...item, id: ref.id }]);
    });
  });

  const changePlan = (task, action) => perform(() => runTransaction(db, async transaction => {
    const plan = await transaction.get(planRef());
    const existingTask = await transaction.get(taskRef(task.id));
    if (!existingTask.exists()) throw new Error("This task no longer exists. Choose another task.");
    const selected = await readTasks(transaction, plan.data()?.taskIds ?? []);
    let ids = selected.map(task => task.id);
    if (action === "add") {
      if (existingTask.data().done || existingTask.data().archived) throw new Error("Choose an open task to plan today.");
      ids = addPriority(ids, task.id);
      transaction.update(taskRef(task.id), { lastPlannedOn: today });
    } else if (action === "remove") {
      ids = ids.filter(id => id !== task.id);
    } else {
      if (!ids.includes(task.id)) throw new Error("Add this task to today first.");
      ids = [task.id, ...ids.filter(id => id !== task.id)];
    }
    savePlan(transaction, ids, [...selected, { ...existingTask.data(), id: task.id }]);
  }));

  const toggleTask = task => perform(() => runTransaction(db, async transaction => {
    const plan = await transaction.get(planRef());
    const currentTask = await transaction.get(taskRef(task.id));
    const currentFocus = await transaction.get(focusRef());
    const selected = await readTasks(transaction, plan.data()?.taskIds ?? []);
    if (!currentTask.exists()) throw new Error("This task no longer exists.");
    const done = !currentTask.data().done;
    transaction.update(taskRef(task.id), {
      done, completedOn: done ? today : null,
      completedAt: done ? new Date() : null,
    });
    if (currentFocus.data()?.taskId === task.id) transaction.delete(focusRef());
    if (selected.some(item => item.id === task.id)) savePlan(transaction, selected.map(item => item.id), selected.map(item => item.id === task.id ? { ...item, done } : item));
  }));

  const archiveTask = task => perform(async () => {
    const batch = writeBatch(db);
    batch.update(taskRef(task.id), { archived: !task.archived });
    await batch.commit();
  });

  const startFocus = (task, minutes) => perform(() => runTransaction(db, async transaction => {
    const current = await transaction.get(focusRef());
    const currentTask = await transaction.get(taskRef(task.id));
    if (current.exists()) throw new Error("Finish or end your current focus session first.");
    if (!currentTask.exists() || currentTask.data().done) throw new Error("Choose an unfinished task to focus on.");
    const startedAt = Date.now();
    transaction.set(focusRef(), {
      taskId: task.id, taskText: currentTask.data().text, status: "running",
      startedAt, endsAt: startedAt + minutes * 60000, remainingMs: minutes * 60000,
    });
  }));

  const controlFocus = action => perform(() => runTransaction(db, async transaction => {
    const current = await transaction.get(focusRef());
    if (!current.exists()) return;
    const focus = current.data();
    if (focus.startedAt !== session?.startedAt) throw new Error("Your focus session changed on another device. Try again.");
    if (action === "end") {
      transaction.delete(focusRef());
    } else if (action === "pause" && focus.status === "running") {
      transaction.update(focusRef(), { status: "paused", remainingMs: remainingFocusMs(focus) });
    } else if (action === "resume" && focus.status === "paused") {
      transaction.update(focusRef(), { status: "running", endsAt: Date.now() + focus.remainingMs });
    }
  }));

  return {
    today, tasks, taskIds, session, pending, error, ready,
    addTask, changePlan, toggleTask, archiveTask, startFocus, controlFocus,
    retry: () => { setError(""); setRetry(value => value + 1); },
  };
}
