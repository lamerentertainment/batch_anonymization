#!/usr/bin/env node
/**
 * Legt das GLiNER-Modell im Modellkatalog (models/catalog.json) fest: feste Revision auf
 * Hugging Face, Grösse und SHA-256 jeder Datei. Die App lädt nur, was hier steht, und verwirft
 * jede Datei, deren Prüfsumme nicht stimmt.
 *
 *   node scripts/models/pin-gliner.mjs              # aktuelle Revision von «main»
 *   node scripts/models/pin-gliner.mjs <revision>   # bestimmte Revision
 *
 * Grosse Dateien (Git LFS) bringen ihre SHA-256 in der Hugging-Face-API mit; kleine Dateien
 * werden heruntergeladen und hier berechnet.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const REPO = 'onnx-community/gliner_multi_pii-v1';
const FILES = [
    { name: 'model_fp16.onnx', path: 'onnx/model_fp16.onnx', role: 'Modellgewichte (fp16)' },
    { name: 'tokenizer.json', path: 'tokenizer.json', role: 'Tokenizer' },
    { name: 'tokenizer_config.json', path: 'tokenizer_config.json', role: 'Tokenizer-Einstellungen' },
];

const root = join(import.meta.dirname, '../..');
const catalogPath = join(root, 'models/catalog.json');
const wanted = process.argv[2] || 'main';

async function json(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
}

const info = await json(`https://huggingface.co/api/models/${REPO}/revision/${wanted}?blobs=true`);
const revision = info.sha;
const files = [];
for (const file of FILES) {
    const sibling = info.siblings.find(s => s.rfilename === file.path);
    if (!sibling) throw new Error(`${file.path} fehlt in ${REPO}@${revision}`);
    const url = `https://huggingface.co/${REPO}/resolve/${revision}/${file.path}`;
    let { sha256 } = sibling.lfs ?? {};
    if (!sha256) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        sha256 = createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    }
    files.push({ name: file.name, role: file.role, url, sha256, size: sibling.size });
}

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const model = catalog.models.find(m => m.id === 'gliner-multi-pii');
model.revision = revision;
model.files = files;
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(`${REPO}@${revision}: ${files.length} Dateien festgelegt → models/catalog.json`);
