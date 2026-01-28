/**
 * Iframe Anonymizer Utility
 * Manages ephemeral iframes for GLiNER execution to ensure memory cleanup.
 */

class IframeAnonymizer {
    constructor() {
        this.workerUrl = '/gliner-worker.html';
        this.timeout = 120000; // 2 minutes timeout
    }

    /**
     * Detect entities in text using a fresh iframe
     * @param {string} text - Text to analyze
     * @param {string[]} labels - Entity labels to detect
     * @param {number} threshold - Detection threshold
     * @returns {Promise<Array>} - Detected entities
     */
    async detectEntities(text, labels, threshold) {
        console.log('[IframeAnonymizer] Starting detection...');
        return new Promise((resolve, reject) => {
            // Create hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = this.workerUrl;

            // Log for debugging
            console.log(`[IframeAnonymizer] Creating iframe pointing to ${this.workerUrl}`);

            document.body.appendChild(iframe);

            const cleanup = () => {
                console.log('[IframeAnonymizer] Cleaning up iframe');
                window.removeEventListener('message', handleMessage);
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            };

            const handleMessage = (event) => {
                // Ensure message comes from our iframe
                if (event.source !== iframe.contentWindow) return;

                console.log('[IframeAnonymizer] Received message:', event.data.type);

                const { type, payload, error } = event.data;

                if (type === 'HTML_LOADED') {
                    console.log('[IframeAnonymizer] Iframe HTML loaded');
                } else if (type === 'READY') {
                    console.log('[IframeAnonymizer] Worker READY. Sending text...');
                    // Worker is ready, send detection request
                    // We must sanitize the payload to remove Vue Proxies, otherwise postMessage fails with DataCloneError
                    const cleanPayload = JSON.parse(JSON.stringify({ text, labels, threshold }));

                    iframe.contentWindow.postMessage({
                        type: 'DETECT',
                        id: Date.now(),
                        payload: cleanPayload
                    }, '*');
                } else if (type === 'RESULT') {
                    console.log('[IframeAnonymizer] Got RESULT');
                    cleanup();
                    resolve(payload);
                } else if (type === 'ERROR') {
                    console.error('[IframeAnonymizer] Got ERROR:', error);
                    cleanup();
                    reject(new Error(error));
                }
            };

            window.addEventListener('message', handleMessage);

            // Timeout safety
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    console.error('[IframeAnonymizer] Operation TIMED OUT');
                    cleanup();
                    reject(new Error('Operation timed out - check console for details'));
                }
            }, this.timeout);

            // Handle iframe load error
            iframe.onerror = (e) => {
                console.error('[IframeAnonymizer] Iframe onerror event', e);
                cleanup();
                reject(new Error('Failed to load worker iframe'));
            };
        });
    }
}

const iframeAnonymizer = new IframeAnonymizer();
export default iframeAnonymizer;
