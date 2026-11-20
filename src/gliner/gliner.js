/**
 * GLiNER-Entitätserkennung (span-level), ohne Bindung an eine bestimmte Laufzeit.
 *
 * Übernommen aus GLiNER.js 0.0.19 (https://github.com/Ingvarstep/GLiNER.js, MIT-Lizenz,
 * Copyright (c) Ingvarstep), auf das beschränkt, was diese App braucht: span-level-Modelle,
 * eine Anfrage pro Text, flache Entitäten ohne Mehrfach-Labels. Die Rechenschritte sind
 * unverändert; tests/fixtures/gliner-reference.json hält fest, dass das Ergebnis gleich bleibt.
 *
 * Die ONNX-Sitzung (`session`, `Tensor`) und der Tokenizer werden von aussen gegeben: im Browser
 * onnxruntime-web (src/worker/worker.js), unter Node für die Referenzprüfung dieselbe
 * onnxruntime-web (scripts/gliner-reference.js).
 */

// Wörter wie in GLiNER (words_splitter_type "whitespace"): Wortfolgen mit - und _, sonst jedes
// einzelne Zeichen ausser Leerraum
const WORD_PATTERN = /\w+(?:[-_]\w+)*|\S/g;

export const ENT_TOKEN = '<<ENT>>';
export const SEP_TOKEN = '<<SEP>>';

/** @returns {{ words: string[], starts: number[], ends: number[] }} */
export function splitWords(text) {
    const words = [];
    const starts = [];
    const ends = [];
    for (const match of text.matchAll(WORD_PATTERN)) {
        words.push(match[0]);
        starts.push(match.index);
        ends.push(match.index + match[0].length);
    }
    return { words, starts, ends };
}

/**
 * Baut die Modelleingabe für einen Text: zuerst die Labels («<<ENT>> person <<ENT>> location …
 * <<SEP>>»), dann die Wörter des Texts, jedes Wort in Teil-Token zerlegt. words_mask markiert das
 * erste Teil-Token jedes Textworts mit dessen Nummer (ab 1).
 *
 * @param {{ encodeWord(word: string): number[], clsId: number, sepId: number }} tokenizer
 */
export function encodeInput(tokenizer, words, labels) {
    const prompt = labels.flatMap(label => [ENT_TOKEN, label]);
    prompt.push(SEP_TOKEN);

    const inputIds = [tokenizer.clsId];
    const wordsMask = [0];
    let wordNumber = 1;
    [...prompt, ...words].forEach((word, wordIndex) => {
        tokenizer.encodeWord(word).forEach((id, tokenIndex) => {
            inputIds.push(id);
            if (wordIndex < prompt.length || tokenIndex > 0) {
                wordsMask.push(0);
            } else {
                wordsMask.push(wordNumber++);
            }
        });
    });
    inputIds.push(tokenizer.sepId);
    wordsMask.push(0);
    return { inputIds, wordsMask, attentionMask: inputIds.map(() => 1) };
}

/**
 * Alle Wortspannen bis maxWidth Wörter. Spannen über das Textende hinaus werden auf das letzte
 * Wort gekürzt (wie GLiNER.js); der Decoder verwirft sie wieder.
 */
export function prepareSpans(wordCount, maxWidth) {
    const spanIdx = [];
    for (let i = 0; i < wordCount; i++) {
        for (let j = 0; j < maxWidth; j++) spanIdx.push([i, Math.min(i + j, wordCount - 1)]);
    }
    return { spanIdx, spanMask: spanIdx.map(() => true) };
}

const sigmoid = x => 1 / (1 + Math.exp(-x));

const overlaps = (a, b) => !(a[0] > b[1] || b[0] > a[1]);

/**
 * Wählt aus allen Spannen über der Schwelle die wahrscheinlichsten, die sich nicht überschneiden
 * (flache Entitäten, ein Label pro Spanne), sortiert nach Position.
 * @param {Array<[string, number, number, string, number]>} spans [Text, Start, Ende, Label, Wert]
 */
export function greedySearch(spans) {
    const selected = [];
    const byScore = spans.slice().sort((a, b) => b[4] - a[4]);
    for (const span of byScore) {
        const range = [span[1], span[2]];
        if (!selected.some(s => overlaps(range, [s[1], s[2]]))) selected.push(span);
    }
    return selected.sort((a, b) => a[1] - b[1]);
}

/**
 * Liest die Ausgabe des Modells (logits der Form [1, Wörter, maxWidth, Labels]) und liefert die
 * gefundenen Entitäten.
 */
export function decodeSpans({ logits, text, starts, ends, labels, maxWidth, threshold }) {
    const wordCount = starts.length;
    const numLabels = labels.length;
    const spans = [];
    for (let id = 0; id < logits.length; id++) {
        const prob = sigmoid(logits[id]);
        if (prob < threshold) continue;
        const startWord = Math.floor(id / (maxWidth * numLabels)) % wordCount;
        const endWord = startWord + (Math.floor(id / numLabels) % maxWidth);
        if (endWord >= wordCount) continue;
        const start = starts[startWord];
        const end = ends[endWord];
        spans.push([text.slice(start, end), start, end, labels[id % numLabels], prob]);
    }
    return greedySearch(spans);
}

export class Gliner {
    /**
     * @param {object} options
     * @param {{ run(feeds: object): Promise<object> }} options.session ONNX-Sitzung des Modells
     * @param {Function} options.Tensor Tensor-Klasse derselben ONNX Runtime
     * @param {{ encodeWord(word: string): number[], clsId: number, sepId: number }} options.tokenizer
     * @param {number} [options.maxWidth] längste Entität in Wörtern (max_width aus gliner_config.json)
     */
    constructor({ session, Tensor, tokenizer, maxWidth = 12 }) {
        this.session = session;
        this.Tensor = Tensor;
        this.tokenizer = tokenizer;
        this.maxWidth = maxWidth;
    }

    /**
     * @returns {Promise<Array<{ spanText: string, start: number, end: number, label: string, score: number }>>}
     */
    async inference({ text, labels, threshold = 0.5 }) {
        const { words, starts, ends } = splitWords(text);
        if (words.length === 0 || labels.length === 0) return [];

        const { inputIds, wordsMask, attentionMask } = encodeInput(this.tokenizer, words, labels);
        const { spanIdx, spanMask } = prepareSpans(words.length, this.maxWidth);
        const int64 = (data, dims) => new this.Tensor('int64', BigInt64Array.from(data.flat(), BigInt), dims);
        const feeds = {
            input_ids: int64(inputIds, [1, inputIds.length]),
            attention_mask: int64(attentionMask, [1, inputIds.length]),
            words_mask: int64(wordsMask, [1, inputIds.length]),
            text_lengths: int64([words.length], [1, 1]),
            span_idx: int64(spanIdx, [1, spanIdx.length, 2]),
            span_mask: new this.Tensor('bool', Uint8Array.from(spanMask, Number), [1, spanMask.length]),
        };
        const output = await this.session.run(feeds);
        const spans = decodeSpans({
            logits: output.logits.data, text, starts, ends, labels, maxWidth: this.maxWidth, threshold,
        });
        return spans.map(([spanText, start, end, label, score]) => ({ spanText, start, end, label, score }));
    }

    async release() {
        await this.session?.release?.();
        this.session = null;
    }
}
