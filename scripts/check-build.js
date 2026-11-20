#!/usr/bin/env node
/**
 * Prüft nach `vite build`, ob dist/ eine vollständige Offline-App ist. Läuft als postbuild und
 * fängt vor allem ab, was ein Update von Vite, pdf.js oder der ONNX Runtime still verändern kann:
 * Dateinamen, die Ausgabe von .wasm-Dateien oder die Platzhalter in sw.js.
 *
 * - beide Seiten (index.html, gliner-worker.html) mit der CSP als <meta>
 * - version.json mit Build-ID
 * - sw.js mit eingesetzter Build-ID und Precache-Liste, die genau alle App-Dateien enthält
 * - die Laufzeitdateien aus /vendor in den Versionen, die der Code erwartet
 * - keine zweite Kopie der ONNX-Runtime-.wasm-Dateien und kein Modell auf der Website
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { CSP } from '../csp.js';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const errors = [];
const check = (ok, message) => ok || errors.push(message);

const files = readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(dist, join(entry.parentPath, entry.name)).split(sep).join('/'));
const read = file => readFileSync(join(dist, file), 'utf8');
const version = dir => JSON.parse(readFileSync(join(root, 'node_modules', dir, 'package.json'), 'utf8')).version;

for (const page of ['index.html', 'gliner-worker.html']) {
    if (!files.includes(page)) {
        errors.push(`${page} fehlt`);
        continue;
    }
    check(read(page).includes(`<meta http-equiv="Content-Security-Policy" content="${CSP}"`), `${page}: CSP-<meta> fehlt oder weicht ab`);
}

let build = null;
try {
    build = JSON.parse(read('version.json'));
    check(typeof build.id === 'string' && build.id.length >= 12, 'version.json: Build-ID fehlt');
} catch (err) {
    errors.push(`version.json nicht lesbar: ${err.message}`);
}

const sw = read('sw.js');
const precacheMatch = sw.match(/const PRECACHE = (\[[\s\S]*?\]);/);
check(!sw.includes('/* inject:'), 'sw.js: Platzhalter nicht ersetzt');
check(build && sw.includes(JSON.stringify({ version: build.version, id: build.id })), 'sw.js: Build-ID passt nicht zu version.json');
if (precacheMatch) {
    const precache = JSON.parse(precacheMatch[1]);
    const expected = ['/', ...files
        .filter(f => !['sw.js', 'sw-policy.js', 'version.json'].includes(f) && !f.endsWith('.map'))
        .sort()
        .map(f => `/${f}`)];
    check(JSON.stringify(precache) === JSON.stringify(expected),
        `sw.js: Precache-Liste weicht von dist/ ab (fehlt: ${expected.filter(f => !precache.includes(f)).join(', ') || '–'}; `
        + `zu viel: ${precache.filter(f => !expected.includes(f)).join(', ') || '–'})`);
} else {
    errors.push('sw.js: Precache-Liste nicht gefunden');
}

const ort = version('gliner/node_modules/onnxruntime-web');
const pdfjs = version('pdfjs-dist');
for (const file of [
    `vendor/ort-${ort}/ort-wasm-simd-threaded.wasm`,
    `vendor/ort-${ort}/ort-wasm-simd-threaded.jsep.wasm`,
    `vendor/pdfjs-${pdfjs}/pdf.worker.min.mjs`,
]) check(files.includes(file), `${file} fehlt`);
check(files.every(f => !f.startsWith('vendor/') || f.startsWith(`vendor/ort-${ort}/`) || f.startsWith(`vendor/pdfjs-${pdfjs}/`)),
    'vendor/: Dateien einer anderen Paketversion');
check(!files.some(f => /^ort-wasm[\w.-]*\.wasm$/.test(f)), 'zweite Kopie der ONNX-Runtime-.wasm im Wurzelverzeichnis');
check(!files.some(f => f.startsWith('models/') || f.endsWith('.onnx')), 'Modelldateien in dist/');
check(!existsSync(join(dist, 'models')), 'dist/models existiert');

if (errors.length) {
    console.error(`check-build: ${errors.length} Problem(e)\n- ${errors.join('\n- ')}`);
    process.exit(1);
}
console.log(`check-build: ok (${files.length} Dateien, onnxruntime-web ${ort}, pdfjs-dist ${pdfjs})`);
