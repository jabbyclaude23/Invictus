import test from 'node:test';
import assert from 'node:assert/strict';
import { validSubscription, deliverOnce } from '../server/reminderDelivery.js';
import handler from '../api/reminders.js';
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/example',keys:{p256dh:'a'.repeat(87),auth:'a'.repeat(22)}};
test('push registration allows trusted services and rejects SSRF endpoints',()=>{
  assert.ok(validSubscription(subscription));
  for(const endpoint of ['http://fcm.googleapis.com/path','https://127.0.0.1/','https://fcm.googleapis.com.evil.test/','https://user:password@fcm.googleapis.com/path','https://fcm.googleapis.com:8443/path'])assert.equal(validSubscription({...subscription,endpoint}),false);
  assert.equal(validSubscription({...subscription,keys:{auth:'bad'}}),false);
});
function fakeStore(){
  let saved;
  const reference={set:async(value,options)=>{saved=options?.merge?{...saved,...value}:value;}};
  const store={runTransaction:async callback=>callback({get:async()=>({data:()=>saved}),set:(_ref,value)=>{saved=value;}})};
  const subscriptionRef={id:'device',parent:{parent:{collection:()=>({doc:()=>reference})}},delete:async()=>{}};
  return {store,subscriptionRef,read:()=>saved};
}
test('repeated dispatches send a reminder once after a successful delivery',async()=>{
  const state=fakeStore();let calls=0;const args={...state,subscription,event:{id:'fajr',at:900},now:1000,send:async()=>{calls++;}};
  assert.equal(await deliverOnce(args),'sent');
  assert.equal(await deliverOnce(args),'duplicate');
  assert.equal(calls,1);
});
test('failed delivery releases its claim for retry and expired endpoints are removed',async()=>{
  const state=fakeStore();
  await assert.rejects(deliverOnce({...state,subscription,event:{id:'a',at:900},now:1000,send:async()=>{throw new Error('Network');}}));
  assert.equal(state.read().status,'retry');
  assert.equal(await deliverOnce({...state,subscription,event:{id:'a',at:900},now:1000,send:async()=>{}}),'sent');
  let removed=false;
  assert.equal(await deliverOnce({...fakeStore(),subscriptionRef:{...state.subscriptionRef,id:'expired',delete:async()=>{removed=true;}},subscription,event:{id:'b',at:900},now:2000,send:async()=>{throw {statusCode:410};}}),'expired');
  assert.ok(removed);
});
const response=()=>({headers:{},setHeader(key,value){this.headers[key]=value;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('dispatch is inaccessible without the cron bearer secret',async()=>{
  const res=response();await handler({method:'GET',query:{action:'dispatch'},headers:{}},res);
  assert.equal(res.code,401);
});
test('public status is honest about unconfigured background delivery and reveals no secrets',async()=>{
  const res=response();await handler({method:'GET',query:{},headers:{}},res);
  assert.equal(res.code,200);assert.equal(res.body.ready,false);
  assert.deepEqual(Object.keys(res.body).sort(),['publicKey','ready']);
});
