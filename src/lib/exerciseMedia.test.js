import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExerciseName, selectExerciseMatch, normalizeExerciseMedia, createExerciseResolver } from './exerciseMedia.js';
const bench = { exerciseId: 'bench', name: 'Bench Press', equipments: ['BARBELL'] };
test('normalizes punctuation, plurals and common movement aliases', () => {
  assert.equal(normalizeExerciseName('Resistance-Band Overhead Press'), 'band shoulder press');
  assert.equal(normalizeExerciseName('Push-Ups'), 'push up');
});
test('finds exact movement and equipment beyond unrelated provider ordering', () => {
  assert.equal(selectExerciseMatch({ name: 'Barbell Bench Press' }, [{ name: 'Barbell Standing Calf Raise', equipments: ['BARBELL'] }, bench]), bench);
});
test('rejects fuzzy band shoulder results with the wrong equipment or movement', () => {
  assert.equal(selectExerciseMatch({ name: 'Band Shoulder Press' }, [bench, { name: 'Shoulder Press', equipments: ['DUMBBELL'] }, { name: 'Band Calf Raise', equipments: ['BAND'] }]), null);
});
test('does not confuse variations or invent a first-result fallback', () => {
  for (const name of ['Incline Dumbbell Press', 'Dumbbell Bench Press', 'Barbell Row', 'Push Up']) {
    assert.equal(selectExerciseMatch({ name }, [{ name: 'Dumbbell Incline One Arm Hammer Press', equipments: ['DUMBBELL'] }]), null);
  }
  assert.equal(selectExerciseMatch({name: 'Band Squat'}, [{name: 'Squat', equipments:['BODY WEIGHT']}]), null);
});
test('matches metadata equipment with harmless name aliases', () => {
  const candidate = {name:'Seated Shoulder Press', equipments:['DUMBBELL']};
  assert.equal(selectExerciseMatch({name:'Seated Dumbbell Shoulder Press'}, [candidate]), candidate);
  assert.equal(selectExerciseMatch({name:'Barbell Shoulder Press'}, [candidate]), null);
});
test('normalizes real V2 resolutions, video and V1 GIF without guessing URLs', () => {
  const media = normalizeExerciseMedia({data:{...bench, imageUrls:{'360p':'https://cdn.test/thumb.jpg','720p':'https://cdn.test/large.jpg'}, videoUrl:'https://cdn.test/demo.mp4', instructions:['Press slowly.']}});
  assert.equal(media.image, 'https://cdn.test/large.jpg');
  assert.equal(media.thumbnail, 'https://cdn.test/thumb.jpg');
  assert.equal(media.video, 'https://cdn.test/demo.mp4');
  assert.equal(normalizeExerciseMedia({gifUrl:'https://cdn.test/demo.gif'}).gif, 'https://cdn.test/demo.gif');
  assert.equal(normalizeExerciseMedia({imageUrl:'unresolved-filename.jpg'}).image, null);
});
test('deduplicates list/detail across views and retries transient failures', async () => {
  let count = 0;
  const fetcher = async url => { count++; return {ok:true, json:async()=>url.includes('type=detail') ? {data:{...bench,videoUrl:'https://cdn.test/bench.mp4'}} : {data:[bench]}}; };
  const resolve = createExerciseResolver(fetcher);
  const [one,two] = await Promise.all([resolve({name:'Barbell Bench Press'}),resolve({name:'Barbell Bench Press'})]);
  assert.equal(one.video,two.video); assert.equal(count,2);
  await resolve({name:'Barbell Bench Press'}); assert.equal(count,2);
  let failed = true;
  const retry = createExerciseResolver(async url => {if(failed) {failed=false; throw new Error('offline');} return fetcher(url);});
  await assert.rejects(retry({name:'Barbell Bench Press'}));
  assert.ok((await retry({name:'Barbell Bench Press'})).video);
});
test('does not trust a different detail response for a selected search result', async () => {
  const resolve = createExerciseResolver(async url => ({ok:true,json:async()=>url.includes('type=detail') ? {data:{exerciseId:'wrong',name:'Calf Raise',equipments:['BARBELL'],videoUrl:'https://cdn.test/wrong.mp4'}} : {data:[bench]}}));
  assert.equal(await resolve({name:'Barbell Bench Press'}), null);
});

test('keeps equivalent chest and triceps aliases without changing the movement',()=>{
 assert.ok(selectExerciseMatch({name:'Incline Dumbbell Press'},[{name:'Dumbbell Incline Bench Press',equipments:['Dumbbell']}]));
 assert.ok(selectExerciseMatch({name:'Resistance Band Tricep Extension'},[{name:'Band Triceps Extension',equipments:['Resistance Band']}]));
 assert.equal(selectExerciseMatch({name:'Push Up'},[{name:'Smith Push Up',equipments:['Smith']}]),null);
});

test('a no-match retry checks the provider again rather than caching an empty result forever', async () => {
  let available = false;
  const resolve = createExerciseResolver(async url => ({ok:true,json:async()=>url.includes('type=detail') ? {data:{...bench,videoUrl:'https://cdn.test/bench.mp4'}} : {data:available ? [bench] : []}}));
  assert.equal(await resolve({name:'Barbell Bench Press'}),null);
  available = true;
  assert.ok((await resolve({name:'Barbell Bench Press'})).video);
});
