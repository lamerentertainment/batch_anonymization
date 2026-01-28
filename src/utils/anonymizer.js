/**
 * Anonymizer Utility
 * Handles entity detection with Gliner and text anonymization
 */

import { Gliner } from 'gliner';
import modelCache from './modelCache.js';

/**
 * Available entity labels for detection
 */
export const AVAILABLE_LABELS = [
    "person",
    "location",
    "street",
    "organization",
    "date",
    "time",
    "phone number",
    "mobile phone number",
    "landline phone number",
    "fax number",
    "email",
    "email address",
    "address",
    "postal code",
    "iban",
    "bank account number",
    "credit card number",
    "credit card expiration date",
    "credit card brand",
    "social security number",
    "tax identification number",
    "health insurance number",
    "health insurance id number",
    "national health insurance number",
    "insurance number",
    "insurance company",
    "passport number",
    "passport_number",
    "passport expiration date",
    "identity card number",
    "identity document number",
    "national id number",
    "driver's license number",
    "vehicle registration number",
    "license plate number",
    "registration number",
    "date of birth",
    "blood type",
    "medical condition",
    "medication",
    "ip address",
    "username",
    "digital signature",
    "social media handle",
    "student id number",
    "flight number",
    "train ticket number",
    "reservation number",
    "transaction number",
    "serial number",
    "visa number",
    "birth certificate number",
    "car brand",
    "car model",
    "colour"
];

/**
 * Default selected labels (common PII)
 */
export const DEFAULT_SELECTED_LABELS = [
    "person",
    "organization",
    "phone number",
    "email",
    "address",
    "iban",
    "credit card number",
];

/**
 * Maximum text chunk length for Gliner processing.
 * IMPORTANT: This is kept consistent to avoid ONNX tensor shape variations
 * which can cause memory issues and "out of bounds" errors.
 */
const MAX_CHUNK_LENGTH = 12000;

/**
 * Singleton class for managing Gliner instance
 */
class AnonymizerService {
    constructor() {
        this.gliner = null;
        this.isInitialized = false;
        this.isInitializing = false;
        this.inferenceCount = 0;
        this.maxInferencesBeforeReset = 50; // Reset model after N inferences to prevent accumulation
    }

