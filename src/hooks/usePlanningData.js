import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useCoach } from '../context/useCoach';
import { zonedDay } from '../lib/planningTime';
import { DEFAULT_PRAYER } from '../lib/prayerTimes';
export const DEFAULT_SETTINGS = { start: '08:00', end: '21:00', breakMinutes: 5, prayer: DEFAULT_PRAYER, quietEnabled: true, quietStart: '22:00', quietEnd: '07:00', scheduleReminders: true };
export default function usePlanningData(requestedDay) {
  const { user } = useCoach();
  const [today, setDay] = useState(zonedDay);
  const day = requestedDay || today;
  const [raw, setRaw] = useState({});
  const [loaded, setLoaded] = useState({});
  const [loadedFor, setLoadedFor] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  useEffect(() => { const check = () => setDay(zonedDay()); const timer = setInterval(check, 30000); window.addEventListener('focus', check); return () => {clearInterval(timer);window.removeEventListener('focus',check);}; }, []);
  useEffect(() => {
    setRaw({}); setLoaded({}); setError('');
    setLoadedFor((user?.uid||'')+'-'+day+'-'+attempt);
    if (!user) return;
    const watch = (key, reference, list) => onSnapshot(reference, snapshot => {
      setRaw(value => ({ ...value, [key]: list ? snapshot.docs.map(item => ({ ...item.data(), id: item.id })) : snapshot.data() || {} }));
      setLoaded(value => ({ ...value, [key]: true }));
    }, () => setError('Could not load your planning data. Check your connection and retry.'));
    const unsubs = ['todos','goals','routines','schedule'].map(key => watch(key, collection(db,'users',user.uid,key), true));
    unsubs.push(watch('snoozes',collection(db,'users',user.uid,'reminder_snoozes'),true));
    for (const [key, name, id] of [['settings','planning_settings','info'], ['dayPlan','day_schedules',day], ['priorities','daily_checkins',day], ['routineLog','routine_logs',day], ['focus','focus_session','current']]) unsubs.push(watch(key,doc(db,'users',user.uid,name,id),false));
    return () => unsubs.forEach(unsub => unsub());
  }, [user, day, attempt]);
  const ready = Boolean(user && loadedFor===user.uid+'-'+day+'-'+attempt && Object.keys(loaded).length === 10);
  async function mutate(operation) {
    if (!ready || busy.current) return false;
    if(!requestedDay&&day!==zonedDay()){setDay(zonedDay());return false;}
    if (auth.currentUser?.uid !== user.uid) { setError('Please sign in again.'); return false; }
    if (!navigator.onLine) { setError('Reconnect to save changes.'); return false; }
    busy.current = true; setPending(true); setError('');
    try { await operation(user.uid); return true; }
    catch (err) { setError(err.code ? 'Could not save. Please try again.' : err.message); return false; }
    finally { busy.current = false; setPending(false); }
  }
  const settings = { ...DEFAULT_SETTINGS, ...raw.settings, prayer: { ...DEFAULT_PRAYER, ...raw.settings?.prayer } };
  return { ...raw, tasks:raw.todos||[], goals:raw.goals||[], routines:raw.routines||[], legacySchedule:raw.schedule||[], settings, dayPlan:raw.dayPlan||{}, priorities:raw.priorities||{}, routineLog:raw.routineLog||{}, user, day, ready, pending, error, mutate,
    saveSettings: patch => mutate(uid => setDoc(doc(db,'users',uid,'planning_settings','info'), patch, {merge:true})),
    retry: () => setAttempt(value=>value+1),
  };
}
