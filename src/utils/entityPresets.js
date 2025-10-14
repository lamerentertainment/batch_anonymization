// Utility for saving/loading named entity lists (presets)
// Storage backend: localStorage (stringified JSON)
// Schema: {
//   [name]: { name, entities: Array, mode: 'anonymize'|'pseudonymize', createdAt, updatedAt }
// }

const STORAGE_KEY = 'entityPresets';

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to parse entity presets from localStorage, resetting.', e);
    return {};
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listPresets() {
  const store = readStore();
  return Object.values(store)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .map(p => ({ name: p.name, count: Array.isArray(p.entities) ? p.entities.length : 0, updatedAt: p.updatedAt }));
}

export function savePreset(name, entities, mode = 'anonymize') {
  if (!name || !name.trim()) throw new Error('Preset name is required');
  if (!Array.isArray(entities)) throw new Error('Entities must be an array');
  const store = readStore();
  const now = Date.now();
  store[name] = {
    name,
    entities,
    mode,
    createdAt: store[name]?.createdAt || now,
    updatedAt: now,
  };
  writeStore(store);
}

export function loadPreset(name) {
  const store = readStore();
  return store[name] ? store[name] : null;
}

export function deletePreset(name) {
  const store = readStore();
  if (store[name]) {
    delete store[name];
    writeStore(store);
  }
}

export function clearAllPresets() {
  writeStore({});
}
