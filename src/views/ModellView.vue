<script setup>
import { computed, onActivated, onMounted, reactive, ref } from 'vue';
import {
    applyUpdate, BUILD, checkForUpdate, connection, downloadUpdate,
} from '../net/connection.js';
import {
    download, formatBytes, getStatus, missingSize, models, modelSize, remove, requestPersistence, storageInfo, verify,
} from '../models/modelStore.js';

const emit = defineEmits(['models-changed']);
const STATUS_LABEL = { installiert: '✓ Installiert', unvollstaendig: 'Unvollständig', fehlt: 'Nicht installiert' };

// Pro Modell: Status, laufender Vorgang, Fortschritt und Meldung
const rows = reactive(Object.fromEntries(models.map(model => [model.id, {
    status: null, missing: 0, busy: null, progress: 0, message: null, error: false, controller: null,
}])));
const storage = ref({ usage: 0, quota: 0, persisted: false });
const connected = computed(() => connection.mode === 'verbunden');
const update = computed(() => connection.update);
const time = ts => new Date(ts).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'medium' });

async function refresh() {
    for (const model of models) {
        rows[model.id].status = await getStatus(model);
        rows[model.id].missing = await missingSize(model);
    }
    storage.value = await storageInfo();
}
onMounted(refresh);
onActivated(refresh);

function report(row, message, error = false) {
    row.message = message;
    row.error = error;
}

async function load(model) {
    const row = rows[model.id];
    row.busy = 'laden';
    row.progress = 0;
    row.controller = new AbortController();
    report(row, null);
    try {
        await download(model, { signal: row.controller.signal, onProgress: p => { row.progress = p; } });
        report(row, 'Geladen und Prüfsumme bestätigt.');
    } catch (err) {
        report(row, err.name === 'AbortError' ? 'Abgebrochen.' : err.message, err.name !== 'AbortError');
    } finally {
        row.busy = null;
        row.controller = null;
        await refresh();
        emit('models-changed');
    }
}

async function check(model) {
    const row = rows[model.id];
    row.busy = 'pruefen';
    try {
        const broken = await verify(model);
        report(row, broken.length ? `Fehlerhaft oder fehlend: ${broken.join(', ')}` : 'Alle Dateien unverändert (SHA-256 geprüft).', broken.length > 0);
    } finally {
        row.busy = null;
    }
}

async function del(model) {
    const row = rows[model.id];
    row.busy = 'loeschen';
    try {
        await remove(model);
        report(row, 'Aus dem Browser entfernt.');
    } finally {
        row.busy = null;
        await refresh();
        emit('models-changed');
    }
}

