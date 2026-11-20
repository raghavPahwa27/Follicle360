// Data layer: everything is stored in the browser. No names, phone numbers or accounts.
// localStorage holds the app data; IndexedDB (photos.js) holds the image files.
import { PRODUCTS } from './data.js';
import * as P from './photos.js';

const KEY = 'follicle360.v2', LEGACY = 'rooted.v1';
export const mode = () => sessionStorage.getItem('follicle360.mode') === 'demo' ? 'demo' : 'normal';
export const setMode = value => sessionStorage.setItem('follicle360.mode', value === 'demo' ? 'demo' : 'normal');
const activeKey = () => mode() === 'demo' ? KEY + '.demo8' : KEY;
export const empty = () => ({ finder: null, calc: {}, packs: [], routine: { steps: [] }, logs: {}, observations: [], photos: [], orders: [], refill: null });

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const dkey = (d = new Date()) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parse = (key) => new Date(`${key}T00:00:00`);

export function load() {
  try {
    const s = JSON.parse(localStorage.getItem(activeKey())) || {};
    if (mode() === 'demo' && Array.isArray(s.photos)) {
      const checkpoints = {'demo8-photo-55':'Start','demo8-photo-28':'Week 4','demo8-photo-0':'Week 8'};
      s.photos = s.photos.map(p => checkpoints[p.id] ? {...p, note: checkpoints[p.id] + ' · Supplied reference image; date is an illustrative demo checkpoint, not verified treatment progress.'} : p);
    }
    return { ...empty(), ...s, routine: { steps: [], ...s.routine } };
  } catch { return empty(); }
}
export function save(state) {
  try { localStorage.setItem(activeKey(), JSON.stringify(state)); return true; } catch { return false; }
}
export async function reset() {
  const s = load();
  for (const id of new Set([...s.photos.map(p => p.id), ...s.packs.flatMap(p => p.photoIds || [])])) await P.remove(id).catch(() => {});
  localStorage.removeItem(activeKey());
  if (mode() === 'normal') localStorage.removeItem(LEGACY);
}
export const isEmpty = (s) => !s.refill && !s.finder && !s.packs.length && !s.routine.steps.length && !s.observations.length && !s.photos.length && !s.orders.length;

// ---------- routine steps ----------
const defaultTime = (slot) => (slot === 'morning' ? '08:00' : '21:30');
export const period = (t) => (t < '12:00' ? 'Morning' : t < '17:00' ? 'Afternoon' : 'Evening');

const stepFrom = (item, over = {}) => ({
  id: item.id, name: item.name, note: item.hint || '', time: over.time || defaultTime(item.slot),
  days: item.days || null, remind: true, from: over.from || dkey(), product: over.product || '',
});

// add a product's steps to the routine (skips steps that already exist)
export function addProduct(state, productId) {
  const p = PRODUCTS.find((x) => x.id === productId);
  const fresh = p.items.filter((i) => !state.routine.steps.some((st) => st.id === i.id));
  state.routine.steps.push(...fresh.map((i) => stepFrom(i, { product: p.name })));
  save(state);
  return fresh.length;
}

// steps scheduled for a date (a step applies from the day it was added)
export function stepsOn(state, date = new Date()) {
  const k = dkey(date), wd = date.getDay();
  return state.routine.steps.filter((st) => k >= st.from && (!st.days || st.days.includes(wd))).sort((a, b) => a.time.localeCompare(b.time));
}
export const startKey = (state) => state.routine.steps.reduce((m, st) => (st.from < m ? st.from : m), dkey());

export const daysIn = (state) => Math.max(1, Math.round((parse(dkey()) - parse(startKey(state))) / 864e5) + 1);
export const weekOf = (state) => Math.ceil(daysIn(state) / 7);

export function toggle(state, stepId, key = dkey()) {
  state.logs[key] = state.logs[key] || {};
  state.logs[key][stepId] = !state.logs[key][stepId];
  save(state);
}

// share of a day's steps completed (null if nothing was scheduled)
export function pctOn(state, date) {
  const items = stepsOn(state, date);
  if (!items.length) return null;
  const log = state.logs[dkey(date)] || {};
  return items.filter((i) => log[i.id]).length / items.length;
}

