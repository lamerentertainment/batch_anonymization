import { Gliner } from 'gliner';
import modelCache from '../utils/modelCache.js';

// Configuration
const MAX_CHUNK_LENGTH = 2000;
const MODEL_PATH = "./models/gliner_multi_pii-v1/onnx/model_fp16.onnx";
const TOKENIZER_PATH = "./gliner_multi_pii-v1";
const WASM_PATHS = {
    cpu: "./models/gliner_multi_pii-v1/onnx/cpu.wasm",
    gpu: "./models/gliner_multi_pii-v1/onnx/gpu.wasm",
};

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

/**
 * Initialize GLiNER
 */
async function initialize() {
    if (isInitialized) return;

    try {
        updateStatus('Initializing...');

        // Load model with caching
        // We reuse the modelCache utility which uses IndexedDB
        // This allows sharing the model cache between main thread and iframes
        let modelData = await modelCache.getOrDownloadModel(
            MODEL_PATH,
            'quantized',
            (progress) => {
                // Optional: Report download progress
            }
        );

        // Create blob URL for model
        const modelBlob = new Blob([modelData], { type: 'application/octet-stream' });
        const modelUrl = URL.createObjectURL(modelBlob);

        // Detect execution providers
        // For now, force WASM only to avoid WebGPU instability and memory issues
        const executionProviders = ['wasm'];
        console.log('[Worker] Execution providers:', executionProviders);

        // Initialize Gliner
        console.log('[Worker] Creating Gliner instance...');
        gliner = new Gliner({
            tokenizerPath: TOKENIZER_PATH,
            onnxSettings: {
                modelPath: modelUrl,
                wasmPaths: WASM_PATHS,
                executionProviders: executionProviders,
                sessionOptions: {
                    enableCpuMemArena: false,
                    enableMemPattern: false,
                    graphOptimizationLevel: 'basic',
                    executionMode: 'sequential', // Force sequential execution
                    interOpNumThreads: 1,
                    intraOpNumThreads: 1
                }
            },
            transformersSettings: {
                useBrowserCache: true,
                allowLocalModels: true,
                allowRemoteModels: false,
            },
            maxWidth: 12,
        });

        await gliner.initialize();

        // Clean up blob URL
        URL.revokeObjectURL(modelUrl);

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
