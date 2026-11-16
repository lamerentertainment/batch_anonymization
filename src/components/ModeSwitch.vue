<script setup>
import { computed, onUnmounted, ref } from 'vue';
import { GlobeAltIcon, LockClosedIcon } from '@heroicons/vue/24/outline';
import { connection, DEFAULT_MINUTES, setMode } from '../net/connection.js';

const dialog = ref(null);
const minutes = ref(DEFAULT_MINUTES);
const error = ref(null);
const now = ref(Date.now());
const tick = setInterval(() => { now.value = Date.now(); }, 1000);
onUnmounted(() => clearInterval(tick));

const connected = computed(() => connection.mode === 'verbunden');
const remaining = computed(() => {
    if (!connection.until) return '';
    const s = Math.max(0, Math.round((connection.until - now.value) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
});
const unavailable = computed(() => ['nicht-unterstuetzt', 'fehler', 'start'].includes(connection.gatekeeper));

async function connect() {
    error.value = null;
    try {
        await setMode('verbunden', { minutes: minutes.value });
        dialog.value.close();
    } catch (err) {
        error.value = err.message;
    }
}

async function disconnect() {
    try {
        await setMode('lokal', { reason: 'Vom Nutzer getrennt' });
    } catch (err) {
        error.value = err.message;
    }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <div
      v-if="!connected"
      class="badge badge-success gap-1 py-3"
      title="Die App stellt keine Internetverbindung her. Alles läuft in diesem Browser."
    >
      <LockClosedIcon class="size-4" /> Lokal
    </div>
    <div v-else class="badge badge-warning gap-1 py-3" title="Die App darf Updates und das Modell laden.">
      <GlobeAltIcon class="size-4" /> Verbunden · {{ remaining }}
    </div>

    <button v-if="!connected" class="btn btn-sm" :disabled="unavailable" @click="dialog.showModal()">
      Internetverbindung herstellen
    </button>
    <button v-else class="btn btn-sm btn-neutral" @click="disconnect">Trennen</button>

    <dialog ref="dialog" class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="text-lg font-semibold">Verbindung erlauben?</h3>
        <p class="mt-3 text-sm">Im Modus <strong>Verbunden</strong> darf die App:</p>
        <ul class="mt-1 list-disc pl-5 text-sm">
          <li>nach einer neuen App-Version suchen und sie laden, wenn Sie das wünschen,</li>
          <li>das Modell laden, wenn Sie es auf der Seite <em>Modell/Programmupdate</em> anfordern.</li>
        </ul>
        <p class="mt-3 text-sm">
          Ihre Dokumente verlassen den Browser nie. Die App sendet keine Daten, sie ruft nur ab.
          Jede Verbindung erscheint im Verbindungsprotokoll.
        </p>
        <label class="mt-4 flex items-center gap-3 text-sm">
          Automatisch trennen nach
          <select v-model.number="minutes" class="select select-sm w-28">
            <option :value="10">10 Min.</option>
            <option :value="30">30 Min.</option>
            <option :value="60">60 Min.</option>
          </select>
        </label>
        <p class="mt-2 text-xs opacity-70">Beim nächsten Start ist die App in jedem Fall wieder lokal.</p>
        <p v-if="error" class="mt-3 text-sm text-error">{{ error }}</p>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="dialog.close()">Abbrechen</button>
          <button class="btn btn-warning" @click="connect">Internetverbindung herstellen</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>schliessen</button></form>
    </dialog>
  </div>
</template>
