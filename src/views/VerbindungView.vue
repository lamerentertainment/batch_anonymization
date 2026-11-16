<script setup>
import { computed, ref } from 'vue';
import { clearLog, connection } from '../net/connection.js';

const filter = ref('alle');
const connected = computed(() => connection.mode === 'verbunden');

const entries = computed(() => connection.log.filter(entry => {
    if (filter.value === 'netz') return entry.kind === 'netz' || entry.kind === 'app';
    if (filter.value === 'blockiert') return entry.allow === false;
    return true;
}));
const networkCount = computed(() => connection.log.filter(e => (e.kind === 'netz' || e.kind === 'app') && e.allow).length);

function time(ts) {
    return new Date(ts).toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'medium' });
}

function target(entry) {
    if (!entry.url) return '';
    try {
        const url = new URL(entry.url);
        return url.origin === window.location.origin ? url.pathname : `${url.host}${url.pathname}`;
    } catch {
        return entry.url;
    }
}
</script>

<template>
  <div class="space-y-4">
    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 text-sm">
        <h2 class="card-title">So geht die App mit dem Internet um</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <h3 class="font-semibold text-success">Lokal (Standard)</h3>
            <p class="opacity-80">
              Keine einzige Netzwerkanfrage. Die App und das Modell sind im Browser gespeichert. Die Anonymisierung
              funktioniert vollständig. Nach jedem Start ist die App in diesem Modus.
            </p>
          </div>
          <div>
            <h3 class="font-semibold text-warning">Verbunden (nur auf Knopfdruck)</h3>
            <p class="opacity-80">
              Erlaubt nur Abrufe, und nur zu dieser Website (App-Update) und zu Hugging Face (Modell). Die App sendet
              keine Daten. Die Verbindung endet automatisch.
            </p>
          </div>
        </div>
        <details>
          <summary class="cursor-pointer opacity-70">Technische Einzelheiten und Grenzen</summary>
          <ul class="mt-2 list-disc space-y-1 pl-5 opacity-80">
            <li>Ein Service Worker («Torwächter») prüft jede Anfrage der App. Die Regeln stehen in <code>public/sw-policy.js</code>.</li>
            <li>Zusätzlich verbietet eine Content Security Policy dem Browser jede Verbindung zu anderen Servern (<code>csp.js</code>).</li>
            <li>
              Der Browser prüft die Datei <code>sw.js</code> von sich aus gelegentlich, höchstens etwa einmal pro Tag. Das kann
              keine Web-App verhindern. Dabei werden keine Daten von Ihnen übertragen. Findet er eine neue Version, wird sie nicht
              installiert, sondern verworfen. Das erscheint hier im Protokoll.
            </li>
            <li>
              Ein erzwungenes Neuladen (Shift + Neu laden) umgeht den Torwächter für diesen einen Seitenaufruf. Das ist eine
              Eigenschaft des Browsers.
            </li>
          </ul>
        </details>
      </div>
    </section>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 text-sm">
        <div class="flex flex-wrap items-center gap-3">
          <h2 class="card-title">Verbindungsprotokoll</h2>
          <span class="opacity-70">{{ networkCount }} Netzwerkzugriffe gespeichert</span>
          <div class="ml-auto flex items-center gap-2">
            <select v-model="filter" class="select select-sm w-44">
              <option value="alle">Alle Einträge</option>
              <option value="netz">Nur Netzwerk</option>
              <option value="blockiert">Nur blockierte</option>
            </select>
            <button class="btn btn-sm btn-ghost" :disabled="!connection.log.length" @click="clearLog">Leeren</button>
          </div>
        </div>

        <p v-if="!entries.length" class="opacity-60">Keine Einträge.</p>
        <div v-else class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr><th>Zeit</th><th>Ereignis</th><th>Ziel</th><th>Ergebnis</th></tr>
            </thead>
            <tbody>
              <tr v-for="(entry, i) in entries" :key="entry.id ?? `${entry.ts}-${i}`">
                <td class="whitespace-nowrap">{{ time(entry.ts) }}</td>
                <td>{{ entry.label }}</td>
                <td class="max-w-xs truncate" :title="entry.url">{{ target(entry) }}</td>
                <td>
                  <span v-if="entry.kind === 'modus'" class="opacity-70">{{ entry.reason }}</span>
                  <span v-else-if="entry.allow" class="text-warning">
                    Verbunden{{ entry.status ? ` (${entry.status})` : '' }}
                    <span v-if="entry.kind === 'app'" class="opacity-70"> · {{ entry.reason }}</span>
                  </span>
                  <span v-else class="text-success">Blockiert · {{ entry.reason }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
