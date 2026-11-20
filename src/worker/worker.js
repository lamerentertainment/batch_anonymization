import * as ort from 'onnxruntime-web';
import { Gliner } from '../gliner/gliner.js';
import { createTokenizer } from '../gliner/tokenizer.js';
import { getStatus, models, readModelFile } from '../models/modelStore.js';

// Configuration
const MAX_CHUNK_LENGTH = 2000;
const MAX_WIDTH = 12; // max_width aus gliner_config.json des Modells
const MODEL = models.find(m => m.id === 'gliner-multi-pii');

// WebAssembly der ONNX Runtime von der eigenen Website (scripts/copy-vendor.js), nie vom CDN.
// Eine Datei für beide Backends: Sie rechnet auf dem Prozessor und steuert WebGPU an.
/* global __ORT_VERSION__ */
ort.env.wasm.wasmPaths = { wasm: `/vendor/ort-${__ORT_VERSION__}/ort-wasm-simd-threaded.jsep.wasm` };

/**
 * Worker state
 */
let gliner = null;
let tokenizer = null;
let isInitialized = false;
// Aktuelles Backend: { id: 'webgpu'|'wasm', label, fallbackReason }
let currentBackend = null;

// Update status in UI (for debugging)
function updateStatus(status) {
    const el = document.getElementById('status');
    if (el) el.textContent = status;
}

/** Liest eine Datei des Modells aus dem geprüften Modellspeicher. */
async function readRequiredFile(name) {
    const file = MODEL.files.find(f => f.name === name);
    const data = file && await readModelFile(file);
    if (!data) throw new Error(`${name} fehlt im Modellspeicher. Bitte unter «Modell/Programmupdate» neu laden.`);
    return data;
}

async function loadTokenizer() {
    const json = async name => JSON.parse(new TextDecoder().decode(await readRequiredFile(name)));
    return createTokenizer(await json('tokenizer.json'), await json('tokenizer_config.json'));
}

// Wohin die Rechnung geht: WebGPU (Grafikkarte, schnell) oder WebAssembly (Prozessor, langsamer,
// läuft aber praktisch überall). Hat WebGPU in diesem Tab einmal versagt, merkt sich das der Tab:
// Jede Erkennung startet einen neuen iframe, der sonst jedes Mal erst an WebGPU scheitern würde.
const BACKEND_KEY = 'gliner-backend-fallback';
// WebGPU hat in diesem Tab schon einmal eine Proberechnung bestanden: keine weitere Probe nötig
const WEBGPU_OK_KEY = 'gliner-webgpu-ok';
const BACKENDS = {
    webgpu: { label: 'Grafikkarte (WebGPU)' },
    wasm: { label: 'Prozessor (WebAssembly)' },
};

function readFallback() {
    try {
        return sessionStorage.getItem(BACKEND_KEY);
    } catch {
        return null;
    }
}

function rememberFallback(reason) {
    try {
        sessionStorage.setItem(BACKEND_KEY, reason);
        sessionStorage.removeItem(WEBGPU_OK_KEY);
    } catch { /* ohne Speicher wird WebGPU beim nächsten Mal erneut versucht */ }
}

function webgpuProven() {
    try {
        return sessionStorage.getItem(WEBGPU_OK_KEY) === '1';
    } catch {
        return false;
    }
}

/**
 * Ist WebGPU wirklich nutzbar? Der Browser kann WebGPU kennen (navigator.gpu), ohne dass eine
 * Grafikkarte bereitsteht (gesperrter Treiber, virtuelle Maschine, Remote-Desktop, Richtlinie).
 * Das Modell rechnet mit halber Genauigkeit (fp16) und braucht dafür «shader-f16».
 * @returns {Promise<string|null>} Grund, weshalb nicht, oder null, wenn WebGPU nutzbar ist
 */
