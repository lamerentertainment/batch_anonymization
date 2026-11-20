// Vor- und Nachbereitung der GLiNER-Erkennung (src/gliner/gliner.js), ohne Modell. Ob das Modell
// damit dasselbe findet wie früher, prüft `npm run test:gliner`.
import { describe, expect, it } from 'vitest';
import { decodeSpans, encodeInput, Gliner, greedySearch, prepareSpans, splitWords } from '../src/gliner/gliner.js';

// Ein Tokenizer, der jedes Wort in Stücke zu höchstens 3 Zeichen zerlegt (ID = Länge des Stücks + 100)
const fakeTokenizer = {
    clsId: 1,
    sepId: 2,
    encodeWord: word => (word.match(/.{1,3}/g) ?? []).map(piece => 100 + piece.length),
};

describe('GLiNER', () => {
    it('zerlegt Text in Wörter mit Position', () => {
        expect(splitWords('Max Muster-Meier, 6003 Luzern.')).toEqual({
            words: ['Max', 'Muster-Meier', ',', '6003', 'Luzern', '.'],
            starts: [0, 4, 16, 18, 23, 29],
            ends: [3, 16, 17, 22, 29, 30],
        });
    });

    it('stellt die Labels vor den Text und markiert das erste Teil-Token jedes Textworts', () => {
        const { inputIds, wordsMask, attentionMask } = encodeInput(fakeTokenizer, ['Anna', 'Bern'], ['person']);
        // [CLS] <<ENT>>(3 Stücke) person(2) <<SEP>>(3) Anna(2) Bern(2) [SEP]
        expect(inputIds).toEqual([1, 103, 103, 101, 103, 103, 103, 103, 101, 103, 101, 103, 101, 2]);
        expect(wordsMask).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0]);
        expect(attentionMask).toHaveLength(inputIds.length);
    });

    it('bildet alle Spannen bis maxWidth und kürzt sie am Textende', () => {
        expect(prepareSpans(3, 2).spanIdx).toEqual([[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 2]]);
    });

    it('wählt die wahrscheinlichsten Spannen ohne Überschneidung', () => {
        const spans = [
            ['Max Muster', 0, 10, 'person', 0.9],
            ['Max', 0, 3, 'person', 0.7],
            ['Muster AG', 4, 13, 'organization', 0.8],
            ['Bern', 20, 24, 'location', 0.6],
        ];
        expect(greedySearch(spans).map(s => s[0])).toEqual(['Max Muster', 'Bern']);
    });

    it('liest die Modellausgabe [Wörter × Breite × Labels] und verwirft Spannen über das Textende', () => {
        const text = 'Anna wohnt in Bern';
        const { starts, ends } = splitWords(text);
        const labels = ['person', 'location'];
        const maxWidth = 2;
        const logits = new Float32Array(starts.length * maxWidth * labels.length).fill(-10);
        const at = (word, width, label) => (word * maxWidth + width) * labels.length + label;
        logits[at(0, 0, 0)] = 5; // «Anna» person
        logits[at(3, 0, 1)] = 3; // «Bern» location
        logits[at(3, 1, 1)] = 9; // über das Textende hinaus: verworfen
        const result = decodeSpans({ logits, text, starts, ends, labels, maxWidth, threshold: 0.5 });
        expect(result.map(([t, s, e, l]) => [t, s, e, l])).toEqual([['Anna', 0, 4, 'person'], ['Bern', 14, 18, 'location']]);
    });

    it('übergibt dem Modell die erwarteten Eingaben', async () => {
        const feeds = [];
        class Tensor {
            constructor(type, data, dims) { Object.assign(this, { type, data, dims }); }
        }
        const session = {
            async run(input) {
                feeds.push(input);
                return { logits: { data: new Float32Array(2 * 12 * 1).fill(-10) } };
            },
        };
        const gliner = new Gliner({ session, Tensor, tokenizer: fakeTokenizer });
        expect(await gliner.inference({ text: 'Anna Bern', labels: ['person'] })).toEqual([]);
        const f = feeds[0];
        expect(Object.keys(f).sort()).toEqual(['attention_mask', 'input_ids', 'span_idx', 'span_mask', 'text_lengths', 'words_mask']);
        expect(f.input_ids.type).toBe('int64');
        expect(f.text_lengths.data).toEqual(BigInt64Array.from([2n]));
        expect(f.span_idx.dims).toEqual([1, 24, 2]);
        expect(f.span_mask.type).toBe('bool');
        expect(await gliner.inference({ text: '   ', labels: ['person'] })).toEqual([]);
    });
});
