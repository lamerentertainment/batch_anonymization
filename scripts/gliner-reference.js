#!/usr/bin/env node
/**
 * Referenz-Ergebnis der Entitätserkennung: Feste Texte laufen durch GLiNER, das Ergebnis liegt in
 * tests/fixtures/gliner-reference.json. Wer die Erkennung anfasst (gliner, ONNX Runtime,
 * Tokenizer), prüft damit, dass sie noch dasselbe findet.
 *
 *   node scripts/gliner-reference.js            vergleicht mit der Referenz
 *   node scripts/gliner-reference.js --write    schreibt die Referenz neu
 *
 * Läuft unter Node mit onnxruntime-node (Prozessor), also nicht im Browser-Backend der App. Die
 * Vorverarbeitung (Tokenizer, Spannen) und die Auswertung sind dieselben wie in der App.
 *
 * Das Modell (model_fp16.onnx, tokenizer.json, tokenizer_config.json) wird in GLINER_MODEL_DIR
 * erwartet, sonst in .legacy-models/gliner_multi_pii-v1 (mit onnx/model_fp16.onnx). Die Dateien
 * werden vorher gegen die Prüfsummen in models/catalog.json geprüft.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { Gliner } from 'gliner/node';
import { env } from '@xenova/transformers';
import { DEFAULT_SELECTED_LABELS } from '../src/utils/anonymizer.js';

const root = join(import.meta.dirname, '..');
const referencePath = join(root, 'tests/fixtures/gliner-reference.json');
const catalog = JSON.parse(readFileSync(join(root, 'models/catalog.json'), 'utf8'));
const MODEL = catalog.models.find(m => m.id === 'gliner-multi-pii');
const THRESHOLD = 0.3; // Voreinstellung der App (BatchAnonymizer.vue)
const SCORE_TOLERANCE = 0.02;

const TEXTS = [
    'Max Muster, geboren am 3. Mai 1980, wohnt an der Pilatusstrasse 1, 6003 Luzern.',
    'Die Beschuldigte Anna Beispiel arbeitet bei der Credit Suisse AG in Zürich. Sie ist unter 041 123 45 67 oder anna.beispiel@example.ch erreichbar.',
    'Der Betrag wurde auf das Konto CH93 0076 2011 6238 5295 7 der Raiffeisenbank Bern überwiesen.',
    'Le prévenu Jean Dupont, domicilié à la Rue du Lac 12, 1003 Lausanne, a été entendu par la police cantonale vaudoise.',
    'Gemäss Gutachten von Dr. med. Peter Keller vom Kantonsspital Aarau leidet der Kläger an einer Depression.',
];

function findModelDir() {
    const candidates = [process.env.GLINER_MODEL_DIR, join(root, '.legacy-models/gliner_multi_pii-v1')].filter(Boolean);
    const dir = candidates.find(d => existsSync(join(d, 'tokenizer.json')));
    if (!dir) throw new Error(`Modell nicht gefunden (gesucht in: ${candidates.join(', ')}). GLINER_MODEL_DIR setzen.`);
    const model = ['model_fp16.onnx', 'onnx/model_fp16.onnx'].map(f => join(dir, f)).find(existsSync);
    if (!model) throw new Error(`model_fp16.onnx fehlt in ${dir}`);
    const paths = { 'model_fp16.onnx': model, 'tokenizer.json': join(dir, 'tokenizer.json'), 'tokenizer_config.json': join(dir, 'tokenizer_config.json') };
    for (const file of MODEL.files) {
        const hash = createHash('sha256').update(readFileSync(paths[file.name])).digest('hex');
        if (hash !== file.sha256) throw new Error(`${paths[file.name]}: Prüfsumme passt nicht zu models/catalog.json`);
    }
    return { dir, model };
}

async function run() {
    const { dir, model } = findModelDir();
    const gliner = new Gliner({
        tokenizerPath: basename(dir),
        onnxSettings: { modelPath: model, executionProvider: 'cpu' },
        transformersSettings: { allowLocalModels: true, useBrowserCache: false },
        maxWidth: 12, // wie src/worker/worker.js
    });
    env.localModelPath = dirname(dir) + '/';
    env.allowRemoteModels = false;
    await gliner.initialize();

    const results = [];
    for (const text of TEXTS) {
        const [entities] = await gliner.inference({ texts: [text], entities: DEFAULT_SELECTED_LABELS, threshold: THRESHOLD });
        results.push({
            text,
            entities: entities.map(e => ({ text: e.spanText, label: e.label, start: e.start, end: e.end, score: Number(e.score.toFixed(4)) })),
        });
    }
    return { labels: DEFAULT_SELECTED_LABELS, threshold: THRESHOLD, results };
}

function compare(reference, actual) {
    const problems = [];
    if (JSON.stringify(reference.labels) !== JSON.stringify(actual.labels) || reference.threshold !== actual.threshold) {
        problems.push('Labels oder Schwelle haben sich geändert: Referenz mit --write neu schreiben');
    }
    reference.results.forEach((ref, i) => {
        const act = actual.results[i];
        if (!act || act.text !== ref.text) return problems.push(`Text ${i + 1}: Testtexte haben sich geändert`);
        const key = e => `${e.label}|${e.start}|${e.end}|${e.text}`;
        const actByKey = new Map(act.entities.map(e => [key(e), e]));
        for (const e of ref.entities) {
            const a = actByKey.get(key(e));
            if (!a) problems.push(`Text ${i + 1}: «${e.text}» (${e.label}) wird nicht mehr gefunden`);
            else if (Math.abs(a.score - e.score) > SCORE_TOLERANCE) problems.push(`Text ${i + 1}: «${e.text}» (${e.label}) Wert ${e.score} → ${a.score}`);
            actByKey.delete(key(e));
        }
        for (const a of actByKey.values()) problems.push(`Text ${i + 1}: neu gefunden «${a.text}» (${a.label}, ${a.score})`);
    });
    return problems;
}

const actual = await run();
if (process.argv.includes('--write')) {
    writeFileSync(referencePath, JSON.stringify(actual, null, 2) + '\n');
    console.log(`gliner-reference: geschrieben (${actual.results.reduce((n, r) => n + r.entities.length, 0)} Entitäten)`);
} else {
    const problems = compare(JSON.parse(readFileSync(referencePath, 'utf8')), actual);
    if (problems.length) {
        console.error(`gliner-reference: ${problems.length} Abweichung(en)\n- ${problems.join('\n- ')}`);
        process.exit(1);
    }
    console.log('gliner-reference: ok, Erkennung unverändert');
}
