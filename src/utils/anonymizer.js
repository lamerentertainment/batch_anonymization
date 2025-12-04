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
    "social security number"
];

/**
 * Maximum text chunk length for Gliner processing
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
    }

    /**
     * Initialize the Gliner model
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<void>}
     */
    async initialize(onProgress = () => {}) {
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
    async detectEntities(text, labels = DEFAULT_SELECTED_LABELS) {
        if (!this.isInitialized || !this.gliner) {
            throw new Error('Anonymizer not initialized. Call initialize() first.');
        }

        if (!text || text.trim().length === 0) {
            return [];
        }

        const chunks = this.splitTextIntoChunks(text);
        const allEntities = [];
        let entityId = 1;

        for (const chunk of chunks) {
            const results = await this.gliner.inference({
                texts: [chunk],
                entities: labels,
                threshold: 0.1,
            });

            const chunkEntities = results[0].map((ent) => ({
                id: entityId++,
                name: ent.spanText,
                type: ent.label,
            }));

            allEntities.push(...chunkEntities);
        }

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
     * @returns {string} - Anonymized text
     */
    anonymizeText(text, entities) {
        if (!entities || entities.length === 0) {
            return text;
        }

        let anonymized = text;
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const letters = 'abcdefghijklmnopqrstuvwxyz';

        entities.forEach(entity => {
            if (!entity.name) return;

            // Split entity name into words
            const words = entity.name.split(/\s+|-/).filter(w => w && w.trim().length > 0);

            if (words.length > 1) {
                // Multi-word entity: replace full match with sequence of placeholders
                const fullJoined = words.map(w => escapeRegex(w)).join('[\\s-]+');
                const fullPattern = new RegExp(`\\b${fullJoined}\\b`, 'gi');
                const sequence = words
                    .map((_, idx) => `[${entity.id}_${entity.type}_${letters[idx] || String(idx + 1)}]`)
                    .join(' ');
                anonymized = anonymized.replace(fullPattern, sequence);
            } else if (words.length === 1) {
                // Single word entity
                const singleWordPattern = new RegExp(`\\b${escapeRegex(words[0])}\\b`, 'gi');
                anonymized = anonymized.replace(singleWordPattern, `[${entity.id}_${entity.type}]`);
            }

            // Replace remaining individual words
            words.forEach((w, idx) => {
                const suffix = letters[idx] || String(idx + 1);
                const wordPattern = new RegExp(`\\b${escapeRegex(w)}\\b`, 'gi');
                anonymized = anonymized.replace(wordPattern, `[${entity.id}_${entity.type}_${suffix}]`);
            });
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
}

// Singleton instance
const anonymizerService = new AnonymizerService();

export default anonymizerService;
export { AnonymizerService };
