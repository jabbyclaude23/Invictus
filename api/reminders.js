import { timingSafeEqual } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';
import { digest, validSubscription, deliverOnce } from '../server/reminderDelivery.js';
import { reminderEvents, dueEvents } from '../src/lib/reminderEvents.js';
import { zonedDay } from '../src/lib/planningTime.js';
export const config = { maxDuration: 60 };
const hasConfig = () => Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON&&process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY);
function services() {
  if(!hasConfig())throw new Error('Background notifications are not configured.');
  if(!getApps().length)initializeApp({credential:cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))});
  webpush.setVapidDetails('https://invictus-app.vercel.app',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
  return {store:getFirestore(),auth:getAuth()};
}
function authorizedCron(header){
  const expected='Bearer '+(process.env.CRON_SECRET||'');
  return Boolean(process.env.CRON_SECRET&&typeof header==='string'&&header.length===expected.length&&timingSafeEqual(Buffer.from(header),Buffer.from(expected)));
}
async function dispatch(store) {
  const now=Date.now(),day=zonedDay(new Date(now)),cache=new Map();
  const subscriptions=await store.collectionGroup('push_subscriptions').limit(500).get();
  const counts={sent:0,duplicate:0,expired:0,failed:0};
  for(const item of subscriptions.docs){
    const uid=item.ref.parent.parent?.id;
    if(!uid||item.ref.parent.parent.parent.id!=='users')continue;
    if(!cache.has(uid)){
      const user=store.collection('users').doc(uid);
      const [settings,schedule,log,routines,snoozes,tasks]=await Promise.all([
        user.collection('planning_settings').doc('info').get(),user.collection('day_schedules').doc(day).get(),user.collection('routine_logs').doc(day).get(),
        user.collection('routines').get(),user.collection('reminder_snoozes').get(),user.collection('todos').get(),
      ]);
      const list=snapshot=>snapshot.docs.map(row=>({...row.data(),id:row.id}));
      const input={settings:settings.data()||{},schedule:schedule.data()||{},routineLog:log.data()||{},routines:list(routines),tasks:list(tasks)};
      cache.set(uid,[...reminderEvents(day,input),...list(snoozes)]);
    }
    const subscription=item.data();
    if(!validSubscription(subscription.subscription))continue;
    for(const event of dueEvents(cache.get(uid),now,subscription.enabledAt||now)){
      try{const status=await deliverOnce({store,send:webpush.sendNotification.bind(webpush),subscriptionRef:item.ref,subscription:subscription.subscription,event,now});counts[status]++;}
      catch{counts.failed++;}
    }
  }
  return counts;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&req.query?.action!=='dispatch')return res.status(200).json({ready:hasConfig()&&process.env.REMINDERS_SCHEDULER_ENABLED==='true',publicKey:process.env.VAPID_PUBLIC_KEY||null});
  if(req.method==='GET'&&req.query?.action==='dispatch'){
    if(!authorizedCron(req.headers.authorization))return res.status(401).json({error:'Unauthorized'});
    if(!hasConfig())return res.status(503).json({error:'Reminder delivery is not configured.'});
    try{return res.status(200).json(await dispatch(services().store));}catch{return res.status(500).json({error:'Reminder dispatch failed.'});}
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed.'});}
  if(!hasConfig())return res.status(503).json({error:'Background reminders need server setup.'});
  let user,store;
  try{const service=services();store=service.store;user=await service.auth.verifyIdToken(String(req.headers.authorization||'').replace(/^Bearer /,''),true);}
  catch{return res.status(401).json({error:'Please sign in again.'});}
  const body=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body);}catch{return {};}})():req.body||{};
  const subscriptions=store.collection('users').doc(user.uid).collection('push_subscriptions');
  try{
    if(body.action==='subscribe'){
      if(!validSubscription(body.subscription))return res.status(400).json({error:'Invalid push subscription.'});
      if(process.env.REMINDERS_SCHEDULER_ENABLED!=='true')return res.status(503).json({error:'The background scheduler is not active.'});
      const reference=subscriptions.doc(digest(body.subscription.endpoint));
      const existing=await reference.get();
      if(!existing.exists&&(await subscriptions.limit(8).get()).size>=8)return res.status(409).json({error:'Remove an old device subscription before adding another.'});
      await reference.set({subscription:body.subscription,enabledAt:existing.data()?.enabledAt||Date.now(),updatedAt:new Date()});
    }else if(body.action==='unsubscribe'){
      if(typeof body.endpoint!=='string'||body.endpoint.length>2048)return res.status(400).json({error:'Invalid endpoint.'});
      await subscriptions.doc(digest(body.endpoint)).delete();
    }else if(body.action==='test'){
      const devices=await subscriptions.limit(8).get();
      if(devices.empty)return res.status(409).json({error:'Enable this device before testing.'});
      const results=await Promise.allSettled(devices.docs.map(device=>webpush.sendNotification(device.data().subscription,JSON.stringify({id:'test-'+Date.now(),title:'Invictus reminders are connected',body:'Your device can receive prayer and routine alerts.',url:'/plan?tab=prayer',at:Date.now()}),{TTL:60,timeout:10000})));
      if(results.every(result=>result.status==='rejected'))return res.status(502).json({error:'Push delivery failed. Try enabling this device again.'});
    }else return res.status(400).json({error:'Unknown action.'});
    return res.status(200).json({ok:true});
  }catch{return res.status(500).json({error:'Could not update reminders. Try again.'});}
}
