// Wo die Laufzeitpakete liegen, die scripts/copy-vendor.js nach /vendor kopiert.
// Gemeinsam genutzt von copy-vendor.js, check-build.js und vite.config.js.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const modules = join(import.meta.dirname, '..', 'node_modules');

/**
 * Die onnxruntime-web, die gliner tatsächlich lädt: Node sucht zuerst in gliner/node_modules,
 * dann im Projekt. Wo npm sie ablegt, hängt davon ab, welche anderen Versionen installiert sind.
 */
export function glinerOrtDir() {
    const nested = join(modules, 'gliner/node_modules/onnxruntime-web');
    return existsSync(nested) ? nested : join(modules, 'onnxruntime-web');
}

export const pdfjsDir = () => join(modules, 'pdfjs-dist');

export const packageVersion = dir => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
