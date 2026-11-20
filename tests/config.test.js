// Die Freigaben stehen an drei Stellen: CSP (csp.js), HTTP-Header (firebase.json) und
// Torwächter-Regeln (sw-policy.js). Diese Tests verhindern, dass sie auseinanderlaufen.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { CSP } from '../csp.js';
import catalog from '../models/catalog.json';

const firebase = JSON.parse(readFileSync(new URL('../firebase.json', import.meta.url), 'utf8'));
let policy;
beforeAll(async () => {
    await import('../public/sw-policy.js');
    policy = globalThis.swPolicy;
});

describe('Content Security Policy', () => {
    it('ist im HTTP-Header dieselbe wie im <meta>-Tag', () => {
        const header = firebase.hosting.headers
            .flatMap(rule => rule.headers)
            .find(h => h.key === 'Content-Security-Policy').value;
        expect(header).toBe(`${CSP}; frame-ancestors 'self'`);
    });

    it('erlaubt Verbindungen nur zur eigenen Website und zu Hugging Face', () => {
        const connect = CSP.split('; ').find(d => d.startsWith('connect-src')).split(' ').slice(1);
        expect(connect).toEqual(["'self'", 'https://huggingface.co', 'https://*.huggingface.co', 'https://*.hf.co']);
    });
});

describe('Modellkatalog', () => {
    const files = catalog.models.flatMap(m => m.files);

    it('hat eindeutige IDs und vollständige Angaben', () => {
        const ids = catalog.models.map(m => m.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const model of catalog.models) {
            expect(model.name && model.purpose && model.license && model.source).toBeTruthy();
            expect(model.files.length).toBeGreaterThan(0);
        }
    });

    it('pinnt jede Datei mit Revision, Grösse und SHA-256', () => {
        for (const file of files) {
            expect(file.sha256).toMatch(/^[0-9a-f]{64}$/);
            expect(file.size).toBeGreaterThan(0);
            // Eine Commit-Revision statt eines Branches wie "main"
            expect(file.url).toMatch(/\/resolve\/[0-9a-f]{40}\//);
        }
    });

    it('lädt nur von Zielen, die der Torwächter freigibt', () => {
        for (const file of files) {
            const verdict = policy.decide({ url: file.url, origin: 'https://app.example', method: 'GET', mode: 'verbunden' });
            expect(verdict.allow, file.url).toBe(true);
        }
    });
});

describe('Tokenizer aus dem Modellspeicher', () => {
    it('findet Modell und Tokenizer-Dateien über ihren Dateinamen', () => {
        // src/worker/worker.js liest die Dateien über ihren Namen aus dem Modellspeicher
        const model = catalog.models.find(m => m.id === 'gliner-multi-pii');
        const names = model.files.map(f => f.name);
        expect(new Set(names).size).toBe(names.length);
        for (const name of ['tokenizer.json', 'tokenizer_config.json']) expect(names).toContain(name);
        expect(names.some(n => n.endsWith('.onnx'))).toBe(true);
    });
});
