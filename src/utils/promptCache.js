// Lightweight IndexedDB helper with localStorage fallback
const DB_NAME = 'iusable-cache';
const STORE = 'promptLibrary';
const LS_KEY = 'promptLibrary.fallback';
const MAX_PROMPTS = 1000;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 3); // Updated to version 3 for case management
      req.onupgradeneeded = () => {
        const db = req.result;

        // Create promptLibrary store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('updatedAt', 'updatedAt');
          os.createIndex('title', 'title');
        }

        // Create textBlockLibrary store if it doesn't exist (backward compatibility)
        if (!db.objectStoreNames.contains('textBlockLibrary')) {
          const os2 = db.createObjectStore('textBlockLibrary', { keyPath: 'id' });
          os2.createIndex('updatedAt', 'updatedAt');
          os2.createIndex('tag', 'tag', { unique: true });
          os2.createIndex('description', 'description');
        }

        // Create caseLibrary store if it doesn't exist
        if (!db.objectStoreNames.contains('caseLibrary')) {
          const os3 = db.createObjectStore('caseLibrary', { keyPath: 'id' });
          os3.createIndex('updatedAt', 'updatedAt');
          os3.createIndex('name', 'name');
        }

        // Create documentLibrary store if it doesn't exist
        if (!db.objectStoreNames.contains('documentLibrary')) {
          const os4 = db.createObjectStore('documentLibrary', { keyPath: 'id' });
          os4.createIndex('caseId', 'caseId');
          os4.createIndex('updatedAt', 'updatedAt');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) {
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

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    req.onerror = () => reject(req.error);
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
      list = list.filter(p =>
        (!favoritesOnly || p.favorite) &&
        (!tag || (Array.isArray(p.tags) && p.tags.includes(tag))) &&
        (!q || (p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q)))
      );
      // sort by updatedAt desc
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    } catch {
      // fallback
      let list = lsReadAll();
      const q = query.trim().toLowerCase();
      list = list.filter(p => (!favoritesOnly || p.favorite) && (!tag || p.tags?.includes(tag)) && (!q || p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q)));
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    }
  },

  // Create
  async create({ title, content, tags = [], favorite = false }) {
    const now = safeNow();
    const rec = { id: uuid(), title: title?.trim() || 'Untitled', content: content || '', tags: Array.isArray(tags) ? tags : [], favorite: !!favorite, createdAt: now, updatedAt: now, uses: 0 };
    try {
      await idbPut(rec);
      // enforce limit
      const all = await idbGetAll();
      if (all.length > MAX_PROMPTS) {
        all.sort((a,b) => (a.updatedAt||0) - (b.updatedAt||0));
        const toDelete = all.slice(0, all.length - MAX_PROMPTS);
        await Promise.all(toDelete.map(p => idbDelete(p.id)));
      }
      return rec;
    } catch {
      const list = lsReadAll();
      list.push(rec);
      // enforce limit
      if (list.length > MAX_PROMPTS) list.splice(0, list.length - MAX_PROMPTS);
      lsWriteAll(list);
      return rec;
    }
  },

  // Update
  async update(id, patch) {
    try {
      const all = await idbGetAll();
      const idx = all.findIndex(p => p.id === id);
      if (idx === -1) return null;
      const updated = { ...all[idx], ...patch, updatedAt: safeNow() };
      await idbPut(updated);
      return updated;
    } catch {
      const list = lsReadAll();
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch, updatedAt: safeNow() };
      lsWriteAll(list);
      return list[idx];
    }
  },

  // Delete
  async remove(id) {
    try { await idbDelete(id); return true; } catch { const list = lsReadAll().filter(p => p.id !== id); lsWriteAll(list); return true; }
  },

  // Clear all
  async clear() { try { await idbClear(); } catch { lsWriteAll([]); } },

  // Increment usage counter
  async markUsed(id) { return this.update(id, { uses: (await this.getById(id))?.uses + 1 || 1 }); },

  // Get by id
  async getById(id) {
    try {
      const all = await idbGetAll();
      return all.find(p => p.id === id) || null;
    } catch {
      return lsReadAll().find(p => p.id === id) || null;
    }
  },

  // Import / Export
  async export() {
    try { return await idbGetAll(); } catch { return lsReadAll(); }
  },
  async import(list) {
    if (!Array.isArray(list)) return 0;
    const sanitized = list.map(p => ({
      id: p.id || uuid(),
      title: (p.title || 'Untitled').toString(),
      content: (p.content || '').toString(),
      tags: Array.isArray(p.tags) ? p.tags : [],
      favorite: !!p.favorite,
      createdAt: Number(p.createdAt) || safeNow(),
      updatedAt: Number(p.updatedAt) || safeNow(),
      uses: Number(p.uses) || 0
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
