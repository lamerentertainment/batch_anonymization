// Lightweight IndexedDB helper with localStorage fallback for Cases
const DB_NAME = 'iusable-cache';
const STORE = 'caseLibrary';
const LS_KEY = 'caseLibrary.fallback';
const MAX_CASES = 500;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      console.log('[caseCache] Opening IndexedDB:', DB_NAME, 'version 3');
      const req = indexedDB.open(DB_NAME, 3); // Increment version for new object stores
      req.onupgradeneeded = (event) => {
        console.log('[caseCache] Database upgrade needed from version', event.oldVersion, 'to', event.newVersion);
        const db = req.result;

        // Create promptLibrary store if it doesn't exist (backward compatibility)
        if (!db.objectStoreNames.contains('promptLibrary')) {
          console.log('[caseCache] Creating promptLibrary store');
          const os1 = db.createObjectStore('promptLibrary', { keyPath: 'id' });
          os1.createIndex('updatedAt', 'updatedAt');
          os1.createIndex('title', 'title');
        }

        // Create textBlockLibrary store if it doesn't exist (backward compatibility)
        if (!db.objectStoreNames.contains('textBlockLibrary')) {
          console.log('[caseCache] Creating textBlockLibrary store');
          const os2 = db.createObjectStore('textBlockLibrary', { keyPath: 'id' });
          os2.createIndex('updatedAt', 'updatedAt');
          os2.createIndex('tag', 'tag', { unique: true });
          os2.createIndex('description', 'description');
        }

        // Create caseLibrary store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE)) {
          console.log('[caseCache] Creating caseLibrary store');
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('updatedAt', 'updatedAt');
          os.createIndex('name', 'name');
        }

        // Create documentLibrary store if it doesn't exist
        if (!db.objectStoreNames.contains('documentLibrary')) {
          console.log('[caseCache] Creating documentLibrary store');
          const os3 = db.createObjectStore('documentLibrary', { keyPath: 'id' });
          os3.createIndex('caseId', 'caseId');
          os3.createIndex('updatedAt', 'updatedAt');
        }
      };
      req.onsuccess = () => {
        console.log('[caseCache] IndexedDB opened successfully');
        resolve(req.result);
      };
      req.onerror = () => {
        console.error('[caseCache] IndexedDB open failed:', req.error);
        reject(req.error);
      };
    } catch (e) {
      console.error('[caseCache] Exception opening IndexedDB:', e);
      reject(e);
    }
  });
  return dbPromise;
}

function lsReadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsWriteAll(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}

async function idbGetAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.put(record);

    // Handle transaction completion
    tx.oncomplete = () => {
      console.log('[caseCache] Transaction completed successfully');
      resolve(true);
    };

    tx.onerror = () => {
      console.error('[caseCache] Transaction error:', tx.error);
      reject(tx.error);
    };

    req.onerror = () => {
      console.error('[caseCache] Put request error:', req.error);
      reject(req.error);
    };
  });
}

async function idbDelete(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.delete(id);

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    req.onerror = () => reject(req.error);
  });
}

async function idbClear() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    req.onerror = () => reject(req.error);
  });
}

function safeNow() { try { return Date.now(); } catch { return new Date().getTime(); } }
function uuid() { return crypto?.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2); }

export default {
  // List (with optional filters)
  async list({ query = '', tag = '', favoritesOnly = false } = {}) {
    try {
      let list = await idbGetAll();
      if (!Array.isArray(list)) list = [];
      const q = query.trim().toLowerCase();
      list = list.filter(c =>
        (!favoritesOnly || c.favorite) &&
        (!tag || (Array.isArray(c.tags) && c.tags.includes(tag))) &&
        (!q || (c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)))
      );
      // sort by updatedAt desc
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    } catch {
      // fallback
      let list = lsReadAll();
      const q = query.trim().toLowerCase();
      list = list.filter(c =>
        (!favoritesOnly || c.favorite) &&
        (!tag || c.tags?.includes(tag)) &&
        (!q || c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      );
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    }
  },

  // Create
  async create({ name, description = '', entities = [], mode = 'anonymize', tags = [], favorite = false }) {
    const now = safeNow();
    const rec = {
      id: uuid(),
      name: name?.trim() || 'Neuer Fall',
      description: description?.trim() || '',
      entities: Array.isArray(entities) ? entities : [],
      mode: mode || 'anonymize',
      tags: Array.isArray(tags) ? tags : [],
      favorite: !!favorite,
      createdAt: now,
      updatedAt: now,
      uses: 0
    };
    try {
      console.log('[caseCache] Attempting to create case via IndexedDB:', rec.name);
      await idbPut(rec);
      console.log('[caseCache] Case created successfully in IndexedDB');
      // enforce limit
      const all = await idbGetAll();
      if (all.length > MAX_CASES) {
        all.sort((a,b) => (a.updatedAt||0) - (b.updatedAt||0));
        const toDelete = all.slice(0, all.length - MAX_CASES);
        await Promise.all(toDelete.map(c => idbDelete(c.id)));
      }
      return rec;
    } catch (err) {
      console.warn('[caseCache] IndexedDB failed, falling back to localStorage:', err);
      const list = lsReadAll();
      list.push(rec);
      // enforce limit
      if (list.length > MAX_CASES) list.splice(0, list.length - MAX_CASES);
      lsWriteAll(list);
      console.log('[caseCache] Case created in localStorage');
      return rec;
    }
  },

  // Update
  async update(id, patch) {
    try {
      const all = await idbGetAll();
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return null;
      const updated = { ...all[idx], ...patch, updatedAt: safeNow() };
      await idbPut(updated);
      return updated;
    } catch {
      const list = lsReadAll();
      const idx = list.findIndex(c => c.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch, updatedAt: safeNow() };
      lsWriteAll(list);
      return list[idx];
    }
  },

  // Delete
  async remove(id) {
    try {
      await idbDelete(id);
      return true;
    } catch {
      const list = lsReadAll().filter(c => c.id !== id);
      lsWriteAll(list);
      return true;
    }
  },

  // Clear all
  async clear() {
    try {
      await idbClear();
    } catch {
      lsWriteAll([]);
    }
  },

  // Increment usage counter
  async markUsed(id) {
    const caseItem = await this.getById(id);
    if (!caseItem) return null;
    return this.update(id, { uses: (caseItem.uses || 0) + 1 });
  },

  // Get by id
  async getById(id) {
    try {
      const all = await idbGetAll();
      return all.find(c => c.id === id) || null;
    } catch {
      return lsReadAll().find(c => c.id === id) || null;
    }
  },

  // Import / Export
  async export() {
    try {
      return await idbGetAll();
    } catch {
      return lsReadAll();
    }
  },

  async import(list) {
    if (!Array.isArray(list)) return 0;
    const sanitized = list.map(c => ({
      id: c.id || uuid(),
      name: (c.name || 'Neuer Fall').toString(),
      description: (c.description || '').toString(),
      entities: Array.isArray(c.entities) ? c.entities : [],
      mode: c.mode || 'anonymize',
      tags: Array.isArray(c.tags) ? c.tags : [],
      favorite: !!c.favorite,
      createdAt: Number(c.createdAt) || safeNow(),
      updatedAt: Number(c.updatedAt) || safeNow(),
      uses: Number(c.uses) || 0
    }));
    try {
      for (const rec of sanitized) await idbPut(rec);
      return sanitized.length;
    } catch {
      lsWriteAll(sanitized);
      return sanitized.length;
    }
  },
};
