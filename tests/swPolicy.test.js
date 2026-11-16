import { beforeAll, describe, expect, it } from 'vitest';

let policy;
beforeAll(async () => {
    await import('../public/sw-policy.js');
    policy = globalThis.swPolicy;
});

const ORIGIN = 'https://app.example';
const HF = 'https://huggingface.co/onnx-community/gliner_multi_pii-v1/resolve/abc/onnx/model_fp16.onnx';
const decide = (url, mode, method = 'GET') => policy.decide({ url, origin: ORIGIN, method, mode });

describe('Modus', () => {
    it('ist ohne gespeicherten Zustand lokal', () => {
        expect(policy.effectiveMode(undefined, 0).mode).toBe('lokal');
        expect(policy.effectiveMode(null, 0).mode).toBe('lokal');
    });

    it('fällt nach Ablauf der Zeit auf lokal zurück', () => {
        const state = policy.modeState('verbunden', 1000, 10);
        expect(state.until).toBe(1000 + 10 * 60000);
        expect(policy.effectiveMode(state, state.until - 1).mode).toBe('verbunden');
        expect(policy.effectiveMode(state, state.until).mode).toBe('lokal');
    });

    it('begrenzt die Verbindungsdauer', () => {
        expect(policy.modeState('verbunden', 0, 99999).until).toBe(policy.MAX_MINUTES * 60000);
        expect(policy.modeState('verbunden', 0, 0).until).toBe(policy.DEFAULT_MINUTES * 60000);
        expect(policy.modeState('verbunden', 0, 'x').until).toBe(policy.DEFAULT_MINUTES * 60000);
    });

    it('behandelt unbekannte Modi als lokal', () => {
        expect(policy.modeState('irgendwas', 0, 10)).toEqual({ mode: 'lokal', until: null });
        expect(policy.effectiveMode({ mode: 'verbunden' }, 0).mode).toBe('lokal');
    });
});

describe('Lokal-Modus', () => {
    it.each([
        `${ORIGIN}/version.json`,
        `${ORIGIN}/assets/neu.js`,
        HF,
        'https://example.com/tracker.gif',
    ])('blockiert %s', url => {
        expect(decide(url, 'lokal').allow).toBe(false);
    });
});

describe('Verbunden-Modus', () => {
    it.each([
        [`${ORIGIN}/version.json`, 'update-pruefung'],
        [`${ORIGIN}/sw.js`, 'app-update'],
        [HF, 'modell'],
        ['https://us.aws.cdn.hf.co/xet-bridge-us/abc', 'modell'],
        ['https://cdn-lfs.huggingface.co/repos/x', 'modell'],
    ])('erlaubt %s', (url, purpose) => {
        const verdict = decide(url, 'verbunden');
        expect(verdict.allow).toBe(true);
        expect(verdict.purpose).toBe(purpose);
    });

    it.each([
        'https://example.com/',
        'https://huggingface.co.evil.example/x',
        'https://evilhuggingface.co/x',
        'https://hf.co.evil.example/x',
        'http://huggingface.co/x',
    ])('blockiert fremdes Ziel %s', url => {
        expect(decide(url, 'verbunden').allow).toBe(false);
    });

    it('lässt die App keine Daten senden', () => {
        expect(decide(`${ORIGIN}/upload`, 'verbunden', 'POST').allow).toBe(false);
        expect(decide(HF, 'verbunden', 'PUT').allow).toBe(false);
        expect(decide(HF, 'verbunden', 'HEAD').allow).toBe(true);
    });
});
