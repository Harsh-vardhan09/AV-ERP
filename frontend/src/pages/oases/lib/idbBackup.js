// ══════════════════════════════════════════════════════════════════
// OASES — IndexedDB Backup Service (Sprint 7)
// Writes every mark change to IndexedDB so evaluators don't lose
// work on network drops. Flushes back to server on reconnect.
// DB: oases-eval | Store: marks | Key: sheetId
// ══════════════════════════════════════════════════════════════════

const DB_NAME    = 'oases-eval';
const DB_VERSION = 1;
const STORE_NAME = 'marks';

let _db = null;

/** Open (or reuse) the IndexedDB database */
const openDB = () => {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'sheetId' });
      }
    };
    req.onsuccess = (e) => {
      _db = e.target.result;
      resolve(_db);
    };
    req.onerror = (e) => reject(e.target.error);
  });
};

/**
 * Write current marks draft to IndexedDB.
 * @param {string} sheetId
 * @param {Array}  marks      - array of { questionNo, marksGiven, isNA }
 * @param {string} savedAt    - ISO timestamp
 */
export const idbWrite = async (sheetId, marks, savedAt = new Date().toISOString()) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ sheetId, marks, savedAt });
      tx.oncomplete = resolve;
      tx.onerror    = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] write failed:', err.message);
  }
};

/**
 * Read backup draft from IndexedDB.
 * @param {string} sheetId
 * @returns {object|null} { marks, savedAt } or null
 */
export const idbRead = async (sheetId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(STORE_NAME, 'readonly');
      const req   = tx.objectStore(STORE_NAME).get(sheetId);
      req.onsuccess = (e) => resolve(e.target.result || null);
      req.onerror   = (e) => reject(e.target.error);
    });
  } catch {
    return null;
  }
};

/**
 * Clear a sheet backup from IndexedDB (after successful server sync).
 * @param {string} sheetId
 */
export const idbClear = async (sheetId) => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(sheetId);
      tx.oncomplete = resolve;
    });
  } catch {
    /* non-fatal */
  }
};

/**
 * Get all pending backups (for offline flush on reconnect).
 * @returns {Array} all stored backup objects
 */
export const idbGetAll = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = (e) => resolve(e.target.result || []);
      req.onerror   = (e) => reject(e.target.error);
    });
  } catch {
    return [];
  }
};
