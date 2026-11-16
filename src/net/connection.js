// Seitenseite des Torwächters: Modus anzeigen und wechseln, Verbindungsprotokoll, Updates.
// Die Entscheidung über jede Anfrage trifft allein der Service Worker (public/sw.js);
// diese Datei schickt ihm nur Wünsche und zeigt seinen Zustand an.
import { reactive, readonly } from 'vue';

/* global __BUILD__ */
export const BUILD = __BUILD__;
export const DEFAULT_MINUTES = 30;
const DEV = import.meta.env.DEV;
const LOG_LIMIT = 500;

const state = reactive({
    /** 'start' | 'aktiv' | 'entwicklung' | 'nicht-unterstuetzt' | 'fehler' */
    gatekeeper: 'start',
    error: null,
    mode: 'lokal',
    until: null,
    log: [],
    update: { status: 'idle', remote: null, error: null }, // idle|pruefen|aktuell|verfuegbar|laden|bereit|fehler
});

export const connection = readonly(state);

function send(message, target = navigator.serviceWorker?.controller) {
    if (!target) return Promise.reject(new Error('Der Torwächter ist nicht aktiv.'));
    return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => reject(new Error('Keine Antwort vom Torwächter.')), 10000);
        channel.port1.onmessage = event => {
            clearTimeout(timer);
            if (event.data?.ok) resolve(event.data.result);
            else reject(new Error(event.data?.error || 'Unbekannter Fehler'));
        };
        target.postMessage(message, [channel.port2]);
    });
}

function applyMode({ mode, until }) {
    state.mode = mode;
    state.until = until;
}

function pushLog(entry) {
    state.log.unshift(entry);
    if (state.log.length > LOG_LIMIT) state.log.length = LOG_LIMIT;
}

function onMessage(event) {
    const message = event.data || {};
    if (message.type === 'NETLOG') pushLog(message.entry);
    if (message.type === 'MODE') applyMode(message);
}

function waitForController(ms) {
    if (navigator.serviceWorker.controller) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Der Torwächter konnte nicht gestartet werden.')), ms);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            clearTimeout(timer);
            resolve();
        }, { once: true });
    });
}

let expiryTimer;
function scheduleExpiry() {
    clearTimeout(expiryTimer);
    if (state.mode === 'verbunden' && state.until) {
        // Der Service Worker sperrt ab «until» ohnehin; hier wird nur die Anzeige nachgeführt
        expiryTimer = setTimeout(() => setMode('lokal', { reason: 'Verbindungszeit abgelaufen' }), Math.max(0, state.until - Date.now()) + 500);
    }
}

export async function initConnection() {
    if (DEV) {
        state.gatekeeper = 'entwicklung';
        return;
    }
    if (!('serviceWorker' in navigator)) {
        state.gatekeeper = 'nicht-unterstuetzt';
        return;
    }
    try {
        navigator.serviceWorker.addEventListener('message', onMessage);
        // updateViaCache 'all': Der Browser darf sw.js aus dem HTTP-Cache nehmen (max-age=86400,
        // siehe firebase.json) und fragt den Server so höchstens etwa einmal pro Tag.
        await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'all' });
        await waitForController(30000);
        // Jeder Start beginnt im Modus «lokal»
        applyMode(await send({ type: 'SET_MODE', mode: 'lokal', reason: 'App gestartet' }));
        state.log = await send({ type: 'GET_LOG' });
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) state.update.status = 'bereit';
        state.gatekeeper = 'aktiv';
    } catch (err) {
        state.gatekeeper = 'fehler';
        state.error = err.message;
    }
}

export async function setMode(mode, { minutes = DEFAULT_MINUTES, reason } = {}) {
    if (state.gatekeeper === 'entwicklung') {
        // Kein Service Worker im Entwicklungsserver: nur die Anzeige wird umgestellt
        applyMode(mode === 'verbunden' ? { mode, until: Date.now() + minutes * 60000 } : { mode: 'lokal', until: null });
        pushLog({ ts: Date.now(), kind: 'modus', purpose: 'modus', label: mode === 'verbunden' ? 'Verbunden' : 'Lokal', reason: 'Entwicklungsmodus: Netzwerk wird nicht gesperrt' });
    } else {
        applyMode(await send({ type: 'SET_MODE', mode, minutes, reason }));
    }
    scheduleExpiry();
}

export async function clearLog() {
    if (state.gatekeeper === 'aktiv') await send({ type: 'CLEAR_LOG' });
    state.log = [];
}

/** Antwort des Torwächters auf eine blockierte Anfrage erkennen. */
export function isBlocked(response) {
    return response.status === 503 && response.headers.get('X-Torwaechter') === 'blockiert';
}

function requireConnected() {
    if (state.mode !== 'verbunden') throw new Error('Dafür zuerst oben «Internetverbindung herstellen» wählen.');
}

// --- Updates: nur auf Knopfdruck --------------------------------------------------------------

export async function checkForUpdate() {
    const update = state.update;
    update.error = null;
    try {
        requireConnected();
        update.status = 'pruefen';
        const response = await fetch('/version.json', { cache: 'no-store' });
        if (isBlocked(response)) throw new Error('Vom Torwächter blockiert.');
        if (!response.ok) throw new Error(`Server antwortet mit ${response.status}.`);
        update.remote = await response.json();
        update.status = update.remote.id === BUILD.id ? 'aktuell' : 'verfuegbar';
    } catch (err) {
        update.status = 'fehler';
        update.error = err.message;
    }
}

function waitInstalled(worker) {
    return new Promise((resolve, reject) => {
        const check = () => {
            if (worker.state === 'installed' || worker.state === 'activated') resolve();
            if (worker.state === 'redundant') reject(new Error('Die neue Version konnte nicht gespeichert werden.'));
        };
        worker.addEventListener('statechange', check);
        check();
    });
}

export async function downloadUpdate() {
    const update = state.update;
    update.error = null;
    try {
        requireConnected();
        update.status = 'laden';
        await send({ type: 'REQUEST_UPDATE' });
        // Wegen updateViaCache 'all' liest der Browser sw.js aus dem HTTP-Cache. Diese zwei Abrufe
        // frischen ihn auf, damit registration.update() die neue Version sieht.
        for (const path of ['/sw.js', '/sw-policy.js']) {
            const response = await fetch(path, { cache: 'reload' });
            if (isBlocked(response)) throw new Error('Vom Torwächter blockiert.');
        }
        const registration = await navigator.serviceWorker.getRegistration();
        await registration.update();
        const worker = registration.installing || registration.waiting;
        if (!worker) {
            update.status = 'aktuell';
            return;
        }
        await waitInstalled(worker);
        update.status = 'bereit';
    } catch (err) {
        update.status = 'fehler';
        update.error = err.message;
    }
}

export async function applyUpdate() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.waiting) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    await send({ type: 'ACTIVATE_UPDATE' }, registration.waiting);
}
