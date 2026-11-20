// Wo die Laufzeitpakete liegen, die scripts/copy-vendor.js nach /vendor kopiert.
// Gemeinsam genutzt von copy-vendor.js, check-build.js und vite.config.js.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const modules = join(import.meta.dirname, '..', 'node_modules');

export const ortDir = () => join(modules, 'onnxruntime-web');
export const pdfjsDir = () => join(modules, 'pdfjs-dist');

// Die WebAssembly-Datei, die src/worker/worker.js lädt (WASM- und WebGPU-Backend)
export const ORT_WASM_FILE = 'ort-wasm-simd-threaded.jsep.wasm';

export const packageVersion = dir => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
