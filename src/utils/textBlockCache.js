// Lightweight IndexedDB helper with localStorage fallback for Text Blocks
const DB_NAME = 'iusable-cache';
const STORE = 'textBlockLibrary';
const LS_KEY = 'textBlockLibrary.fallback';
const MAX_BLOCKS = 1000;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 3); // Updated to version 3 for case management
      req.onupgradeneeded = () => {
        const db = req.result;

        // Create promptLibrary store if it doesn't exist (backward compatibility)
        if (!db.objectStoreNames.contains('promptLibrary')) {
          const os1 = db.createObjectStore('promptLibrary', { keyPath: 'id' });
          os1.createIndex('updatedAt', 'updatedAt');
          os1.createIndex('title', 'title');
        }

        // Create textBlockLibrary store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('updatedAt', 'updatedAt');
          os.createIndex('tag', 'tag', { unique: true });
          os.createIndex('description', 'description');
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

// Validate and normalize tag format (lowercase, alphanumeric + hyphens only)
function normalizeTag(tag) {
  if (!tag) return '';
  return tag.toString().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default {
  // List (with optional filters)
  async list({ query = '', tag = '', favoritesOnly = false } = {}) {
    try {
      let list = await idbGetAll();
      if (!Array.isArray(list)) list = [];
      const q = query.trim().toLowerCase();
      const searchTag = normalizeTag(tag);
      list = list.filter(b =>
        (!favoritesOnly || b.favorite) &&
        (!searchTag || b.tag === searchTag) &&
        (!q || (b.tag?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) || b.content?.toLowerCase().includes(q)))
      );
      // sort by updatedAt desc
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    } catch {
      // fallback
      let list = lsReadAll();
      const q = query.trim().toLowerCase();
      const searchTag = normalizeTag(tag);
      list = list.filter(b =>
        (!favoritesOnly || b.favorite) &&
        (!searchTag || b.tag === searchTag) &&
        (!q || b.tag?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) || b.content?.toLowerCase().includes(q))
      );
      list.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
      return list;
    }
  },

  // Create
  async create({ tag, description, content, favorite = false }) {
    const now = safeNow();
    const normalizedTag = normalizeTag(tag);

    if (!normalizedTag) {
      throw new Error('Tag is required and must contain valid characters');
    }

    // Check for duplicate tags
    const existing = await this.getByTag(normalizedTag);
    if (existing) {
      throw new Error(`Tag "${normalizedTag}" already exists`);
    }

    const rec = {
      id: uuid(),
      tag: normalizedTag,
      description: (description || '').toString().trim(),
      content: content || '',
      favorite: !!favorite,
      createdAt: now,
      updatedAt: now,
      uses: 0
    };

    try {
      await idbPut(rec);
      // enforce limit
      const all = await idbGetAll();
      if (all.length > MAX_BLOCKS) {
        all.sort((a,b) => (a.updatedAt||0) - (b.updatedAt||0));
        const toDelete = all.slice(0, all.length - MAX_BLOCKS);
        await Promise.all(toDelete.map(b => idbDelete(b.id)));
      }
      return rec;
    } catch {
      const list = lsReadAll();
      list.push(rec);
      // enforce limit
      if (list.length > MAX_BLOCKS) list.splice(0, list.length - MAX_BLOCKS);
      lsWriteAll(list);
      return rec;
    }
  },

  // Update
  async update(id, patch) {
    try {
      const all = await idbGetAll();
      const idx = all.findIndex(b => b.id === id);
      if (idx === -1) return null;

      // If updating tag, normalize and check for duplicates
      if (patch.tag !== undefined) {
        const normalizedTag = normalizeTag(patch.tag);
        if (!normalizedTag) {
          throw new Error('Tag must contain valid characters');
        }
        // Check if another record already has this tag
        const existing = all.find(b => b.id !== id && b.tag === normalizedTag);
        if (existing) {
          throw new Error(`Tag "${normalizedTag}" already exists`);
        }
        patch.tag = normalizedTag;
      }

      const updated = { ...all[idx], ...patch, updatedAt: safeNow() };
      await idbPut(updated);
      return updated;
    } catch (err) {
      // If it's a validation error, re-throw it
      if (err.message && (err.message.includes('Tag') || err.message.includes('already exists'))) {
        throw err;
      }

      // Otherwise use localStorage fallback
      const list = lsReadAll();
      const idx = list.findIndex(b => b.id === id);
      if (idx === -1) return null;

      if (patch.tag !== undefined) {
        const normalizedTag = normalizeTag(patch.tag);
        if (!normalizedTag) {
          throw new Error('Tag must contain valid characters');
        }
        const existing = list.find(b => b.id !== id && b.tag === normalizedTag);
        if (existing) {
          throw new Error(`Tag "${normalizedTag}" already exists`);
        }
        patch.tag = normalizedTag;
      }

      list[idx] = { ...list[idx], ...patch, updatedAt: safeNow() };
      lsWriteAll(list);
      return list[idx];
    }
  },

  // Delete
  async remove(id) {
    try { await idbDelete(id); return true; } catch { const list = lsReadAll().filter(b => b.id !== id); lsWriteAll(list); return true; }
  },

  // Clear all
  async clear() { try { await idbClear(); } catch { lsWriteAll([]); } },

  // Increment usage counter
  async markUsed(id) {
    const block = await this.getById(id);
    if (!block) return null;
    return this.update(id, { uses: (block.uses || 0) + 1 });
  },

  // Get by id
  async getById(id) {
    try {
      const all = await idbGetAll();
      return all.find(b => b.id === id) || null;
    } catch {
      return lsReadAll().find(b => b.id === id) || null;
    }
  },

  // Get by tag (case-insensitive)
  async getByTag(tag) {
    const normalizedTag = normalizeTag(tag);
    if (!normalizedTag) return null;

    try {
      const all = await idbGetAll();
      return all.find(b => b.tag === normalizedTag) || null;
    } catch {
      return lsReadAll().find(b => b.tag === normalizedTag) || null;
    }
  },

  // Get multiple by tags
  async getByTags(tags) {
    if (!Array.isArray(tags)) return [];
    const normalizedTags = tags.map(normalizeTag).filter(Boolean);

    try {
      const all = await idbGetAll();
      return all.filter(b => normalizedTags.includes(b.tag));
    } catch {
      return lsReadAll().filter(b => normalizedTags.includes(b.tag));
    }
  },

  // Import / Export
  async export() {
    try { return await idbGetAll(); } catch { return lsReadAll(); }
  },
  async import(list) {
    if (!Array.isArray(list)) return 0;
    const sanitized = list.map(b => ({
      id: b.id || uuid(),
      tag: normalizeTag(b.tag) || `block-${uuid().slice(0,8)}`,
      description: (b.description || '').toString(),
      content: (b.content || '').toString(),
      favorite: !!b.favorite,
      createdAt: Number(b.createdAt) || safeNow(),
      updatedAt: Number(b.updatedAt) || safeNow(),
      uses: Number(b.uses) || 0
    }));

    // Check for duplicate tags
    const tagCounts = {};
    sanitized.forEach(b => {
      tagCounts[b.tag] = (tagCounts[b.tag] || 0) + 1;
    });
    const duplicates = Object.entries(tagCounts).filter(([_, count]) => count > 1).map(([tag]) => tag);
    if (duplicates.length > 0) {
      throw new Error(`Import contains duplicate tags: ${duplicates.join(', ')}`);
    }

    try {
      for (const rec of sanitized) await idbPut(rec);
      return sanitized.length;
    } catch {
      lsWriteAll(sanitized);
      return sanitized.length;
    }
  },
};
