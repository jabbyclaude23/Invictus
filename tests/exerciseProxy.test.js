import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/exercisedb.js';
async function invoke(query, response={ok:true,json:async()=>({success:true,data:[]})}) {
 const original=globalThis.fetch,originalKey=process.env.EXERCISEDB_API_KEY;let requested;let body;let code=200;
 process.env.EXERCISEDB_API_KEY='fixture-key';
 globalThis.fetch=async url=>{requested=new URL(url);return response;};
 const res={setHeader(){},status(value){code=value;return this;},json(value){body=value;return this;}};
 try {await handler({query},res);return{requested,body,code};}
 finally{globalThis.fetch=original;if(originalKey===undefined)delete process.env.EXERCISEDB_API_KEY;else process.env.EXERCISEDB_API_KEY=originalKey;}
}
test('proxy forwards bounded cursor/equipment parameters supported by provider',async()=>{
 const result=await invoke({type:'name',q:'Shoulder Press',equipment:'Resistance Band',limit:'999',after:'exercise-id'});
 assert.equal(result.requested.searchParams.get('limit'),'25');assert.equal(result.requested.searchParams.get('equipments'),'Resistance Band');assert.equal(result.requested.searchParams.get('after'),'exercise-id');assert.equal(result.requested.searchParams.has('offset'),false);
});
test('body part filter uses provider plural bodyParts parameter',async()=>{
 const result=await invoke({type:'bodyPart',q:'Chest'});assert.equal(result.requested.searchParams.get('bodyParts'),'Chest');assert.equal(result.requested.searchParams.has('bodyPart'),false);
});
test('provider failure exposes an actionable message without upstream body',async()=>{
 const result=await invoke({type:'name',q:'Band Squat'},{ok:false,status:503,text:async()=> 'provider internal response'});assert.equal(result.code,503);assert.equal(result.body.error,'Exercise demonstrations are temporarily unavailable.');
});
