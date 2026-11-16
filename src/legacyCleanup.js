// Entfernt bei jedem Start, was frühere Versionen der App im Browser abgelegt haben: das Modell
// in IndexedDB und die Caches des alten Service Workers (Modell, Tokenizer, App-Dateien).
// Das neue Modell liegt geprüft in «models-v1» (src/models/modelStore.js).
// Der Service Worker räumt dasselbe beim Aktivieren auf; das hier fängt ab, was dabei liegen
// blieb (z. B. weil damals noch ein Tab der alten Version offen war). Kostet nichts, wenn nichts da ist.

const LEGACY_DB = 'IusableAnonymizationModels';
const LEGACY_CACHES = ['iusable-gliner-model-cache-v2', 'iusable-app-cache-v1', 'transformers-cache'];

export async function removeLegacyStorage() {
    try {
        if (globalThis.indexedDB?.databases) {
            const dbs = await indexedDB.databases();
            if (dbs.some(db => db.name === LEGACY_DB)) indexedDB.deleteDatabase(LEGACY_DB);
        } else {
            indexedDB?.deleteDatabase(LEGACY_DB);
        }
        if (globalThis.caches) {
            for (const name of LEGACY_CACHES) await caches.delete(name);
        }
    } catch (err) {
        console.warn('Alte Speicher konnten nicht entfernt werden:', err);
    }
}