    /**
     * Initialize the Gliner model
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<void>}
     */
    async initialize(onProgress = () => { }) {
        if (this.isInitialized) {
            return;
        }

        if (this.isInitializing) {
            // Wait for ongoing initialization
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.isInitializing = true;

        try {
            onProgress(0);

            const modelPath = "./models/gliner_multi_pii-v1/onnx/model_fp16.onnx";

            // Load model with caching
            onProgress(10);
            let modelData = await modelCache.getOrDownloadModel(
                modelPath,
                'quantized',
                (progress) => {
                    onProgress(10 + Math.min(progress * 0.7, 70));
                }
            );

            // Create blob URL for model
            const modelBlob = new Blob([modelData], { type: 'application/octet-stream' });
            const modelUrl = URL.createObjectURL(modelBlob);
            modelData = null; // Free memory

            onProgress(85);

            // Detect execution providers
            let executionProviders = ['wasm'];
            if ('gpu' in navigator) {
                executionProviders.unshift('webgpu');
            }

            // Initialize Gliner
            this.gliner = new Gliner({
                tokenizerPath: "./gliner_multi_pii-v1",
                onnxSettings: {
                    modelPath: modelUrl,
                    wasmPaths: {
                        cpu: "./models/gliner_multi_pii-v1/onnx/cpu.wasm",
                        gpu: "./models/gliner_multi_pii-v1/onnx/gpu.wasm",
                    },
                    executionProviders: executionProviders,
                    sessionOptions: {
                        enableCpuMemArena: false,
                        enableMemPattern: false,
                        graphOptimizationLevel: 'basic'
                    }
                },
                transformersSettings: {
                    useBrowserCache: true,
                    allowLocalModels: true,
                    allowRemoteModels: false,
                },
                maxWidth: 12,
            });

            onProgress(95);
            await this.gliner.initialize();

            // Clean up blob URL
            URL.revokeObjectURL(modelUrl);

            this.isInitialized = true;
            onProgress(100);

            console.log('Anonymizer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Anonymizer:', error);
            this.gliner = null;
            throw error;
        } finally {
            this.isInitializing = false;
        }
    }

    /**
     * Split text into chunks for processing
     * @param {string} text
     * @param {number} maxLength
     * @returns {string[]}
     */
    splitTextIntoChunks(text, maxLength = MAX_CHUNK_LENGTH) {
        const chunks = [];
        for (let i = 0; i < text.length; i += maxLength) {
            chunks.push(text.substring(i, i + maxLength));
        }
        return chunks;
    }

    /**
     * Detect entities in text using Gliner
     * @param {string} text - Text to analyze
     * @param {string[]} labels - Entity labels to detect
     * @returns {Promise<Array<{id: number, name: string, type: string}>>}
     */
    async detectEntities(text, labels = DEFAULT_SELECTED_LABELS, threshold = 0.1) {
        if (!this.isInitialized || !this.gliner) {
            throw new Error('Anonymizer not initialized. Call initialize() first.');
        }

        if (!text || text.trim().length === 0) {
            return [];
        }

        const chunks = this.splitTextIntoChunks(text);
        const allEntities = [];
        let entityId = 1;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Track inference count to detect potential memory accumulation
            this.inferenceCount++;

            let results;
            try {
                results = await this.gliner.inference({
                    texts: [chunk],
                    entities: labels,
                    threshold: threshold,
                });
            } catch (error) {
                // If we get an out-of-bounds or memory error, try resetting the model
                if (error.message && (
                    error.message.includes('out of bounds') ||
                    error.message.includes('memory') ||
                    error.message.includes('OOM') ||
                    error.message.includes('allocation')
                )) {
                    console.warn('Memory-related error detected, attempting model reset...', error.message);
                    await this.resetModel();

                    // Retry the inference after reset
                    results = await this.gliner.inference({
                        texts: [chunk],
                        entities: labels,
                        threshold: threshold,
                    });
                } else {
                    throw error;
                }
            }

            const chunkEntities = results[0].map((ent) => ({
                id: entityId++,
                name: ent.spanText,
                type: ent.label,
            }));

            allEntities.push(...chunkEntities);

            // Explicitly clear results reference to help GC
            results = null;

            // Clear the chunk reference from the array to allow GC
            chunks[i] = null;
        }

        // Clear chunks array
        chunks.length = 0;

        // Deduplicate entities
        return this.deduplicateEntities(allEntities);
    }