async function webgpuUnavailable() {
    const remembered = readFallback();
    if (remembered) return remembered;
    if (!('gpu' in navigator)) return 'Der Browser unterstützt WebGPU nicht.';
    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return 'Keine Grafikkarte für WebGPU verfügbar.';
        if (!adapter.features.has('shader-f16')) return 'Die Grafikkarte unterstützt keine fp16-Berechnung.';
    } catch (err) {
        return `WebGPU nicht verfügbar: ${err.message}`;
    }
    return null;
}

/**
 * Erstellt GLiNER für ein Backend. WebGPU wird beim ersten Mal im Tab mit einer kurzen
 * Proberechnung geprüft, weil sich manche Fehler (Shader, Treiber) erst beim Rechnen zeigen.
 */
async function createGliner(backend, modelData, tokenizer) {
    // Die Modelldaten direkt, ohne Umweg über eine Blob-URL
    const session = await ort.InferenceSession.create(modelData, { executionProviders: [backend] });
    const instance = new Gliner({ session, Tensor: ort.Tensor, tokenizer, maxWidth: MAX_WIDTH });
    try {
        if (backend === 'webgpu' && !webgpuProven()) {
            await instance.inference({ text: 'Peter wohnt in Bern.', labels: ['person'], threshold: 0.5 });
            try {
                sessionStorage.setItem(WEBGPU_OK_KEY, '1');
            } catch { /* dann wird beim nächsten Mal erneut geprüft */ }
        }
    } catch (err) {
        await releaseGliner(instance);
        throw err;
    }
    return instance;
}

async function releaseGliner(instance) {
    try {
        await instance?.release();
    } catch { /* bereits freigegeben */ }
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
        let modelData = await readRequiredFile(weights.name);
        tokenizer = await loadTokenizer();

        let backend = 'webgpu';
        let fallbackReason = await webgpuUnavailable();
        if (fallbackReason) backend = 'wasm';

        if (backend === 'webgpu') {
            try {
                gliner = await createGliner('webgpu', modelData, tokenizer);
            } catch (err) {
                console.warn('[Worker] WebGPU fehlgeschlagen, weiter auf dem Prozessor:', err);
                fallbackReason = `WebGPU fehlgeschlagen: ${err.message}`;
                rememberFallback(fallbackReason);
                backend = 'wasm';
            }
        }
        if (backend === 'wasm') gliner = await createGliner('wasm', modelData, tokenizer);
        modelData = null; // Free memory

        isInitialized = true;
        currentBackend = { id: backend, label: BACKENDS[backend].label, fallbackReason };
        updateStatus(`Ready (${BACKENDS[backend].label})`);
        console.log('[Worker] GLiNER bereit auf', BACKENDS[backend].label, fallbackReason ? `– ${fallbackReason}` : '');

        // Notify parent that we are ready
        window.parent.postMessage({
            type: 'READY',
            backend: currentBackend,
        }, '*');

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
 * Rechnet einen Abschnitt. Versagt WebGPU erst jetzt (z. B. Grafikkarte verloren, Treiberfehler),
 * wechselt der Worker auf den Prozessor und rechnet denselben Abschnitt noch einmal.
 */
async function inferWithFallback(input) {
    try {
        return await gliner.inference(input);
    } catch (err) {
        if (currentBackend?.id !== 'webgpu') throw err;
        console.warn('[Worker] WebGPU beim Rechnen fehlgeschlagen, weiter auf dem Prozessor:', err);
        const fallbackReason = `WebGPU fehlgeschlagen: ${err.message}`;
        rememberFallback(fallbackReason);
        await releaseGliner(gliner);
        const weights = MODEL.files.find(f => f.name.endsWith('.onnx'));
        gliner = await createGliner('wasm', await readRequiredFile(weights.name), tokenizer);
        currentBackend = { id: 'wasm', label: BACKENDS.wasm.label, fallbackReason };
        return await gliner.inference(input);
    }
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
        const results = await inferWithFallback({ text: chunk, labels, threshold });

        const chunkEntities = results.map((ent) => ({
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
                    payload: entities,
                    backend: currentBackend,
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