// true, wenn der Browser den Schutz auf Knopfdruck abgelehnt hat
const persistDenied = ref(false);
async function persist() {
    persistDenied.value = !(await requestPersistence());
    storage.value = await storageInfo();
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-4 p-6">
    <section class="card bg-base-100 shadow-xs">
      <div class="card-body gap-3 text-sm">
        <h2 class="card-title">Programmupdate</h2>
        <p>
          Installiert: <strong>{{ BUILD.version }}</strong>, Build <code>{{ BUILD.id.slice(0, 7) }}</code>&nbsp;<span class="opacity-60">({{ time(BUILD.date) }})</span>
        </p>

        <div class="flex flex-wrap items-center gap-3">
          <button
            class="btn btn-sm"
            :disabled="!connected || ['pruefen', 'laden'].includes(update.status)"
            @click="checkForUpdate"
          >
            Nach Updates suchen
          </button>
          <span v-if="!connected" class="text-xs opacity-60">Dafür oben zuerst «Internetverbindung herstellen» wählen.</span>
          <span v-if="update.status === 'pruefen'" class="loading loading-spinner loading-sm" />
          <span v-if="update.status === 'aktuell'" class="text-success">Die App ist auf dem neuesten Stand.</span>
          <span v-if="update.status === 'fehler'" class="text-error">{{ update.error }}</span>
        </div>

        <div v-if="update.status === 'verfuegbar' || update.status === 'laden'" class="rounded-box bg-base-200 p-3">
          <p>
            Neue Version <strong>{{ update.remote.version }}</strong>, Build <code>{{ update.remote.id.slice(0, 7) }}</code>&nbsp;<span class="opacity-60">({{ time(update.remote.date) }})</span>
          </p>
          <p v-if="update.remote.message" class="opacity-80">«{{ update.remote.message }}»</p>
          <p class="mt-1">
            <a class="link" :href="`${update.remote.repository}/compare/${BUILD.commit}...${update.remote.commit}`" target="_blank" rel="noopener noreferrer">
              Änderungen im Quellcode ansehen
            </a>
          </p>
          <button class="btn btn-sm btn-primary mt-2" :disabled="update.status === 'laden'" @click="downloadUpdate">
            <span v-if="update.status === 'laden'" class="loading loading-spinner loading-xs" />
            Update laden
          </button>
        </div>

        <div v-if="update.status === 'bereit'" class="rounded-box bg-base-200 p-3">
          <p>Die neue Version ist geladen. Sie wird beim Neuladen aktiv.</p>
          <button class="btn btn-sm btn-primary mt-2" @click="applyUpdate">Jetzt neu laden</button>
        </div>
      </div>
    </section>

    <section class="card bg-base-100 shadow-xs">
      <div class="card-body gap-3">
        <h2 class="card-title">Modell in diesem Browser</h2>
        <p class="text-sm opacity-80">
          Die Anonymisierung braucht ein Modell zur Entitätserkennung. Es wird direkt bei Hugging Face geladen, nur auf
          Knopfdruck und nur im Modus <strong>Verbunden</strong>. Jede Datei hat eine feste Version und wird vor dem
          Speichern mit ihrer Prüfsumme (SHA-256) verglichen. Danach läuft das Modell ohne Internet.
        </p>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span>Belegter Speicher: <strong>{{ formatBytes(storage.usage) }}</strong>
            <template v-if="storage.quota"> von {{ formatBytes(storage.quota) }}</template></span>
          <span v-if="storage.persisted" class="text-success">Speicher geschützt: Der Browser löscht nichts von sich aus.</span>
          <button v-else class="btn btn-xs" @click="persist">Speicher schützen</button>
        </div>
        <p v-if="persistDenied" class="text-sm text-warning">
          Der Browser hat den Schutz nicht gewährt. Das Modell bleibt trotzdem gespeichert, können aber bei
          Speichermangel gelöscht werden. Am ehesten klappt es, wenn die App installiert ist (im Browser-Menü «App installieren» bzw. «Zum Home-Bildschirm»).
        </p>
        <details class="text-sm">
          <summary class="cursor-pointer opacity-70">Was heisst «Speicher schützen»?</summary>
          <div class="mt-2 space-y-2 opacity-80">
            <p>
              Was eine Website im Browser speichert, gilt zunächst als <em>vorläufig</em>: Wird der Platz auf dem Gerät
              knapp, darf der Browser die Daten selten benutzter Websites ohne Rückfrage löschen. Safari löscht sie
              zudem, wenn eine Website einige Tage nicht besucht wurde (ausser die App ist auf dem Home-Bildschirm
              installiert). Für diese App hiesse das: Das Modell ist plötzlich weg und muss neu geladen werden,
              wofür eine Verbindung nötig ist.
            </p>
            <p>
              «Speicher schützen» bittet den Browser, den Speicher dieser App als <em>dauerhaft</em> zu behandeln. Dann
              löscht er nichts mehr von sich aus, nur noch, wenn Sie es selbst tun (hier mit «Löschen» oder in den
              Einstellungen des Browsers unter «Websitedaten löschen»). Geschützt sind das Modell, die gespeicherte App
              und das Verbindungsprotokoll. Mehr Platz gibt es dadurch nicht, und es wird nichts übertragen.
            </p>
            <p>
              Ob der Wunsch gewährt wird, entscheidet der Browser: Chrome und Edge fragen nicht nach, sondern entscheiden
              selbst (eher ja, wenn die App installiert ist, ein Lesezeichen hat oder oft benutzt wird). Firefox fragt
              Sie. Safari gewährt den Schutz am ehesten, wenn die App installiert ist. Beim Laden des Modells fragt
              die App von sich aus nach; der Knopf ist für den Fall, dass der Browser damals abgelehnt hat.
            </p>
          </div>
        </details>
      </div>
    </section>

    <section v-for="model in models" :key="model.id" class="card bg-base-100 shadow-xs" :data-model="model.id">
      <div class="card-body gap-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 class="font-semibold">{{ model.name }}</h3>
            <p class="text-sm opacity-80">{{ model.purpose }}</p>
          </div>
          <span
            class="badge"
            :class="{
              'badge-success': rows[model.id].status === 'installiert',
              'badge-warning': rows[model.id].status === 'unvollstaendig',
              'badge-ghost': rows[model.id].status === 'fehlt',
            }"
          >{{ STATUS_LABEL[rows[model.id].status] ?? '…' }}</span>
        </div>

        <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs opacity-70">
          <span>{{ formatBytes(modelSize(model)) }}</span>
          <span>Lizenz {{ model.license }}</span>
          <span>Revision <code>{{ model.revision.slice(0, 7) }}</code></span>
          <a class="link" :href="model.source" target="_blank" rel="noopener noreferrer">Quelle: {{ model.publisher }}</a>
        </div>

        <details class="text-xs">
          <summary class="cursor-pointer opacity-70">Dateien und Prüfsummen</summary>
          <ul class="mt-2 space-y-1">
            <li v-for="file in model.files" :key="file.name" class="break-all">
              <strong>{{ file.name }}</strong> ({{ file.role }}, {{ formatBytes(file.size) }})<br />
              <span class="opacity-70">{{ file.url }}</span><br />
              <code class="opacity-70">sha256 {{ file.sha256 }}</code>
            </li>
          </ul>
        </details>

        <progress
          v-if="rows[model.id].busy === 'laden'"
          class="progress w-full"
          :value="Math.round(rows[model.id].progress * 100)"
          max="100"
        />
        <p v-if="rows[model.id].message" class="text-sm" :class="rows[model.id].error ? 'text-error' : 'text-success'">
          {{ rows[model.id].message }}
        </p>

        <div class="card-actions">
          <template v-if="rows[model.id].busy === 'laden'">
            <button class="btn btn-sm" @click="rows[model.id].controller.abort()">Abbrechen</button>
          </template>
          <template v-else>
            <button
              v-if="rows[model.id].status !== 'installiert'"
              class="btn btn-sm btn-primary"
              :disabled="!connected || rows[model.id].busy"
              :title="connected ? '' : 'Zuerst oben «Internetverbindung herstellen» wählen'"
              @click="load(model)"
            >
              Laden ({{ formatBytes(rows[model.id].missing || modelSize(model)) }})
            </button>
            <button
              v-if="rows[model.id].status === 'installiert'"
              class="btn btn-sm"
              :disabled="rows[model.id].busy"
              @click="check(model)"
            >
              Prüfen
            </button>
            <button
              v-if="rows[model.id].status && rows[model.id].status !== 'fehlt'"
              class="btn btn-sm btn-ghost text-error"
              :disabled="rows[model.id].busy"
              @click="del(model)"
            >
              Löschen
            </button>
            <span v-if="!connected && rows[model.id].status !== 'installiert'" class="self-center text-xs opacity-60">
              Zum Laden zuerst oben «Internetverbindung herstellen» wählen.
            </span>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
