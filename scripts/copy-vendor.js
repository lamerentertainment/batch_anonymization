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
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const modules = join(root, 'node_modules');
const vendor = join(root, 'public/vendor');

const version = async dir => JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')).version;

async function copy(from, toDir, names) {
    await mkdir(toDir, { recursive: true });
    for (const name of names) await copyFile(join(from, name), join(toDir, name));
}

await rm(vendor, { recursive: true, force: true });

// gliner bringt eine eigene onnxruntime-web mit (nicht die im Projekt installierte)
const ortDir = join(modules, 'gliner/node_modules/onnxruntime-web');
const ort = await version(ortDir);
await copy(join(ortDir, 'dist'), join(vendor, `ort-${ort}`), [
    'ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.jsep.wasm',
]);

const pdfjsDir = join(modules, 'pdfjs-dist');
const pdfjs = await version(pdfjsDir);
await copy(join(pdfjsDir, 'build'), join(vendor, `pdfjs-${pdfjs}`), ['pdf.worker.min.mjs']);

console.log(`vendor: onnxruntime-web ${ort} (gliner), pdfjs-dist ${pdfjs} → public/vendor/`);
