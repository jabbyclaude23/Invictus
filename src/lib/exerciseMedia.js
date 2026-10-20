// AscendAPI search is fuzzy. Never substitute a different movement or equipment.
export function normalizeExerciseName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ')
    .replace(/resistance bands?/g, 'band').replace(/bands\b/g, 'band')
    .replace(/dumbbells\b/g, 'dumbbell').replace(/barbells\b/g, 'barbell')
    .replace(/body weight/g, 'bodyweight').replace(/overhead|military/g, 'shoulder')
    .replace(/pushups?\b/g, 'push up').replace(/pullups?\b/g, 'pull up')
    .replace(/push ups\b/g, 'push up').replace(/pull ups\b/g, 'pull up')
    .replace(/triceps?\b/g, 'triceps').replace(/biceps?\b/g, 'biceps').replace(/\bext\b/g, 'extension')
    .replace(/raises\b/g, 'raise').replace(/squats\b/g, 'squat')
    .replace(/single arm|one arm/g, 'unilateral arm').replace(/single leg|one leg/g, 'unilateral leg')
    .replace(/\s+/g, ' ').trim();
}
const EQUIPMENT = ['band', 'dumbbell', 'barbell', 'kettlebell', 'cable', 'machine', 'bodyweight', 'smith', 'trap bar'];
const VARIANTS = ['incline', 'decline', 'seated', 'standing', 'unilateral', 'split', 'romanian', 'sumo', 'front', 'rear', 'lateral', 'reverse', 'hammer', 'arnold', 'goblet', 'jump', 'assisted', 'wide', 'close', 'diamond', 'pike', 'alternating'];
const GENERIC = { 'bench press': 'barbell', 'incline press': 'barbell', 'shoulder press': 'barbell', 'deadlift': 'barbell', 'dumbbell press': 'dumbbell', 'push up': 'bodyweight', 'pull up': 'bodyweight', 'plank':'bodyweight', 'squat':'barbell' };
function equipmentOf(exercise) {
  const name = normalizeExerciseName(exercise.name);
  const metadata = normalizeExerciseName([...(exercise.equipments || []), exercise.equipment || ''].join(' '));
  const equipment = EQUIPMENT.filter(token => (` ${name} ${metadata} `).includes(` ${token} `));
  return equipment.length ? equipment : GENERIC[name] ? [GENERIC[name]] : [];
}
function movementName(exercise) {
  let name = normalizeExerciseName(exercise.name);
  if (name === 'dumbbell press') name = 'dumbbell bench press';
  if (name === 'incline dumbbell press' || name === 'incline press') name = name.replace('press','bench press');
  for (const equipment of EQUIPMENT) name = name.replaceAll(equipment, ' ');
  return name.replace(/\s+/g, ' ').trim();
}
export function scoreExerciseMatch(request, candidate) {
  if (!candidate?.name || !request?.name) return 0;
  const wanted = equipmentOf(request), actual = equipmentOf(candidate);
  if (wanted.length && !wanted.every(equipment => actual.includes(equipment))) return 0;
  const a = movementName(request), b = movementName(candidate);
  if (a === b) return 1;
  if (VARIANTS.some(token => a.split(' ').includes(token) !== b.split(' ').includes(token))) return 0;
  const first = new Set(a.split(' ')), second = new Set(b.split(' '));
  const overlap = [...first].filter(token => second.has(token)).length;
  return overlap / Math.max(first.size, second.size);
}
export function selectExerciseMatch(request, candidates = []) {
  let best = null, score = 0.9;
  for (const candidate of candidates) {
    const next = scoreExerciseMatch(request, candidate);
    if (next > score) { best = candidate; score = next; }
  }
  return best;
}
function mediaUrl(value) { return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null; }
export function normalizeExerciseMedia(payload) {
  const record = payload?.data && !Array.isArray(payload.data) ? payload.data : payload || {};
  const sizes = record.imageUrls || {};
  return {
    id: record.exerciseId || record.id || null, name: record.name || '',
    image: mediaUrl(sizes['720p']) || mediaUrl(record.imageUrl) || mediaUrl(sizes['480p']) || mediaUrl(sizes['360p']) || mediaUrl(sizes['1080p']),
    thumbnail: mediaUrl(sizes['360p']) || mediaUrl(record.imageUrl) || mediaUrl(sizes['480p']) || mediaUrl(sizes['720p']),
    video: mediaUrl(record.videoUrl), gif: mediaUrl(record.gifUrl),
    instructions: Array.isArray(record.instructions) ? record.instructions.filter(item => typeof item === 'string') : [],
    desc: typeof record.overview === 'string' ? record.overview : null,
    equipment: record.equipments?.[0] || null,
  };
}
export function createExerciseResolver(fetcher = (...args) => fetch(...args)) {
  const cache = new Map(), requests = new Map();
  const json = async url => {
    if (requests.has(url)) return requests.get(url);
    const pending = (async () => {
      const response = await fetcher(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Exercise media service unavailable');
      const payload = await response.json();
      if (payload.error || payload.success === false) throw new Error('Exercise media service unavailable');
      return payload;
    })();
    requests.set(url, pending);
    pending.then(() => requests.delete(url), () => requests.delete(url));
    return pending;
  };
  return async function resolve(exercise) {
    const request = typeof exercise === 'string' ? {name: exercise} : exercise;
    if (!request?.name) return null;
    const key = `${normalizeExerciseName(request.name)}::${equipmentOf(request).join(',')}`;
    const previous = cache.get(key);
    if (previous && previous.expires > Date.now()) return previous.promise;
    const promise = (async () => {
      let match = null;
      const name = normalizeExerciseName(request.name), movement = movementName(request);
      // Bounded to two search strategies and two cursor pages each: 100 candidates.
      const strategies = [{name: request.name}, {name: movement, equipment: equipmentOf(request)[0]}];
      for (const strategy of strategies) {
        let after = '';
        for (let page = 0; page < 2; page++) {
          const params = new URLSearchParams({type:'name',q:strategy.name,limit:'25'});
          if (strategy.equipment) params.set('equipment', strategy.equipment === 'band' ? 'Resistance Band' : strategy.equipment === 'bodyweight' ? 'Body Weight' : strategy.equipment.replace(/\b\w/g, char => char.toUpperCase()));
          if (after) params.set('after', after);
          const payload = await json(`/api/exercisedb?${params}`);
          match = selectExerciseMatch(request, Array.isArray(payload.data) ? payload.data : []);
          if (match) break;
          const next = payload.meta?.nextCursor;
          if (!payload.meta?.hasNextPage || !next || next === after) break;
          after = next;
        }
        if (match) break;
        if (!strategy.equipment && movement === name) break;
      }
      if (!match) return null;
      const id = match.exerciseId || match.id;
      if (!id) return normalizeExerciseMedia(match);
      const payload = await json(`/api/exercisedb?type=detail&id=${encodeURIComponent(id)}`);
      const detail = payload.data;
      if (!detail || (detail.exerciseId && detail.exerciseId !== id) || !selectExerciseMatch(request, [{...match,...detail}])) return null;
      return normalizeExerciseMedia({...match,...detail});
    })();
    cache.set(key, {promise, expires:Date.now() + 5 * 60 * 1000});
    promise.then(result => { if (!result) cache.delete(key); }, () => cache.delete(key));
    return promise;
  };
}
export const resolveExerciseMedia = createExerciseResolver();
