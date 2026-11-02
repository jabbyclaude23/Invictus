import { useEffect, useState } from 'react';
import { reminderRequest, subscribeReminders } from '../lib/notifications';
export default function ReminderSettings({data}) {
  const [config,setConfig] = useState(null),[enabled,setEnabled]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  useEffect(()=>{
    let active=true;
    fetch('/api/reminders').then(async response=>{if(!response.ok)throw new Error();return response.json();}).then(result=>{if(active)setConfig(result);}).catch(()=>{if(active)setConfig({ready:false});});
    if(supported) navigator.serviceWorker.getRegistration().then(registration=>registration?.pushManager.getSubscription()).then(subscription=>{if(active)setEnabled(Boolean(subscription));}).catch(()=>{});
    return()=>{active=false;};
  },[supported]);
  async function act(operation) {setPending(true);setError('');try{await operation();}catch(err){setError(err.message);}finally{setPending(false);}}
  return <section className="panel mt-5"><h2 className="text-base font-semibold">Reminder delivery</h2>
    <p className="mt-2 text-sm leading-6 text-gray-300">In-app reminders appear while Invictus is open. Push alerts require permission on each device. On iPhone, add Invictus to your Home Screen first.</p>
    {!config ? <p role="status" className="mt-3 text-sm text-gray-400">Checking background delivery...</p> : !config.ready ? <p role="status" className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">Background delivery needs server setup. In-app reminders and calendar export work now; closed-app alerts are not active.</p> : <p className="mt-3 text-sm text-gray-300">{enabled?'This device is subscribed to push alerts.':'Background delivery is available. Enable it on this device.'}</p>}
    {!supported && <p className="mt-2 text-xs text-gray-400">Push is unavailable in this browser context. Try the installed app on a supported browser.</p>}
    {config&&!config.ready&&<a className="mt-2 inline-block py-3 text-xs text-gold underline" href="https://github.com/jabbyclaude23/Invictus/blob/main/docs/reminders-setup.md" target="_blank" rel="noreferrer">View reminder setup instructions</a>}
    {error&&<p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      <button className="button-primary" disabled={!supported||!config?.ready||pending||enabled} onClick={()=>{
        const permission = Notification.requestPermission();
        void act(async()=>{await subscribeReminders(config,permission);setEnabled(true);});
      }}>Enable push alerts</button>
      {enabled&&<><button className="button-secondary" disabled={pending||!config?.ready} onClick={()=>act(()=>reminderRequest({action:'test'}))}>Send test alert</button>
      <button className="button-secondary" disabled={pending} onClick={()=>act(async()=>{const registration=await navigator.serviceWorker.getRegistration();const subscription=await registration?.pushManager.getSubscription();if(subscription){await reminderRequest({action:'unsubscribe',endpoint:subscription.endpoint});await subscription.unsubscribe();}setEnabled(false);})}>Disable on this device</button></>}
    </div>
    <div className="mt-5 flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.settings.quietEnabled} disabled={data.pending} onChange={event=>data.saveSettings({quietEnabled:event.target.checked})}/>Quiet hours for routines and focus blocks</label>
      <label className="text-xs text-gray-300">From<input type="time" value={data.settings.quietStart} disabled={data.pending} onChange={event=>data.saveSettings({quietStart:event.target.value})} className="planning-field ml-2"/></label>
      <label className="text-xs text-gray-300">Until<input type="time" value={data.settings.quietEnd} disabled={data.pending} onChange={event=>data.saveSettings({quietEnd:event.target.value})} className="planning-field ml-2"/></label>
    </div>
    <p className="mt-3 text-xs leading-5 text-gray-400">Enabled prayer alerts bypass routine quiet hours, including Fajr. Your device's notification and Focus settings still apply. iPhone web notifications cannot automatically play the full azaan; tap an alert, then play the recording.</p>
  </section>;
}
