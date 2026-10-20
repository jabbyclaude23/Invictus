import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { legacyHabitDayKey } from '../lib/dashboard';

export default function useDashboardData() {
  const [user, setUser] = useState(null);
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const day = useRef(legacyHabitDayKey());

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const [habitDocs, statDocs] = await Promise.all([
        getDocs(query(collection(db, 'users', user.uid, 'habits'), orderBy('createdAt'))),
        getDocs(query(collection(db, 'users', user.uid, 'stats'), orderBy('createdAt'))),
      ]);
      const key = legacyHabitDayKey();
      const snapshotBatch = writeBatch(db);
      let snapshotsToSave = 0;
      await Promise.all(statDocs.docs.map(async item => {
        const ref = doc(db, 'users', user.uid, 'stats', item.id, 'history', key);
        const existing = await getDoc(ref);
        if (!existing.exists()) {
          snapshotBatch.set(ref, { date: key, value: item.data().value ?? 0 });
          snapshotsToSave += 1;
        }
      }));
      if (snapshotsToSave) await snapshotBatch.commit();
      const rows = await Promise.all(habitDocs.docs.map(async d => {
        const progress = await getDoc(doc(db, 'users', user.uid, 'habits', d.id, 'progress', key));
        return { ...d.data(), id: d.id, progress: progress.exists() ? progress.data().progress || 0 : 0 };
      }));
      day.current = key;
      setHabits(rows);
      setStats(statDocs.docs.map(d => ({ ...d.data(), id: d.id })));
    } catch {
      setError('Your dashboard could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) reload(); }, [user, reload]);
  useEffect(() => {
    // Read the new day's data without overwriting it with yesterday's progress.
    const checkDay = () => { if (day.current !== legacyHabitDayKey()) reload(); };
    const timer = setInterval(checkDay, 30000);
    window.addEventListener('focus', checkDay);
    return () => { clearInterval(timer); window.removeEventListener('focus', checkDay); };
  }, [reload]);

  const mutate = async (operation) => {
    if (!user || busy.current) return false;
    busy.current = true;
    setPending(true);
    setError('');
    try { await operation(); return true; }
    catch { setError('That change could not be saved. Please try again.'); return false; }
    finally { busy.current = false; setPending(false); }
  };

  const updateHabit = (id, progress) => {
    if (day.current !== legacyHabitDayKey()) { reload(); return Promise.resolve(false); }
    return mutate(async () => {
    const habit = habits.find(h => h.id === id);
    const key = legacyHabitDayKey();
    await setDoc(doc(db, 'users', user.uid, 'habits', id, 'progress', key), {
      progress, date: key, completed: progress >= (Number(habit?.target) || 1),
    }, { merge: true });
    setHabits(rows => rows.map(h => h.id === id ? { ...h, progress } : h));
    });
  };

  const updateStat = (id, value) => mutate(async () => {
    if (!Number.isFinite(value)) throw new Error('Invalid value');
    const batch = writeBatch(db);
    const key = legacyHabitDayKey();
    batch.set(doc(db, 'users', user.uid, 'stats', id), { value, updatedAt: new Date() }, { merge: true });
    batch.set(doc(db, 'users', user.uid, 'stats', id, 'history', key), { date: key, value }, { merge: true });
    await batch.commit();
    setStats(rows => rows.map(s => s.id === id ? { ...s, value } : s));
  });

  const remove = (kind, id) => {
    if (!window.confirm(`Delete this ${kind === 'habits' ? 'habit' : 'stat'}?`)) return;
    return mutate(async () => {
      await deleteDoc(doc(db, 'users', user.uid, kind, id));
      (kind === 'habits' ? setHabits : setStats)(rows => rows.filter(row => row.id !== id));
    });
  };

  return { user, habits, stats, loading, error, pending, reload, updateHabit, updateStat,
    removeHabit: id => remove('habits', id), removeStat: id => remove('stats', id),
    addHabit: habit => setHabits(rows => [...rows, habit]),
    editHabit: habit => setHabits(rows => rows.map(h => h.id === habit.id ? habit : h)),
    addStat: stat => setStats(rows => [...rows, stat]),
  };
}
