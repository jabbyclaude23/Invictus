import { fixtureUser, seedData } from './data.js';
const params = new URLSearchParams(location.search);
if (params.get('signedout') === '1') sessionStorage.setItem('invictus-preview-signedout', '1');
const empty = params.get('empty') === '1';
const storageKey = `invictus-local-preview-v1-${empty ? 'empty' : 'full'}`;
export class Timestamp {
  constructor(milliseconds) { this.milliseconds = milliseconds; this.seconds = Math.floor(milliseconds / 1000); this.nanoseconds = 0; }
  toDate() { return new Date(this.milliseconds); }
  toMillis() { return this.milliseconds; }
  static now() { return new Timestamp(Date.now()); }
  static fromDate(date) { return new Timestamp(date.getTime()); }
}
function encode(value) {
  if (value instanceof Date || value instanceof Timestamp) return { __fixtureTimestamp: value instanceof Date ? value.getTime() : value.toMillis() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)]));
  return value;
}
function decode(value) {
  if (value && typeof value === 'object' && '__fixtureTimestamp' in value) return new Timestamp(value.__fixtureTimestamp);
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
  return value;
}
let records;
try { records = JSON.parse(localStorage.getItem(storageKey)); } catch { /* Fresh seed below. */ }
if (!records) records = encode(seedData(empty));
const listeners = new Set();
const authListeners = new Set();
let scheduled = false;
let counter = 0;
export const db = { fixture: true };
export const auth = { currentUser: params.get('signedout') === '1' || sessionStorage.getItem('invictus-preview-signedout') === '1' ? null : fixtureUser, onAuthStateChanged(callback) { return onAuthStateChanged(auth, callback); } };
function changed() {
  localStorage.setItem(storageKey, JSON.stringify(records));
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; listeners.forEach(listener => listener()); });
}
function ref(kind, parent, parts) { const path = [parent?.path || '', ...parts].filter(Boolean).join('/'); return { kind, path, id: path.split('/').at(-1) }; }
export function collection(parent, ...parts) { return ref('collection', parent, parts); }
export function doc(parent, ...parts) { return ref('doc', parent, parts.length ? parts : [`fixture-${Date.now().toString(36)}-${++counter}`]); }
export function query(parent, ...constraints) { return { ...parent, constraints }; }
export function where(field, operator, value) { return { type: 'where', field, operator, value }; }
export function orderBy(field, direction = 'asc') { return { type: 'orderBy', field, direction }; }
export function limit(count) { return { type: 'limit', count }; }
export function serverTimestamp() { return Timestamp.now(); }
export function getFirestore() { return db; }
function documentSnapshot(path) { return { id: path.split('/').at(-1), ref: { kind: 'doc', path }, exists: () => records[path] !== undefined, data: () => decode(records[path]), metadata: { fromCache: false, hasPendingWrites: false } }; }
function fieldValue(value, field) { return field.split('.').reduce((current, part) => current?.[part], value); }
function comparable(value) { return value instanceof Timestamp ? value.toMillis() : value; }
function snapshot(reference) {
  if (reference.kind === 'doc') return documentSnapshot(reference.path);
  const prefix = `${reference.path}/`;
  let rows = Object.keys(records).filter(path => path.startsWith(prefix) && !path.slice(prefix.length).includes('/')).map(documentSnapshot);
  for (const rule of reference.constraints || []) {
    if (rule.type === 'where') rows = rows.filter(row => {
      const actual = comparable(fieldValue(row.data(), rule.field)); const expected = comparable(rule.value);
      return ({ '==': () => actual === expected, '!=': () => actual !== expected, '>': () => actual > expected, '>=': () => actual >= expected, '<': () => actual < expected, '<=': () => actual <= expected, in: () => expected.includes(actual), 'array-contains': () => actual?.includes(expected) })[rule.operator]?.() || false;
    });
  }
  const ordering = (reference.constraints || []).filter(item => item.type === 'orderBy');
  if (ordering.length) rows.sort((left, right) => {
    for (const order of ordering) {
      const a = comparable(fieldValue(left.data(), order.field)); const b = comparable(fieldValue(right.data(), order.field));
      const comparison = a === b ? 0 : a == null ? -1 : b == null ? 1 : a < b ? -1 : 1;
      if (comparison) return comparison * (order.direction === 'desc' ? -1 : 1);
    }
    return left.id.localeCompare(right.id);
  });
  const max = reference.constraints?.find(item => item.type === 'limit');
  if (max) rows = rows.slice(0, max.count);
  return { docs: rows, size: rows.length, empty: !rows.length, forEach: callback => rows.forEach(callback), metadata: { fromCache: false, hasPendingWrites: false } };
}
export async function getDoc(reference) { if (window.__fixture.failReads) throw new Error('Local fixture: forced read failure'); return snapshot(reference); }
export const getDocs = getDoc;
export function onSnapshot(reference, ...args) {
  const callbacks = args.filter(argument => typeof argument === 'function');
  let live = true; let last = Symbol('first snapshot');
  const emit = () => {
    if (!live) return;
    if (window.__fixture.failReads) { callbacks[1]?.(new Error('Local fixture: forced read failure')); return; }
    const result = snapshot(reference);
    const signature = JSON.stringify(reference.kind === 'doc' ? result.data() : result.docs.map(item => [item.id, item.data()]));
    if (last === signature) return;
    last = signature; callbacks[0](result);
  };
  listeners.add(emit); queueMicrotask(emit);
  return () => { live = false; listeners.delete(emit); };
}
function writeGuard() { if (window.__fixture.failWrites) throw new Error('Local fixture: forced save failure'); }
function set(reference, value, options = {}) { records[reference.path] = options.merge ? { ...records[reference.path], ...encode(value) } : encode(value); }
export async function setDoc(reference, value, options) { writeGuard(); set(reference, value, options); changed(); }
export async function updateDoc(reference, value) { writeGuard(); if (!records[reference.path]) throw new Error('Local fixture: missing document'); set(reference, value, { merge: true }); changed(); }
export async function deleteDoc(reference) { writeGuard(); delete records[reference.path]; changed(); }
export async function addDoc(reference, value) { const target = doc(reference); await setDoc(target, value); return target; }
export function writeBatch() {
  const operations = [];
  const batch = { set: (reference, value, options) => { operations.push(() => set(reference, value, options)); return batch; }, update: (reference, value) => { operations.push(() => set(reference, value, { merge: true })); return batch; }, delete: reference => { operations.push(() => delete records[reference.path]); return batch; }, commit: async () => { writeGuard(); operations.forEach(operation => operation()); changed(); } };
  return batch;
}
export function getAuth() { return auth; }
export function onAuthStateChanged(_auth, callback) { authListeners.add(callback); let live = true; queueMicrotask(() => { if (live) callback(auth.currentUser); }); return () => { live = false; authListeners.delete(callback); }; }
function setUser(user) { auth.currentUser = user; sessionStorage.setItem('invictus-preview-signedout', user ? '0' : '1'); authListeners.forEach(callback => callback(user)); }
export async function signOut() { setUser(null); }
export async function signInWithEmailAndPassword(_auth, email) { const user = { ...fixtureUser, email }; setUser(user); return { user }; }
export async function createUserWithEmailAndPassword(_auth, email) { return signInWithEmailAndPassword(_auth, email); }
export async function signInWithPopup() { setUser(fixtureUser); return { user: fixtureUser }; }
export class GoogleAuthProvider { }
window.__fixture = {
  failWrites: false, failReads: false, failChat: false,
  reset(options = {}) { records = encode(seedData(options.empty ?? empty)); this.failWrites = false; this.failReads = false; this.failChat = false; sessionStorage.removeItem('invictus_active_workout'); changed(); },
  dump: () => decode(records), signIn: () => setUser(fixtureUser), signOut: () => setUser(null),
};
localStorage.setItem(storageKey, JSON.stringify(records));
