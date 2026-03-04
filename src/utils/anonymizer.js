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
    "location",
    "street",
    "organization",
    "phone number",
    "email",
    "address",
    "iban",
    "credit card number",
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

        for (const chunk of chunks) {
            const results = await this.gliner.inference({
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
            exclusionList = [],
            courtStyle = false
        } = options;

        // Normalize exclusion list to lowercase for case-insensitive comparison
        const normalizedExclusionList = exclusionList.map(word => word.toLowerCase());

        let anonymized = text;
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const letters = 'abcdefghijklmnopqrstuvwxyz';

        const isExcluded = (word) => {
            return normalizedExclusionList.includes(word.toLowerCase());
        };

        const getCourtIdentifier = (index) => {
            let res = '';
            let n = index;
            while (n >= 0) {
                res = String.fromCharCode(65 + (n % 26)) + res;
                n = Math.floor(n / 26) - 1;
            }
            return res + ".________";
        };

        if (courtStyle) {
            let courtCounter = 0;
            // First pass: find highest existing court counter if any entities already have courtId
            entities.forEach(entity => {
                if (entity.courtId) {
                    const match = entity.courtId.match(/^([A-Z]+)\./);
                    if (match) {
                        const idStr = match[1];
                        let val = 0;
                        for (let i = 0; i < idStr.length; i++) {
                            val = val * 26 + (idStr.charCodeAt(i) - 64);
                        }
                        courtCounter = Math.max(courtCounter, val);
                    }
                }
            });

            entities.forEach(entity => {
                const type = entity.type ? entity.type.toLowerCase() : '';
                if (type === 'person' || type === 'organization') {
                    if (!entity.courtId) {
                        entity.courtId = getCourtIdentifier(courtCounter++);
                    }
                }
            });
        }

        entities.forEach(entity => {
            if (!entity.name) return;

            // Split entity name into words, excluding punctuation like commas
            const words = entity.name.split(/[\s,;-]+/).filter(w => w && w.trim().length > 0);

            // Skip entire entity only if the FULL name matches an excluded term
            // Manual entities bypass the exclusion list
            if (entity.type !== 'manual' && isExcluded(entity.name)) {
                return;
            }

            if (courtStyle) {
                let courtReplacement = "________";
                const type = entity.type ? entity.type.toLowerCase() : '';

                if (type === 'person' || type === 'organization') {
                    const courtId = entity.courtId || "________";
                    let suffixStr = '';
                    if (type === 'organization') {
                        const suffixes = ['AG', 'GmbH', 'SA', 'Genossenschaft', 'Kollektivgesellschaft', 'Kommanditgesellschaft', 'Verein', 'Stiftung', 'Inc', 'Corp', 'LLC', 'Ltd', 'SE'];
                        const lastWord = words[words.length - 1];
                        if (lastWord && suffixes.some(s => s.toLowerCase() === lastWord.toLowerCase())) {
                            suffixStr = ' ' + lastWord;
                        }
                    }
                    courtReplacement = courtId + suffixStr;
                }

                if (options.testPreviewMode) {
                    courtReplacement = `[${entity.id}_${entity.type}_court_${courtReplacement}]`;
                }

                const fullJoined = words.map(w => escapeRegex(w)).join('[\\s,;-]+');
                const fullPattern = new RegExp(`\\b${fullJoined}\\b`, 'gi');
                anonymized = anonymized.replace(fullPattern, courtReplacement);

                return;
            }

            if (words.length > 1) {
                // Multi-word entity: replace full match with sequence of placeholders
                // Using capturing groups to preserve original separators (e.g., commas, hyphens)
                const fullJoined = words.map(w => escapeRegex(w)).join('([\\s,;-]+)');
                const fullPattern = new RegExp(`\\b${fullJoined}\\b`, 'gi');

                anonymized = anonymized.replace(fullPattern, (match, ...args) => {
                    let result = '';
                    for (let i = 0; i < words.length; i++) {
                        const w = words[i];
                        // Manual entities bypass the exclusion list
                        if (entity.type !== 'manual' && isExcluded(w)) {
                            result += w;
                        } else {
                            result += `[${entity.id}_${entity.type}_${letters[i] || String(i + 1)}]`;
                        }

                        // Add the captured separator back
                        if (i < words.length - 1) {
                            result += args[i]; // args[0] is first separator, args[1] is second, etc.
                        }
                    }
                    return result;
                });
            } else if (words.length === 1) {
                // Single word entity: Check exclusion and min length before replacing
                // Manual entities bypass these checks
                if (entity.type !== 'manual') {
                    if (isExcluded(words[0])) return;
                    if (minCharacterThreshold > 0 && words[0].length < minCharacterThreshold) {
                        return;
                    }
                }

                const singleWordPattern = new RegExp(`\\b${escapeRegex(words[0])}\\b`, 'gi');
                anonymized = anonymized.replace(singleWordPattern, `[${entity.id}_${entity.type}]`);
            }

            // Replace remaining individual words (only if anonymizePartialWords is true)
            if (anonymizePartialWords) {
                words.forEach((w, idx) => {
                    // Manual entities bypass these checks
                    if (entity.type !== 'manual') {
                        // Check min length for partial words
                        if (minCharacterThreshold > 0 && w.length < minCharacterThreshold) {
                            return;
                        }

                        // Skip individual words that are in the exclusion list
                        if (isExcluded(w)) {
                            return;
                        }
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
}

// Singleton instance
const anonymizerService = new AnonymizerService();

export default anonymizerService;
export { AnonymizerService };