export const lastN = (state, n) => [...Array(n)].map((_, i) => { const d = addDays(new Date(), i - n + 1); return { date: d, key: dkey(d), pct: pctOn(state, d) }; });

export function consistency(state) {
  const days = lastN(state, 7).filter((d) => d.pct !== null);
  return days.length ? Math.round((days.reduce((a, d) => a + d.pct, 0) / days.length) * 100) : 0;
}

// a day counts toward the streak when at least 70% of its steps were done; unscheduled days are skipped
export function streak(state) {
  const start = startKey(state);
  let n = 0;
  for (let i = 0; i < 365; i++) {
    const d = addDays(new Date(), -i);
    if (dkey(d) < start) break;
    const p = pctOn(state, d);
    if (p === null) continue;
    if (p >= 0.7) n++;
    else if (i > 0) break; // today may still be in progress
  }
  return n;
}

// average completion for each week since the routine began (last 8 weeks)
export function weeklyConsistency(state) {
  const cur = weekOf(state), out = [];
  for (let w = Math.max(1, cur - 7); w <= cur; w++) {
    const vals = [...Array(7)].map((_, i) => addDays(parse(startKey(state)), (w - 1) * 7 + i))
      .filter((d) => d <= new Date()).map((d) => pctOn(state, d)).filter((v) => v !== null);
    out.push({ label: `Wk ${w}`, value: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) : 0 });
  }
  return out;
}

// ---------- weekly observations (your own 1-5 ratings; subjective, not medical) ----------
// No combined score — display individual indicators only.
// Legacy helper kept so old chart code doesn't break during migration.
export const score = (o) => {
  // Use new fields where available, fall back to old names
  const shed = o.shedding || 1;
  const itch = o.itch ?? o.density ?? 3;
  const thick = o.thickness ?? o.growth ?? 3;
  // Invert shedding and itch (lower is better) so the aggregate moves in the same direction as thickness
  return Math.round((((6 - shed) + (6 - itch) + thick - 3) / 12) * 100);
};

export function addObservation(state, data) {
  state.observations = state.observations.filter((o) => o.date !== data.date).concat({ id: uid(), ...data })
    .sort((a, b) => a.date.localeCompare(b.date));
  save(state);
}
export const daysSinceObservation = (state) =>
  state.observations.length ? Math.round((parse(dkey()) - parse(state.observations.at(-1).date)) / 864e5) : Infinity;

export const sortedPhotos = (state) => [...state.photos].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

// earliest date the person began tracking, from photos or observations
export function trackStart(state) {
  const dates = [...state.photos.map((p) => p.date), ...state.observations.map((o) => o.date)].sort();
  return dates[0] || null;
}

// ---------- one-time import from the earlier single-journey version ----------
export async function migrate() {
  if (mode() === 'demo' || localStorage.getItem(activeKey()) || !localStorage.getItem(LEGACY)) return;
  let old;
  try { old = JSON.parse(localStorage.getItem(LEGACY)); } catch { return; }
  const s = empty(), p = old.profile;
  s.finder = old.finder || null;
  s.logs = old.logs || {};
  if (p) s.routine.steps = PRODUCTS.filter((x) => p.products.includes(x.id))
    .flatMap((x) => x.items.map((i) => stepFrom(i, { time: p.times?.[i.slot], from: p.start, product: x.name })));
  const keep = async (dataUrl) => {
    try { const id = uid(); await P.put(id, await (await fetch(dataUrl)).blob()); return id; } catch { return null; }
  };
  for (const c of old.checkins || []) {
    s.observations.push({ id: uid(), date: c.date, shedding: c.shedding, density: c.density, growth: c.growth, note: '' });
    const id = c.photo && await keep(c.photo);
    if (id) s.photos.push({ id, date: c.date, label: 'Other', note: 'Imported from an earlier check-in' });
  }
  for (const { photo, ...k } of old.packs || []) {
    const entry = { id: uid(), other: '', ...k };
    const id = photo && await keep(photo);
    if (id) entry.photoIds = [id];
    s.packs.push(entry);
  }
  if (save(s)) localStorage.removeItem(LEGACY);
}
