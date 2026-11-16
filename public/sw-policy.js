/*
 * Regeln des Torwächters (Service Worker): wann die App ins Internet darf.
 *
 * Diese Datei enthält die ganze Entscheidungslogik, ohne Browser-Abhängigkeiten, damit sie
 * gelesen und getestet werden kann (tests/swPolicy.test.js). sw.js lädt sie mit importScripts.
 *
 * Grundsatz:
 * - Modus «lokal» (Standard, und nach jedem Neustart): keine einzige Netzwerkanfrage.
 * - Modus «verbunden» (nur auf Knopfdruck, endet automatisch): nur Abrufe (GET/HEAD), nur zur
 *   eigenen Website (App-Update) und zu Hugging Face (Modelle). Die App sendet nie Daten.
 * Dateien, die bereits im Browser gespeichert sind, werden in beiden Modi ohne Netz geliefert.
 */
(function (root) {
    'use strict';

    const MODES = Object.freeze({ LOKAL: 'lokal', VERBUNDEN: 'verbunden' });
    const DEFAULT_MINUTES = 30;
    const MAX_MINUTES = 120;

    // Fremde Ziele, die im Modus «verbunden» erreichbar sind. Muss zu connect-src in csp.js passen.
    const REMOTE_ALLOWLIST = Object.freeze([
        { pattern: /^https:\/\/(?:[a-z0-9-]+\.)*huggingface\.co\//i, label: 'Modell-Download (Hugging Face)' },
        { pattern: /^https:\/\/(?:[a-z0-9-]+\.)*hf\.co\//i, label: 'Modell-Download (Hugging Face CDN)' },
    ]);

    /** Gespeicherter Zustand für einen gewünschten Modus. */
    function modeState(mode, now, minutes) {
        if (mode !== MODES.VERBUNDEN) return { mode: MODES.LOKAL, until: null };
        const m = Math.min(Math.max(Math.round(Number(minutes)) || DEFAULT_MINUTES, 1), MAX_MINUTES);
        return { mode: MODES.VERBUNDEN, until: now + m * 60000 };
    }

    /** Tatsächlich geltender Modus: alles, was nicht gültig «verbunden» ist, ist «lokal». */
    function effectiveMode(state, now) {
        if (state && state.mode === MODES.VERBUNDEN && typeof state.until === 'number' && state.until > now) {
            return { mode: MODES.VERBUNDEN, until: state.until };
        }
        return { mode: MODES.LOKAL, until: null };
    }

    /** Wozu eine Anfrage dient, für das Verbindungsprotokoll. */
    function classify(url, origin) {
        const u = new URL(url);
        if (u.origin === origin) {
            if (u.pathname === '/version.json') return { purpose: 'update-pruefung', label: 'Prüfung auf neue App-Version' };
            if (u.pathname === '/sw.js' || u.pathname === '/sw-policy.js') {
                return { purpose: 'app-update', label: 'Laden der neuen App-Version' };
            }
            return { purpose: 'app-datei', label: 'App-Datei' };
        }
        const hit = REMOTE_ALLOWLIST.find(entry => entry.pattern.test(url));
        if (hit) return { purpose: 'modell', label: hit.label };
        return { purpose: 'fremd', label: 'Nicht freigegebenes Ziel' };
    }

    /**
     * Entscheid für eine Anfrage, die nicht aus dem Browser-Speicher beantwortet werden kann.
     * @returns {{allow: boolean, purpose: string, label: string, reason: string}}
     */
    function decide({ url, origin, method, mode }) {
        const c = classify(url, origin);
        if (mode !== MODES.VERBUNDEN) {
            return { allow: false, ...c, reason: 'Lokal-Modus: keine Internetverbindung' };
        }
        if (method !== 'GET' && method !== 'HEAD') {
            return { allow: false, ...c, reason: 'Die App sendet keine Daten – nur Abrufe sind erlaubt' };
        }
        if (c.purpose === 'fremd') {
            return { allow: false, ...c, reason: 'Ziel steht nicht auf der Freigabeliste' };
        }
        return { allow: true, ...c, reason: 'Verbunden-Modus' };
    }

    root.swPolicy = Object.freeze({
        MODES, DEFAULT_MINUTES, MAX_MINUTES, REMOTE_ALLOWLIST,
        modeState, effectiveMode, classify, decide,
    });
})(typeof self !== 'undefined' ? self : globalThis);