    /**
     * Remove duplicate entities based on name and type
     * @param {Array} entities
     * @returns {Array}
     */
    deduplicateEntities(entities) {
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
     * Anonymize text by replacing entities with placeholders
     * @param {string} text - Original text
     * @param {Array<{id: number, name: string, type: string}>} entities - Entities to anonymize
     * @param {Object} options - Anonymization options
     * @param {boolean} options.anonymizePartialWords - Whether to anonymize individual words of multi-word entities (default: true)
     * @param {number} options.minCharacterThreshold - Minimum character length for entities to be anonymized (default: 0)
     * @param {Array<string>} options.exclusionList - List of words that should never be anonymized (default: [])
     * @returns {string} - Anonymized text
     */
    anonymizeText(text, entities, options = {}) {
        if (!entities || entities.length === 0) {
            return text;
        }

        // Default options
        const {
            anonymizePartialWords = true,
            minCharacterThreshold = 0,
            exclusionList = []
        } = options;

        // Normalize exclusion list to lowercase for case-insensitive comparison
        const normalizedExclusionList = exclusionList.map(word => word.toLowerCase());

        let anonymized = text;
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const letters = 'abcdefghijklmnopqrstuvwxyz';

        const isExcluded = (word) => {
            return normalizedExclusionList.includes(word.toLowerCase());
        };

        entities.forEach(entity => {
            if (!entity.name) return;

            // Split entity name into words
            const words = entity.name.split(/\s+|-/).filter(w => w && w.trim().length > 0);

            // Skip entire entity only if the FULL name matches an excluded term
            if (isExcluded(entity.name)) {
                return;
            }

            if (words.length > 1) {
                // Multi-word entity: replace full match with sequence of placeholders
                const fullJoined = words.map(w => escapeRegex(w)).join('[\\s-]+');
                const fullPattern = new RegExp(`\\b${fullJoined}\\b`, 'gi');
                const sequence = words
                    .map((w, idx) => {
                        // If individual word is excluded, keep it. Otherwise make placeholder.
                        if (isExcluded(w)) return w;
                        return `[${entity.id}_${entity.type}_${letters[idx] || String(idx + 1)}]`;
                    })
                    .join(' ');
                anonymized = anonymized.replace(fullPattern, sequence);
            } else if (words.length === 1) {
                // Single word entity: Check exclusion before replacing
                if (isExcluded(words[0])) return;

                const singleWordPattern = new RegExp(`\\b${escapeRegex(words[0])}\\b`, 'gi');
                anonymized = anonymized.replace(singleWordPattern, `[${entity.id}_${entity.type}]`);
            }

            // Replace remaining individual words (only if anonymizePartialWords is true)
            if (anonymizePartialWords) {
                words.forEach((w, idx) => {
                    // Check min length for partial words
                    if (minCharacterThreshold > 0 && w.length < minCharacterThreshold) {
                        return;
                    }

                    // Skip individual words that are in the exclusion list
                    if (isExcluded(w)) {
                        return;
                    }
                    const suffix = letters[idx] || String(idx + 1);
                    const wordPattern = new RegExp(`\\b${escapeRegex(w)}\\b`, 'gi');
                    anonymized = anonymized.replace(wordPattern, `[${entity.id}_${entity.type}_${suffix}]`);
                });
            }
        });

        return anonymized;
    }

    /**
     * Check if service is ready
     * @returns {boolean}
     */
    isReady() {
        return this.isInitialized && this.gliner !== null;
    }

    /**
     * Release memory between batch operations.
     * This helps prevent memory accumulation during sequential processing.
     * Note: The model stays loaded, only inference caches are cleared.
     */
    async releaseInferenceMemory() {
        // Check if we should do a full model reset based on inference count
        if (this.inferenceCount >= this.maxInferencesBeforeReset) {
            console.log(`Inference count (${this.inferenceCount}) reached threshold, performing model reset...`);
            await this.resetModel();
            return;
        }

        // Trigger garbage collection hint (if available in browser)
        if (typeof window !== 'undefined' && window.gc) {
            try {
                window.gc();
            } catch (e) {
                // Ignore - gc() is typically only available in debug mode
            }
        }

        // The Gliner library may have internal caches - this is a signal
        // to release them. Currently Gliner doesn't expose a cache clear method,
        // but calling this between files gives the JS engine a chance to GC.
        return Promise.resolve();
    }

    /**
     * Reset the model by destroying and reinitializing it.
     * This is a drastic measure to clear accumulated memory from ONNX Runtime.
     */
    async resetModel() {
        console.log('Resetting Gliner model to clear accumulated memory...');

        // Destroy the current instance
        await this.destroy();

        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Reinitialize
        await this.initialize(() => {});

        // Reset inference counter
        this.inferenceCount = 0;

        console.log('Model reset complete');
    }

    /**
     * Completely destroy the Gliner instance and release all memory.
     * After calling this, initialize() must be called again before use.
     */
    async destroy() {
        if (this.gliner) {
            // If Gliner has a dispose/destroy method, call it
            if (typeof this.gliner.dispose === 'function') {
                await this.gliner.dispose();
            } else if (typeof this.gliner.destroy === 'function') {
                await this.gliner.destroy();
            }

            this.gliner = null;
        }

        this.isInitialized = false;
        this.isInitializing = false;

        // Trigger garbage collection hint
        if (typeof window !== 'undefined' && window.gc) {
            try {
                window.gc();
            } catch (e) {
                // Ignore
            }
        }

        console.log('Anonymizer destroyed and memory released');
    }
}

// Singleton instance
const anonymizerService = new AnonymizerService();

export default anonymizerService;
export { AnonymizerService };
