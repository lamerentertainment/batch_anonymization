/**
 * File Processor Utility
 * Handles text extraction from various file formats (TXT, PDF, DOCX)
 */

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import TurndownService from 'turndown';

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

// Supported file types
export const SUPPORTED_EXTENSIONS = ['.txt', '.pdf', '.docx', '.doc', '.md'];
export const SUPPORTED_MIME_TYPES = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/markdown',
    'text/x-markdown'
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
            error: `Nicht unterstütztes Dateiformat. Bitte verwenden Sie TXT, PDF, DOCX oder MD Dateien.`
        };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `Datei zu gross. Maximale Grösse: ${MAX_FILE_SIZE / 1024 / 1024}MB`
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
    const arrayBuffer = await file.arrayBuffer();
    try {
        // Try UTF-8 first with fatal: true to catch encoding errors (like Latin-1 umlauts)
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        return utf8Decoder.decode(arrayBuffer);
    } catch (e) {
        console.log('UTF-8 decoding failed, falling back to ISO-8859-1 (Latin-1)');
        // Fallback to Latin-1 which handles most Western European characters
        const latin1Decoder = new TextDecoder('iso-8859-1');
        return latin1Decoder.decode(arrayBuffer);
    }
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
async function extractTextFromDocx(file, options = {}) {
    const arrayBuffer = await file.arrayBuffer();

    if (options.convertWordToMarkdown) {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const htmlContent = result.value;
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });
        return {
            text: turndownService.turndown(htmlContent),
            html: htmlContent
        };
    }

    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value };
}

/**
 * Process a single file and extract text
 * @param {File} file - File to process
 * @returns {Promise<{ success: boolean, text?: string, error?: string }>}
 */
export async function processFile(file, options = {}) {
    const validation = validateFile(file);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    try {
        let extractedText = '';
        let extractedHtml = undefined;
        const extension = '.' + file.name.split('.').pop().toLowerCase();

        if (file.type === 'text/plain' || extension === '.txt' || file.type === 'text/markdown' || file.type === 'text/x-markdown' || extension === '.md') {
            extractedText = await extractTextFromTxt(file);
        } else if (file.type === 'application/pdf' || extension === '.pdf') {
            extractedText = await extractTextFromPdf(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            extension === '.docx' || extension === '.doc') {
            const docxResult = await extractTextFromDocx(file, options);
            extractedText = docxResult.text;
            extractedHtml = docxResult.html;
        }

        if (!extractedText || extractedText.trim().length === 0) {
            return {
                success: false,
                error: 'Kein Text in der Datei gefunden.'
            };
        }

        return { success: true, text: extractedText, html: extractedHtml };
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
