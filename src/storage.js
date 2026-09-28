const DB_NAME = 'one-line-db';
const DB_VERSION = 1;
const STORES = ['entries', 'favorites'];
let dbPromise;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'dateKey' });
      if (!db.objectStoreNames.contains('favorites')) db.createObjectStore('favorites', { keyPath: 'quoteId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function store(name, mode = 'readonly') {
  const db = await openDatabase();
  return db.transaction(name, mode).objectStore(name);
}

export async function getEntry(dateKey) { return requestResult((await store('entries')).get(dateKey)); }
export async function getAllEntries() { return requestResult((await store('entries')).getAll()); }
export async function putEntry(entry) { return requestResult((await store('entries', 'readwrite')).put(entry)); }
export async function getFavorites() { return requestResult((await store('favorites')).getAll()); }
export async function isFavorite(quoteId) { return Boolean(await requestResult((await store('favorites')).get(quoteId))); }
export async function toggleFavorite(quoteId) {
  const existing = await isFavorite(quoteId);
  const objectStore = await store('favorites', 'readwrite');
  if (existing) { await requestResult(objectStore.delete(quoteId)); return false; }
  await requestResult(objectStore.put({ quoteId, createdAt: new Date().toISOString() }));
  return true;
}

export async function clearAll() {
  const db = await openDatabase();
  const transaction = db.transaction(STORES, 'readwrite');
  STORES.forEach((name) => transaction.objectStore(name).clear());
  return new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); });
}

export async function replaceData(data, replace = false) {
  const db = await openDatabase();
  const transaction = db.transaction(STORES, 'readwrite');
  if (replace) STORES.forEach((name) => transaction.objectStore(name).clear());
  data.entries.forEach((entry) => transaction.objectStore('entries').put(entry));
  data.favorites.forEach((favorite) => transaction.objectStore('favorites').put(favorite));
  return new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error('복원에 실패했습니다.')); });
}

export async function exportData() {
  return { app: 'one-line', schemaVersion: 1, exportedAt: new Date().toISOString(), entries: await getAllEntries(), favorites: await getFavorites(), settings: { theme: localStorage.getItem('one-line-theme') || 'system' } };
}
