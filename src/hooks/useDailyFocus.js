import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useCoach } from '../context/useCoach';
import { localDayKey } from '../lib/dashboard';
import { normalizeCheckinPatch } from '../lib/performance';

export default function useDailyFocus() {
  const { user } = useCoach();
  const [date, setDate] = useState(localDayKey);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    const check = () => setDate(localDayKey());
    const timer = setInterval(check, 30000);
    window.addEventListener('focus', check);
    return () => { clearInterval(timer); window.removeEventListener('focus', check); };
  }, []);
  useEffect(() => {
    setData(null); setError(''); setLoading(true); setLoaded(false);
    if (!user) { setLoading(false); return; }
    return onSnapshot(doc(db, 'users', user.uid, 'daily_checkins', date), snapshot => {
      setData(snapshot.exists() ? snapshot.data() : null); setLoading(false); setLoaded(true);
    }, () => { setError('Your daily plan could not be loaded. Try again.'); setLoading(false); });
  }, [user, date, attempt]);
  const save = useCallback(async patch => {
    if (!user || busy.current || loading || !loaded) return false;
    if (date !== localDayKey()) { setDate(localDayKey()); return false; }
    let next;
    try { next = normalizeCheckinPatch(patch); } catch (err) { setError(err.message); return false; }
    busy.current = true; setPending(true); setError('');
    try {
      await setDoc(doc(db, 'users', user.uid, 'daily_checkins', date), { ...next, date, updatedAt: new Date(), ...(!data ? { createdAt: new Date() } : {}) }, { merge: true });
      return true;
    } catch { setError('Your daily plan could not be saved. Please try again.'); return false; }
    finally { busy.current = false; setPending(false); }
  }, [user, loading, loaded, date, data]);
  return { data, date, loading, loaded, pending, error, save, retry: () => setAttempt(value => value + 1) };
}
