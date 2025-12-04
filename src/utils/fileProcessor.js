/**
 * File Processor Utility
 * Handles text extraction from various file formats (TXT, PDF, DOCX)
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Initialize PDF.js worker
const initPdfWorker = () => {
    const localWorkerPath = '/pdf.worker.min.mjs';
    const cdnWorkerPath = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    fetch(localWorkerPath, { method: 'HEAD' })
        .then(() => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
            console.log('Using local PDF.js worker (offline mode)');
        })
        .catch(() => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerPath;
            console.log('Using CDN PDF.js worker fallback');
        });
};

// Initialize on module load
initPdfWorker();

/**
 * Supported file types
 */
export const SUPPORTED_EXTENSIONS = ['.txt', '.pdf', '.docx', '.doc'];
export const SUPPORTED_MIME_TYPES = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
];

/**
 * Maximum file size (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate a file for processing
 * @param {File} file - File to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file) {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    const extension = '.' + file.name.split('.').pop().toLowerCase();
    const isValidType = SUPPORTED_MIME_TYPES.includes(file.type) ||
                        SUPPORTED_EXTENSIONS.includes(extension);

    if (!isValidType) {
        return {
            valid: false,
            error: `Nicht unterstütztes Dateiformat. Bitte verwenden Sie TXT, PDF oder DOCX Dateien.`
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `Datei zu groß. Maximale Größe: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        };
    }

    return { valid: true };
}

/**
 * Extract text from a TXT file
 * @param {File} file - TXT file
 * @returns {Promise<string>}
 */
async function extractTextFromTxt(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Fehler beim Lesen der TXT-Datei'));
        reader.readAsText(file);
    });
}

/**
 * Extract text from a PDF file
 * @param {File} file - PDF file
 * @returns {Promise<string>}
 */
async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText.trim();
}

/**
 * Extract text from a DOCX file
 * @param {File} file - DOCX file
 * @returns {Promise<string>}
 */
async function extractTextFromDocx(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

/**
 * Process a single file and extract text
 * @param {File} file - File to process
 * @returns {Promise<{ success: boolean, text?: string, error?: string }>}
 */
export async function processFile(file) {
    const validation = validateFile(file);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    try {
        let extractedText = '';
        const extension = '.' + file.name.split('.').pop().toLowerCase();

        if (file.type === 'text/plain' || extension === '.txt') {
            extractedText = await extractTextFromTxt(file);
        } else if (file.type === 'application/pdf' || extension === '.pdf') {
            extractedText = await extractTextFromPdf(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   extension === '.docx' || extension === '.doc') {
            extractedText = await extractTextFromDocx(file);
        }

        if (!extractedText || extractedText.trim().length === 0) {
            return {
                success: false,
                error: 'Kein Text in der Datei gefunden.'
            };
        }

        return { success: true, text: extractedText };
    } catch (error) {
        console.error('Error processing file:', error);
        return {
            success: false,
            error: `Fehler beim Verarbeiten der Datei: ${error.message}`
        };
    }
}

/**
 * Get file extension from filename
 * @param {string} filename
 * @returns {string}
 */
export function getFileExtension(filename) {
    return '.' + filename.split('.').pop().toLowerCase();
}

/**
 * Get filename without extension
 * @param {string} filename
 * @returns {string}
 */
export function getFileNameWithoutExtension(filename) {
    const parts = filename.split('.');
    parts.pop();
    return parts.join('.');
}

/**
 * Check if a file is supported
 * @param {File} file
 * @returns {boolean}
 */
export function isFileSupported(file) {
    return validateFile(file).valid;
}

export default {
    validateFile,
    processFile,
    isFileSupported,
    getFileExtension,
    getFileNameWithoutExtension,
    SUPPORTED_EXTENSIONS,
    MAX_FILE_SIZE
};
