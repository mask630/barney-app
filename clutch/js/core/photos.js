// Fotos privadas en IndexedDB (fuera de localStorage para no llenar los 5 MB ni ralentizar el guardado).
// La referencia guardada en el estado es 'idb:<id>'. La lectura durante el render es síncrona vía cache en memoria.

const DB_NAME = 'clutch_photos';
const STORE = 'p';
const mem = new Map();
let dbPromise = null;

export const isPhotoRef = (v) => typeof v === 'string' && v.startsWith('idb:');
export const photoId = (v) => (isPhotoRef(v) ? v.slice(4) : '');

export function photoSrc(v) {
  if (!v || typeof v !== 'string') return '';
  if (isPhotoRef(v)) return mem.get(v.slice(4)) || '';
  return v;
}

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbPromise;
}

export async function putPhoto(id, dataUrl) {
  if (!id || !dataUrl) return '';
  mem.set(id, dataUrl);
  const db = await openDb();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(dataUrl, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch { resolve(); }
    });
  }
  return `idb:${id}`;
}

export async function delPhoto(ref) {
  const id = photoId(ref);
  if (!id) return;
  mem.delete(id);
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
}

export async function clearAllPhotos() {
  mem.clear();
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
}

export async function hydratePhotos() {
  const db = await openDb();
  if (!db) return 0;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      let count = 0;
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (!cur) return resolve(count);
        if (typeof cur.value === 'string') { mem.set(String(cur.key), cur.value); count++; }
        cur.continue();
      };
      req.onerror = () => resolve(count);
    } catch { resolve(0); }
  });
}

// Migra fotos antiguas guardadas como data URL en localStorage a IndexedDB en segundo plano.
export async function migrateInlinePhotos(state) {
  let changed = false;
  for (const p of state?.profiles || []) {
    for (const arr of [p.gifts, p.reminders]) {
      for (const item of arr || []) {
        if (typeof item.photo === 'string' && item.photo.startsWith('data:')) {
          const id = item.id || Math.random().toString(36).slice(2, 10);
          item.photo = await putPhoto(id, item.photo);
          changed = true;
        }
      }
    }
    if (Array.isArray(p.photos)) {
      for (let i = 0; i < p.photos.length; i++) {
        const ph = p.photos[i];
        if (typeof ph === 'string' && ph.startsWith('data:')) {
          p.photos[i] = await putPhoto(`${p.id}_ph_${i}_${Date.now().toString(36)}`, ph);
          changed = true;
        }
      }
    }
  }
  return changed;
}

export const _clearMem = () => mem.clear();
