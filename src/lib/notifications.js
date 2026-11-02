import { auth } from '../firebase';
export async function reminderRequest(body) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in to manage reminders.');
  const response = await fetch('/api/reminders', { method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body) });
  const result = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(result.error || 'Could not update reminders.');
  return result;
}
function publicKeyBytes(value) {
  const string = atob(value.replaceAll('-','+').replaceAll('_','/'));
  return Uint8Array.from(string, character=>character.charCodeAt(0));
}
export async function subscribeReminders(config, permissionPromise) {
  const permission = await permissionPromise;
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser or device settings.');
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) throw new Error('Open the installed production app, then try again.');
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:publicKeyBytes(config.publicKey)});
  try { await reminderRequest({ action:'subscribe', subscription:subscription.toJSON() }); }
  catch (error) { await subscription.unsubscribe(); throw error; }
  return subscription;
}
