// Läuft vor worker.js: meldet Fehler beim Laden an die App und bestätigt, dass die Seite geladen ist.
// (Eigene Datei statt Inline-Skript, weil die Content Security Policy Inline-Skripte verbietet.)
window.onerror = function (message, source, lineno, colno, error) {
    console.error('[GLiNER iframe error]', message, error);
    const errMsg = error ? error.message : message;
    try {
        window.parent.postMessage({ type: 'ERROR', error: `Iframe Error: ${errMsg}` }, '*');
    } catch (e) {
        console.error('Failed to report error to parent', e);
    }
    document.getElementById('status').textContent = 'Error: ' + errMsg;
};

window.parent.postMessage({ type: 'HTML_LOADED' }, '*');
