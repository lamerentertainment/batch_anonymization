#!/usr/bin/env node
/**
 * Kopiert die Laufzeitdateien, die die App zur Laufzeit lädt, aus node_modules nach public/vendor/.
 * So kommen sie von der eigenen Website (kein CDN) und werden vom Torwächter zusammen mit der
 * App gespeichert:
 *
 * - ONNX Runtime (WebAssembly) in der Version, die gliner mitbringt
 * - pdf.js-Worker
 *
 * Die Ordnernamen tragen die Paketversion: Eine gespeicherte Datei gerät so nach einem Upgrade nie
 * an das JavaScript einer anderen Version. Läuft vor dev, build und test.
 */
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { glinerOrtDir, packageVersion, pdfjsDir } from './packages.js';

const root = join(import.meta.dirname, '..');
const vendor = join(root, 'public/vendor');

async function copy(from, toDir, names) {
    await mkdir(toDir, { recursive: true });
    for (const name of names) await copyFile(join(from, name), join(toDir, name));
}

await rm(vendor, { recursive: true, force: true });

// gliner bringt eine eigene onnxruntime-web mit (nicht die im Projekt installierte)
const ortDir = glinerOrtDir();
const ort = packageVersion(ortDir);
await copy(join(ortDir, 'dist'), join(vendor, `ort-${ort}`), [
    'ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.jsep.wasm',
]);

const pdfjs = packageVersion(pdfjsDir());
await copy(join(pdfjsDir(), 'build'), join(vendor, `pdfjs-${pdfjs}`), ['pdf.worker.min.mjs']);

console.log(`vendor: onnxruntime-web ${ort} (gliner), pdfjs-dist ${pdfjs} → public/vendor/`);
