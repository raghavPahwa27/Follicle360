// Photos live in IndexedDB (image files are too big for localStorage).
// Their metadata (date, angle, note) stays in localStorage next to the rest of the app data.
const DB = 'follicle360', STORE = 'photos';
let dbp;

const open = () => (dbp ||= new Promise((resolve, reject) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
}));

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

const urls = new Map(); // id -> object URL, so screens can render <img> synchronously

// Reserved demo IDs use supplied reference images, including previously seeded demos.
const demoPhotos = { 'demo8-photo-55': '/images/demo/start.png', 'demo8-photo-28': '/images/demo/week-4.png', 'demo8-photo-0': '/images/demo/week-8.png' };
export const url = (id) => demoPhotos[id] || urls.get(id) || null;

export async function put(id, blob) {
  await run('readwrite', (st) => st.put(blob, id));
  urls.set(id, URL.createObjectURL(blob));
  navigator.storage?.persist?.(); // ask the browser not to evict our data
}

export async function load(ids) {
  for (const id of ids) {
    if (!id || demoPhotos[id] || urls.has(id)) continue;
    const blob = await run('readonly', (st) => st.get(id));
    if (blob) urls.set(id, URL.createObjectURL(blob));
  }
}

export async function remove(id) {
  await run('readwrite', (st) => st.delete(id));
  if (urls.has(id)) URL.revokeObjectURL(urls.get(id));
  urls.delete(id);
}

export async function clear() {
  try { await run('readwrite', (st) => st.clear()); } catch { /* nothing stored */ }
  urls.forEach((u) => URL.revokeObjectURL(u)); urls.clear();
}
