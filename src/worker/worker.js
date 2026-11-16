import { Gliner } from 'gliner';
import { env } from '@xenova/transformers';
import { getStatus, models, readModelFile } from '../models/modelStore.js';

// Configuration
const MAX_CHUNK_LENGTH = 2000;
const MODEL = models.find(m => m.id === 'gliner-multi-pii');
// Muss zu dem repo-Namen passen, den transformers.js in seinen Anfragen verwendet (siehe unten)
const TOKENIZER_REPO = MODEL.repo;
// ONNX Runtime von gliner, von der eigenen Website (scripts/copy-vendor.js), nie vom CDN
/* global __GLINER_ORT_VERSION__ */
const ORT_DIR = `/vendor/ort-${__GLINER_ORT_VERSION__}/`;

/**
 * Worker state
 */
let gliner = null;
let isInitialized = false;

// Update status in UI (for debugging)
function updateStatus(status) {
    const el = document.getElementById('status');
    if (el) el.textContent = status;
}

// Der Tokenizer wird von transformers.js geladen. Es erhält einen eigenen «Cache», der nur aus dem
// geprüften Modellspeicher liest (Dateiname → Katalogeintrag). transformers.js verlangt formal eine
// entfernte Quelle; sie zeigt auf eine Domain, die es nicht gibt (.invalid, zudem von der CSP
// verboten). Ob alle Dateien im Speicher sind, prüft initialize() vorher.
function useVerifiedModelStore() {
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.remoteHost = 'https://kein-netz.invalid/';
    env.useBrowserCache = false;
    env.useFSCache = false;
    env.useCustomCache = true;
    env.customCache = {
        async match(key) {
            const name = String(key).split('/').pop();
            const file = MODEL.files.find(f => f.name === name);
            if (!file) return undefined;
            const data = await readModelFile(file);
            return data ? new Response(data) : undefined;
        },
        async put() { /* der Modellspeicher wird nur auf der Seite «Modell/Programmupdate» beschrieben */ },
    };
}

/**
 * Initialize GLiNER
 */
async function initialize() {
    if (isInitialized) return;

    try {
        updateStatus('Initializing...');

        if ((await getStatus(MODEL)) !== 'installiert') {
            throw new Error('Das Modell ist nicht vollständig installiert. Bitte unter «Modell/Programmupdate» laden.');
        }
        const weights = MODEL.files.find(f => f.name.endsWith('.onnx'));
        let modelData = await readModelFile(weights);

        // WebGPU, wo vorhanden, sonst WebAssembly auf dem Prozessor
        const executionProvider = 'gpu' in navigator ? 'webgpu' : 'wasm';
        const wasmFile = executionProvider === 'webgpu' ? 'ort-wasm-simd-threaded.jsep.wasm' : 'ort-wasm-simd-threaded.wasm';
        console.log('[Worker] Execution provider:', executionProvider);

        console.log('[Worker] Creating Gliner instance...');
        gliner = new Gliner({
            tokenizerPath: TOKENIZER_REPO,
            onnxSettings: {
                // Die Modelldaten direkt, ohne Umweg über eine Blob-URL
                modelPath: modelData,
                executionProvider,
                wasmPaths: { wasm: `${ORT_DIR}${wasmFile}` },
            },
            transformersSettings: {
                useBrowserCache: false,
                allowLocalModels: false,
            },
            maxWidth: 12,
        });
        // Der Gliner-Konstruktor setzt env neu; danach den eigenen Speicher einhängen
        useVerifiedModelStore();

        await gliner.initialize();
        modelData = null; // Free memory

        isInitialized = true;
        updateStatus('Ready');
        console.log('GLiNER Worker initialized');

        // Notify parent that we are ready
        window.parent.postMessage({ type: 'READY' }, '*');

    } catch (error) {
        console.error('GLiNER Worker initialization error:', error);
        updateStatus('Error: ' + error.message);
        window.parent.postMessage({ type: 'ERROR', error: error.message }, '*');
    }
}

/**
 * Split text into chunks
 */
function splitTextIntoChunks(text, maxLength = MAX_CHUNK_LENGTH) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.substring(i, i + maxLength));
    }
    return chunks;
}

/**
 * Deduplicate entities
 */
function deduplicateEntities(entities) {
    const seen = new Set();
    const unique = [];

    entities.forEach(entity => {
        const key = `${entity.name.toLowerCase()}_${entity.type}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(entity);
        }
    });

    // Reassign sequential IDs
    return unique.map((entity, index) => ({
        ...entity,
        id: index + 1
    }));
}

/**
 * Detect entities
 */
async function detectEntities(text, labels, threshold) {
    if (!isInitialized || !gliner) {
        throw new Error('GLiNER not initialized');
    }

    if (!text || text.trim().length === 0) {
        return [];
    }

    updateStatus('Processing...');

    const chunks = splitTextIntoChunks(text);
    const allEntities = [];
    let entityId = 1;

    for (const chunk of chunks) {
        // Run inference
        const results = await gliner.inference({
            texts: [chunk],
            entities: labels,
            threshold: threshold,
        });

        const chunkEntities = results[0].map((ent) => ({
            id: entityId++,
            name: ent.spanText,
            type: ent.label,
        }));

        allEntities.push(...chunkEntities);
    }

    const uniqueEntities = deduplicateEntities(allEntities);
    updateStatus('Done');
    return uniqueEntities;
}

// Message handler
window.addEventListener('message', async (event) => {
    const { type, payload, id } = event.data;

    switch (type) {
        case 'INIT':
            await initialize();
            break;

        case 'DETECT':
            try {
                const { text, labels, threshold } = payload;
                const entities = await detectEntities(text, labels, threshold);
                window.parent.postMessage({
                    type: 'RESULT',
                    id: id,
                    payload: entities
                }, '*');
            } catch (error) {
                console.error('Detection error:', error);
                window.parent.postMessage({
                    type: 'ERROR',
                    id: id,
                    error: error.message
                }, '*');
            }
            break;
    }
});

// Auto-initialize if requested via query param or just wait for message
// For this architecture, we'll wait for explicit INIT message or we can start automatically
// starting automatically is better to save time
initialize();
