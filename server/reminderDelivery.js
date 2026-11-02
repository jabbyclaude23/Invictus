import { createHash } from 'node:crypto';
export const digest = text => createHash('sha256').update(text).digest('hex');
export function validSubscription(value) {
  if (!value || typeof value.endpoint!=='string' || value.endpoint.length>2048) return false;
  let url;try{url=new URL(value.endpoint);}catch{return false;}
  const trusted = url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' || url.hostname.endsWith('.push.apple.com') || url.hostname.endsWith('.notify.windows.com');
  return trusted && url.protocol==='https:' && !url.username && !url.password && (!url.port||url.port==='443') && /^[A-Za-z0-9_-]{80,120}$/.test(value.keys?.p256dh||'') && /^[A-Za-z0-9_-]{20,30}$/.test(value.keys?.auth||'');
}
export async function deliverOnce({store,send,subscriptionRef,subscription,event,now=Date.now()}) {
  const reference=subscriptionRef.parent.parent.collection('reminder_deliveries').doc(digest(event.id+'|'+event.at+'|'+subscriptionRef.id));
  const claimed=await store.runTransaction(async transaction=>{
    const current=await transaction.get(reference),state=current.data();
    if(state?.status==='sent'||(state?.leaseUntil||0)>now)return false;
    transaction.set(reference,{eventId:event.id,scheduledAt:event.at,status:'sending',leaseUntil:now+120000,expiresAt:new Date(now+7*86400000)});
    return true;
  });
  if(!claimed)return 'duplicate';
  try {
    await send(subscription,JSON.stringify(event),{TTL:300,urgency:'high',timeout:10000});
    await reference.set({status:'sent',sentAt:now,leaseUntil:0},{merge:true});
    return 'sent';
  }catch(error){
    if(error.statusCode===404||error.statusCode===410){await subscriptionRef.delete();return 'expired';}
    await reference.set({status:'retry',leaseUntil:0},{merge:true});
    throw new Error('Push service rejected a reminder.');
  }
}
