// Content Security Policy der App: die einzige Liste der Orte, mit denen die App sprechen darf.
//
// Der Browser setzt sie durch: Selbst wenn der Code der App einen anderen Server erreichen wollte,
// würde die Anfrage verweigert, bevor sie den Browser verlässt. Nur connect-src erlaubt etwas
// ausserhalb der eigenen Website, und nur Hugging Face, von wo das Modell geladen wird
// (feste Revision, SHA-256 geprüft, siehe models/catalog.json).
//
// Verwendet von vite.config.js (als <meta> in index.html und gliner-worker.html). firebase.json
// schickt dieselbe Policy als HTTP-Header; tests/config.test.js verhindert, dass sie auseinanderlaufen.
export const CSP = [
    "default-src 'self'",
    // 'wasm-unsafe-eval' erlaubt der ONNX Runtime, ihr WebAssembly zu übersetzen; kein JavaScript-eval
    "script-src 'self' 'wasm-unsafe-eval'",
    "worker-src 'self' blob:",
    // GLiNER läuft in einem iframe der eigenen Website (gliner-worker.html)
    "frame-src 'self'",
    'connect-src \'self\' https://huggingface.co https://*.huggingface.co https://*.hf.co',
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
].join('; ');
