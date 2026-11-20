import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { CSP } from './csp.js';
import { ortDir, packageVersion } from './scripts/packages.js';

const root = import.meta.dirname;
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
// ONNX Runtime für die Erkennung (scripts/copy-vendor.js legt ihr WebAssembly unter /vendor ab)
const ORT_VERSION = packageVersion(ortDir());

function git(args) {
    try {
        return execSync(`git ${args}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
        return '';
    }
}

// Was die App in der Fusszeile zeigt und womit eine Update-Prüfung vergleicht.
function buildInfo() {
    const commit = process.env.GITHUB_SHA || git('rev-parse HEAD') || 'unbekannt';
    const dirty = !process.env.GITHUB_SHA && git('status --porcelain') !== '';
    return {
        version: pkg.version,
        commit,
        // Ein lokaler Build mit nicht eingecheckten Änderungen gibt sich nie als Commit aus
        id: commit.slice(0, 12) + (dirty ? `-lokal-${Date.now()}` : ''),
        dirty,
        message: git('log -1 --format=%s'),
        date: new Date().toISOString(),
        repository: pkg.repository.url.replace(/\.git$/, ''),
    };
}

const BUILD = buildInfo();

// Absichtlich übers Netz, nie aus dem App-Speicher: Die Torwächter-Skripte prüft der Browser selbst,
// version.json ist das, womit eine Update-Prüfung vergleicht.
const NOT_PRECACHED = new Set(['sw.js', 'sw-policy.js', 'version.json']);

function listFiles(dir) {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));
}

function replaceOnce(source, token, value, file) {
    if (!source.includes(token)) throw new Error(`${file}: Platzhalter ${token} fehlt`);
    return source.replace(token, () => value);
}

/**
 * Build-Schritt für die Offline-App:
 * - CSP als <meta> in jeder Seite (der Header aus firebase.json ist die zweite Verteidigungslinie)
 * - version.json mit den Build-Angaben, für die Update-Prüfung auf Knopfdruck
 * - Build-ID und Liste aller App-Dateien in sw.js, das sie bei der Installation speichert, damit
 *   die App danach ohne jede Netzwerkanfrage startet
 */
function offlineApp() {
    let outDir;
    return {
        name: 'offline-app',
        apply: 'build',
        configResolved(config) {
            outDir = resolve(config.root, config.build.outDir);
        },
        buildStart() {
            // Frühere Versionen lieferten das Modell (mehrere GB) aus public/models mit aus.
            // Es kommt jetzt direkt von Hugging Face und darf nicht mehr auf die Website.
            if (existsSync(join(root, 'public/models/gliner_multi_pii-v1'))) {
                throw new Error('public/models/gliner_multi_pii-v1 bitte löschen: Das Modell wird nicht mehr mit der App ausgeliefert, '
                    + 'sondern im Browser direkt von Hugging Face geladen (models/catalog.json).');
            }
        },
        transformIndexHtml() {
            return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }];
        },
        closeBundle() {
            // onnxruntime-web verweist mit new URL(…, import.meta.url) auf seine .wasm-Dateien, deshalb
            // gibt Vite eine zweite Kopie aus. Der GLiNER-Worker lädt immer die versionierte aus /vendor.
            for (const file of listFiles(outDir)) {
                if (/^ort-wasm[\w.-]*\.wasm$/.test(file)) rmSync(join(outDir, file));
            }
            rmSync(join(outDir, 'models'), { recursive: true, force: true });
            const precache = listFiles(outDir)
                .filter(file => !NOT_PRECACHED.has(file) && !file.endsWith('.map'))
                .sort()
                .map(file => `/${file}`);
            // Die App wird meist als "/" aufgerufen; die statische Route in sw.js liefert das aus dem Speicher
            precache.unshift('/');
            writeFileSync(join(outDir, 'version.json'), JSON.stringify(BUILD, null, 2) + '\n');

            const swPath = join(outDir, 'sw.js');
            let sw = readFileSync(swPath, 'utf8');
            sw = replaceOnce(sw, '/* inject:build */ null', JSON.stringify({ version: BUILD.version, id: BUILD.id }), 'sw.js');
            sw = replaceOnce(sw, '/* inject:precache */ []', JSON.stringify(precache, null, 2), 'sw.js');
            writeFileSync(swPath, sw);
        },
    };
}

export default defineConfig({
    plugins: [vue(), offlineApp()],
    define: {
        __BUILD__: JSON.stringify(BUILD),
        __ORT_VERSION__: JSON.stringify(ORT_VERSION),
    },
    optimizeDeps: {
        include: ['onnxruntime-web'],
    },
    build: {
        target: 'esnext',
        assetsDir: '', // Keep assets in root of dist
        rolldownOptions: {
            input: {
                main: resolve(root, 'index.html'),
                'gliner-worker': resolve(root, 'gliner-worker.html'),
            },
        },
    },
    test: {
        environment: 'node',
        // pdf.js verlangt unter Node die «legacy»-Fassung (gleicher Code, mit Ergänzungen für Node)
        // mammoth: siehe tests/support/mammoth-node.js
        alias: [
            { find: /^pdfjs-dist$/, replacement: 'pdfjs-dist/legacy/build/pdf.mjs' },
            { find: /^mammoth$/, replacement: resolve(root, 'tests/support/mammoth-node.js') },
        ],
    },
});
