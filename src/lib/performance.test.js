import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCheckin, normalizeCheckinPatch, summarizeCheckins, measurementStatus } from './performance.js';

test('check-in preserves unentered metrics as null instead of a fabricated zero', () => {
  const value = normalizeCheckin({sleepHours:'',focusMinutes:'',energy:'',reflection:'  A useful day  ',priorities:[{text:'  Train  ',done:true}]});
  assert.equal(value.sleepHours,null); assert.equal(value.focusMinutes,null); assert.equal(value.energy,null);
  assert.equal(value.priorities[0].text,'Train'); assert.equal(value.reflection,'A useful day');
});
test('check-ins reject invalid ranges and limit priorities', () => {
  for (const input of [{sleepHours:25},{focusMinutes:-1},{energy:6},{energy:2.5},{priorities:[1,2,3,4]}]) assert.throws(()=>normalizeCheckin(input));
});
test('summary averages only entered values and never counts blank priorities', () => {
  const summary=summarizeCheckins([{sleepHours:8,focusMinutes:90,energy:4,priorities:[{text:'Train',done:true},{text:'',done:true}]},{sleepHours:null,focusMinutes:30,energy:null,priorities:[{text:'Read',done:false}]}]);
  assert.deepEqual(summary,{days:2,focusMinutes:120,averageSleep:8,averageEnergy:4,prioritiesDone:1,prioritiesTotal:2});
});
test('measurement target direction is explicit: weight loss is not completed at 180 of 160',()=>{
  assert.deepEqual(measurementStatus({value:180,target:160,direction:'decrease'},185),{delta:-5,target:160,remaining:20,reached:false});
  assert.equal(measurementStatus({value:155,target:160,direction:'decrease'}).reached,true);
});
test('zero targets are valid and absent targets do not imply progress',()=>{
  assert.equal(measurementStatus({value:-20,target:0,direction:'increase'}).remaining,20);
  assert.equal(measurementStatus({value:10,target:''}).target,null);
  assert.equal(measurementStatus({value:10}).delta,null);
});

test('separate check-in form patches preserve newer fields saved by another device', () => {
  const initial = { priorities:[{text:'Old priority',done:false}],sleepHours:7,focusMinutes:30,energy:3,reflection:'' };
  const priorities = normalizeCheckinPatch({priorities:[{text:'New priority',done:true}]});
  const checkin = normalizeCheckinPatch({sleepHours:8,focusMinutes:90,energy:4,reflection:'Rest helped'});
  assert.deepEqual({...initial,...priorities,...checkin}.priorities,priorities.priorities);
  assert.equal(Object.hasOwn(priorities,'sleepHours'),false);
  assert.equal(Object.hasOwn(checkin,'priorities'),false);
  assert.equal(summarizeCheckins([{priorities:[],focusMinutes:null}]).focusMinutes,null);
});
