import { useState } from 'react';
import { DEFAULT_PRAYER, PRAYERS, PRAYER_NAMES, PRAYER_METHODS, prayerTimes, prayerTimeLabel, nextPrayer, prayerCalendar } from '../lib/prayerTimes';
import ReminderSettings from './ReminderSettings';
export default function PrayerPanel({data}) {
  const [draft,setDraft] = useState(data.settings.prayer || DEFAULT_PRAYER);
  const times=prayerTimes(data.day,draft);
  const next=nextPrayer(Date.now(),data.settings.prayer);
  function patch(value){setDraft(current=>({...current,...value}));}
  function exportCalendar(){
    const url=URL.createObjectURL(new Blob([prayerCalendar(data.day,draft)],{type:'text/calendar;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='ajax-prayer-times.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div><section className="panel">
    <div className="section-heading"><div><h2>Prayer in Ajax, Ontario</h2><p>America/Toronto · Daylight saving adjusts automatically</p></div><span className="text-xs text-gold">{data.day}</span></div>
    <p className="mb-4 text-sm text-gray-300">Next prayer: <strong className="text-gold">{next.title} at {prayerTimeLabel(next.at)}</strong></p>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{times.map(prayer=><div key={prayer.id} className="rounded-xl border border-white/10 p-3"><p className="text-xs text-gray-400">{prayer.title}</p><p className="mt-2 text-lg font-semibold">{prayerTimeLabel(prayer.at)}</p></div>)}</div>
    <p className="mt-4 text-xs leading-6 text-gray-400">Calculated prayer starts, rather than mosque azaan or iqamah times. Check your mosque's timetable and adjust the method or offsets to match.</p>
    <form className="mt-5 space-y-4 border-t border-white/10 pt-5" onSubmit={event=>{event.preventDefault();void data.saveSettings({prayer:draft});}}>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft.enabled} onChange={event=>patch({enabled:event.target.checked})}/>Enable five daily prayer reminders and protect prayer time in my schedule</label>
      <div className="planning-form-grid">
        <label>Calculation method<select value={draft.method} onChange={event=>patch({method:event.target.value})} className="planning-field">{Object.entries(PRAYER_METHODS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label>Asr calculation<select value={draft.madhab} onChange={event=>patch({madhab:event.target.value})} className="planning-field"><option value="Shafi">Standard (Shafi / Maliki / Hanbali)</option><option value="Hanafi">Hanafi</option></select></label>
        <label>Minutes reserved per prayer<input type="number" min="5" max="60" value={draft.blockMinutes} onChange={event=>patch({blockMinutes:Number(event.target.value)})} className="planning-field"/></label>
        <label>Alert before prayer<select value={draft.leadMinutes} onChange={event=>patch({leadMinutes:Number(event.target.value)})} className="planning-field"><option value={0}>At prayer time</option><option value={5}>5 minutes before</option><option value={10}>10 minutes before</option></select></label>
      </div>
      <fieldset><legend className="mb-2 text-sm font-semibold">Prayer alerts and adjustments</legend><div className="grid gap-2">{PRAYERS.map(key=><label key={key} className="flex min-h-11 flex-wrap items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><input type="checkbox" checked={!draft.muted?.includes(key)} onChange={event=>patch({muted:event.target.checked?(draft.muted||[]).filter(item=>item!==key):[...(draft.muted||[]),key]})}/>{PRAYER_NAMES[key]}</span><span className="text-xs text-gray-400">Offset (min)<input aria-label={PRAYER_NAMES[key]+' offset in minutes'} type="number" min="-60" max="60" value={draft.offsets?.[key]||0} onChange={event=>patch({offsets:{...draft.offsets,[key]:Number(event.target.value)}})} className="planning-field ml-2 w-20"/></span></label>)}</div></fieldset>
      <div className="flex flex-wrap gap-2"><button disabled={data.pending} className="button-primary">Save prayer settings</button><button type="button" onClick={exportCalendar} className="button-secondary">Export 30 days to calendar</button></div>
    </form>
    <div className="mt-6 border-t border-white/10 pt-5"><h3 className="mb-3 text-sm font-semibold">Azaan recording</h3><audio controls preload="none" src="/audio/azaan.mp3" aria-label="Play azaan" className="w-full max-w-lg"/><p className="mt-2 text-[11px] leading-5 text-gray-400">Azaan recording by Atcovi, unmodified. <a href="https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3" target="_blank" rel="noreferrer" className="underline">Source</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" className="underline">CC BY-SA 4.0</a>. Tap Play to listen.</p></div>
  </section><ReminderSettings data={data}/></div>;
}
