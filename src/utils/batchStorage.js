/**
 * Batch Storage Utility
 * Handles IndexedDB persistence for batch anonymization with page reload cycles.
 *
 * This is necessary because ONNX Runtime Web has memory leaks that cannot be
 * cleared without a full page reload. By persisting state to IndexedDB, we can
 * reload the page between files while maintaining progress.
 */

const DB_NAME = 'BatchAnonymizationState';
const DB_VERSION = 1;
const STORES = {
    FILES: 'pendingFiles',      // Files waiting to be processed
    RESULTS: 'completedResults', // Processed results
    STATE: 'batchState'          // Current batch state (settings, progress)
};

class BatchStorage {
    constructor() {
        this.db = null;
    }

    /**
     * Open/create the IndexedDB database
     */
    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store for pending files (to be processed)
                if (!db.objectStoreNames.contains(STORES.FILES)) {
                    db.createObjectStore(STORES.FILES, { keyPath: 'id', autoIncrement: true });
                }

                // Store for completed results
                if (!db.objectStoreNames.contains(STORES.RESULTS)) {
                    db.createObjectStore(STORES.RESULTS, { keyPath: 'id', autoIncrement: true });
                }

                // Store for batch state
                if (!db.objectStoreNames.contains(STORES.STATE)) {
                    db.createObjectStore(STORES.STATE, { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Start a new batch - store all files and settings
     * @param {File[]} files - Array of File objects
     * @param {Object} settings - Anonymization settings
     */
    async startBatch(files, settings) {
        await this.open();

        // Clear any previous batch data
        await this.clearAll();

        const tx = this.db.transaction([STORES.FILES, STORES.STATE], 'readwrite');
        const filesStore = tx.objectStore(STORES.FILES);
        const stateStore = tx.objectStore(STORES.STATE);

        // Store each file as ArrayBuffer with metadata
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const arrayBuffer = await file.arrayBuffer();

            await new Promise((resolve, reject) => {
                const request = filesStore.add({
                    index: i,
                    name: file.name,
                    relativePath: file.relativePath || file.name,
                    type: file.type,
                    size: file.size,
                    data: arrayBuffer,
                    processed: false
                });
                request.onsuccess = resolve;
                request.onerror = () => reject(request.error);
            });
        }

        // Store batch state
        await new Promise((resolve, reject) => {
            const request = stateStore.put({
                key: 'batchState',
                isRunning: true,
                totalFiles: files.length,
                currentIndex: 0,
                settings: settings,
                startedAt: Date.now()
            });
            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Check if there's a batch in progress
     * @returns {Promise<Object|null>} Batch state or null
     */
    async getBatchState() {
        await this.open();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORES.STATE, 'readonly');
            const store = tx.objectStore(STORES.STATE);
            const request = store.get('batchState');

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get the next file to process
     * @returns {Promise<Object|null>} File data or null if done
     */
    async getNextFile() {
        await this.open();
        const state = await this.getBatchState();

        if (!state || !state.isRunning) return null;

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORES.FILES, 'readonly');
            const store = tx.objectStore(STORES.FILES);
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const file = cursor.value;
                    if (!file.processed && file.index === state.currentIndex) {
                        resolve(file);
                        return;
                    }
                    cursor.continue();
                } else {
                    resolve(null); // No more files
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Mark current file as processed and store result
     * @param {number} fileId - The file's IndexedDB id
     * @param {Object} result - Processing result
     */
    async markFileProcessed(fileId, result) {
        await this.open();

        const tx = this.db.transaction([STORES.FILES, STORES.RESULTS, STORES.STATE], 'readwrite');
        const filesStore = tx.objectStore(STORES.FILES);
        const resultsStore = tx.objectStore(STORES.RESULTS);
        const stateStore = tx.objectStore(STORES.STATE);

        // Mark file as processed
        const fileRequest = filesStore.get(fileId);
        await new Promise((resolve, reject) => {
            fileRequest.onsuccess = async () => {
                const file = fileRequest.result;
                file.processed = true;
                const updateRequest = filesStore.put(file);
                updateRequest.onsuccess = resolve;
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            fileRequest.onerror = () => reject(fileRequest.error);
        });

        // Store result
        await new Promise((resolve, reject) => {
            const request = resultsStore.add({
                fileId: fileId,
                fileName: result.fileName,
                outputName: result.outputName,
                content: result.content,
                entitiesFound: result.entitiesFound,
                status: result.status,
                error: result.error || null,
                processedAt: Date.now()
            });
            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });

        // Update state - increment currentIndex
        const stateRequest = stateStore.get('batchState');
        await new Promise((resolve, reject) => {
            stateRequest.onsuccess = () => {
                const state = stateRequest.result;
                state.currentIndex++;
                const updateRequest = stateStore.put(state);
                updateRequest.onsuccess = resolve;
                updateRequest.onerror = () => reject(updateRequest.error);
            };
            stateRequest.onerror = () => reject(stateRequest.error);
        });

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Get all completed results
     * @returns {Promise<Array>} Array of results
     */
    async getResults() {
        await this.open();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORES.RESULTS, 'readonly');
            const store = tx.objectStore(STORES.RESULTS);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending files (for UI display)
     * @returns {Promise<Array>} Array of file metadata (without data)
     */
    async getPendingFiles() {
        await this.open();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORES.FILES, 'readonly');
            const store = tx.objectStore(STORES.FILES);
            const request = store.getAll();

            request.onsuccess = () => {
                // Return metadata without the large ArrayBuffer data
                const files = (request.result || []).map(f => ({
                    id: f.id,
                    index: f.index,
                    name: f.name,
                    relativePath: f.relativePath,
                    type: f.type,
                    size: f.size,
                    processed: f.processed
                }));
                resolve(files);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Mark batch as complete
     */
    async completeBatch() {
        await this.open();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORES.STATE, 'readwrite');
            const store = tx.objectStore(STORES.STATE);
            const request = store.get('batchState');

            request.onsuccess = () => {
                const state = request.result;
                if (state) {
                    state.isRunning = false;
                    state.completedAt = Date.now();
                    const updateRequest = store.put(state);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all batch data
     */
    async clearAll() {
        await this.open();

        const tx = this.db.transaction([STORES.FILES, STORES.RESULTS, STORES.STATE], 'readwrite');

        await Promise.all([
            new Promise((resolve, reject) => {
                const request = tx.objectStore(STORES.FILES).clear();
                request.onsuccess = resolve;
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const request = tx.objectStore(STORES.RESULTS).clear();
                request.onsuccess = resolve;
                request.onerror = () => reject(request.error);
            }),
            new Promise((resolve, reject) => {
                const request = tx.objectStore(STORES.STATE).clear();
                request.onsuccess = resolve;
                request.onerror = () => reject(request.error);
            })
        ]);

        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Cancel an in-progress batch
     */
    async cancelBatch() {
        await this.clearAll();
    }
}

// Singleton instance
const batchStorage = new BatchStorage();

export default batchStorage;
