// Lightweight IndexedDB helper with localStorage fallback for Documents
const DB_NAME = 'iusable-cache';
const STORE = 'documentLibrary';
const LS_KEY = 'documentLibrary.fallback';
const MAX_DOCUMENTS = 2000;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 3); // Same version as caseCache
      req.onupgradeneeded = () => {
        const db = req.result;

        // Create promptLibrary store if it doesn't exist (backward compatibility)
        if (!db.objectStoreNames.contains('promptLibrary')) {
          const os1 = db.createObjectStore('promptLibrary', { keyPath: 'id' });
          os1.createIndex('updatedAt', 'updatedAt');
          os1.createIndex('title', 'title');
        }

        // Create textBlockLibrary store if it doesn't exist (backward compatibility)
        if (!db.objectStoreNames.contains('textBlockLibrary')) {
          const os2 = db.createObjectStore('textBlockLibrary', { keyPath: 'id' });
          os2.createIndex('updatedAt', 'updatedAt');
          os2.createIndex('tag', 'tag', { unique: true });
          os2.createIndex('description', 'description');
        }

        // Create caseLibrary store if it doesn't exist (backward compatibility)
        if (!db.objectStoreNames.contains('caseLibrary')) {
          const os3 = db.createObjectStore('caseLibrary', { keyPath: 'id' });
          os3.createIndex('updatedAt', 'updatedAt');
          os3.createIndex('name', 'name');
        }

        // Create documentLibrary store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('caseId', 'caseId');
          os.createIndex('updatedAt', 'updatedAt');
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

async function idbGetByIndex(indexName, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const index = store.index(indexName);
    const req = index.getAll(value);
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
  // List all documents (with optional filter)
  async list({ query = '' } = {}) {
    try {
      let list = await idbGetAll();
      if (!Array.isArray(list)) list = [];
      const q = query.trim().toLowerCase();
      if (q) {
        list = list.filter(d => d.name?.toLowerCase().includes(q) || d.content?.toLowerCase().includes(q));
      }
      // sort by updatedAt desc
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    } catch {
      // fallback
      let list = lsReadAll();
      const q = query.trim().toLowerCase();
      if (q) {
        list = list.filter(d => d.name?.toLowerCase().includes(q) || d.content?.toLowerCase().includes(q));
      }
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    }
  },

  // List documents by caseId
  async listByCase(caseId) {
    if (!caseId) return [];
    try {
      const list = await idbGetByIndex('caseId', caseId);
      // sort by updatedAt desc
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    } catch {
      // fallback
      const all = lsReadAll();
      const filtered = all.filter(d => d.caseId === caseId);
      filtered.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return filtered;
    }
  },

  // Create
  async create({ caseId, name, content = '' }) {
    if (!caseId) throw new Error('caseId is required');

    const now = safeNow();
    const rec = {
      id: uuid(),
      caseId,
      name: name?.trim() || 'Neues Dokument',
      content: content || '',
      createdAt: now,
      updatedAt: now
    };

    try {
      await idbPut(rec);
      // enforce limit per case (to prevent unbounded growth)
      const all = await idbGetByIndex('caseId', caseId);
      if (all.length > MAX_DOCUMENTS) {
        all.sort((a,b) => (a.updatedAt||0) - (b.updatedAt||0));
        const toDelete = all.slice(0, all.length - MAX_DOCUMENTS);
        await Promise.all(toDelete.map(d => idbDelete(d.id)));
      }
      return rec;
    } catch {
      const list = lsReadAll();
      list.push(rec);
      // enforce limit
      const caseDocuments = list.filter(d => d.caseId === caseId);
      if (caseDocuments.length > MAX_DOCUMENTS) {
        caseDocuments.sort((a,b) => (a.updatedAt||0) - (b.updatedAt||0));
        const toDeleteIds = new Set(caseDocuments.slice(0, caseDocuments.length - MAX_DOCUMENTS).map(d => d.id));
        const filtered = list.filter(d => !toDeleteIds.has(d.id));
        lsWriteAll(filtered);
      } else {
        lsWriteAll(list);
      }
      return rec;
    }
  },

  // Update
  async update(id, patch) {
    try {
      const all = await idbGetAll();
      const idx = all.findIndex(d => d.id === id);
      if (idx === -1) return null;
      const updated = { ...all[idx], ...patch, updatedAt: safeNow() };
      await idbPut(updated);
      return updated;
    } catch {
      const list = lsReadAll();
      const idx = list.findIndex(d => d.id === id);
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
      const list = lsReadAll().filter(d => d.id !== id);
      lsWriteAll(list);
      return true;
    }
  },

  // Delete all documents for a case
  async removeByCase(caseId) {
    if (!caseId) return 0;
    try {
      const docs = await idbGetByIndex('caseId', caseId);
      await Promise.all(docs.map(d => idbDelete(d.id)));
      return docs.length;
    } catch {
      const list = lsReadAll();
      const toKeep = list.filter(d => d.caseId !== caseId);
      const deletedCount = list.length - toKeep.length;
      lsWriteAll(toKeep);
      return deletedCount;
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

  // Get by id
  async getById(id) {
    try {
      const all = await idbGetAll();
      return all.find(d => d.id === id) || null;
    } catch {
      return lsReadAll().find(d => d.id === id) || null;
    }
  },

  // Count documents for a case
  async countByCase(caseId) {
    if (!caseId) return 0;
    try {
      const docs = await idbGetByIndex('caseId', caseId);
      return docs.length;
    } catch {
      const all = lsReadAll();
      return all.filter(d => d.caseId === caseId).length;
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
    const sanitized = list.map(d => ({
      id: d.id || uuid(),
      caseId: d.caseId,
      name: (d.name || 'Neues Dokument').toString(),
      content: (d.content || '').toString(),
      createdAt: Number(d.createdAt) || safeNow(),
      updatedAt: Number(d.updatedAt) || safeNow()
    })).filter(d => d.caseId); // Only import documents with valid caseId

    try {
      for (const rec of sanitized) await idbPut(rec);
      return sanitized.length;
    } catch {
      lsWriteAll(sanitized);
      return sanitized.length;
    }
  },
};
