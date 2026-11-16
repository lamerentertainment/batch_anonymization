<script setup>
import { computed, ref } from 'vue';
import BatchAnonymizer from './components/BatchAnonymizer.vue';
import ModeSwitch from './components/ModeSwitch.vue';
import ModellView from './views/ModellView.vue';
import VerbindungView from './views/VerbindungView.vue';
import { BUILD, connection } from './net/connection.js';

const tabs = [
    { id: 'anonymisieren', label: 'Anonymisieren' },
    { id: 'modell', label: 'Modell/Programmupdate' },
    { id: 'verbindung', label: 'Internetverbindung' },
];
const active = ref('anonymisieren');
const anonymizer = ref(null);
const commitUrl = computed(() => `${BUILD.repository}/commit/${BUILD.commit}`);

// Nach Laden oder Löschen des Modells zeigt die Anonymisierung sofort den neuen Stand
function onModelsChanged() {
    anonymizer.value?.refreshModelStatus();
}
</script>

<template>
  <div class="flex h-screen flex-col bg-base-200">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-base-300 bg-base-100 px-6 py-2">
      <nav class="flex flex-wrap items-center gap-1" aria-label="Bereiche">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="btn btn-sm"
          :class="active === tab.id ? 'btn-neutral' : 'btn-ghost'"
          :aria-current="active === tab.id ? 'page' : undefined"
          @click="active = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
      <div class="ml-auto"><ModeSwitch /></div>
    </div>

    <div v-if="connection.gatekeeper !== 'aktiv' && connection.gatekeeper !== 'start'" class="px-6 pt-3">
      <div v-if="connection.gatekeeper === 'entwicklung'" role="alert" class="alert alert-info text-sm">
        Entwicklungsserver: Der Torwächter ist nicht aktiv, das Netzwerk wird nicht gesperrt.
        Zum Testen <code>npm run build &amp;&amp; npm run preview</code> verwenden.
      </div>
      <div v-else role="alert" class="alert alert-error text-sm">
        Der Torwächter ist nicht aktiv{{ connection.error ? `: ${connection.error}` : '' }}.
        Ohne ihn kann die App nicht garantieren, dass sie offline bleibt.
      </div>
    </div>

    <!-- Die Anonymisierung bleibt im Speicher, auch wenn eine andere Seite offen ist -->
    <div v-show="active === 'anonymisieren'" class="min-h-0 flex-1">
      <BatchAnonymizer ref="anonymizer" @navigate="active = $event" />
    </div>
    <main v-if="active !== 'anonymisieren'" class="min-h-0 flex-1 overflow-y-auto">
      <KeepAlive>
        <ModellView v-if="active === 'modell'" @models-changed="onModelsChanged" />
        <div v-else class="mx-auto max-w-5xl p-6"><VerbindungView /></div>
      </KeepAlive>
    </main>

    <footer class="border-t border-base-300 bg-base-100 text-xs opacity-80">
      <div class="flex flex-wrap gap-x-4 gap-y-1 px-6 py-2">
        <span>Version {{ BUILD.version }}</span>
        <span>
          Build
          <a class="link" :href="commitUrl" target="_blank" rel="noopener noreferrer">{{ BUILD.id.slice(0, 7) }}</a>
          <span v-if="BUILD.dirty"> (lokale Änderungen)</span>
        </span>
        <a class="link" :href="BUILD.repository" target="_blank" rel="noopener noreferrer">Quellcode (Open Source)</a>
        <span class="ml-auto">Ihre Dokumente bleiben in diesem Browser.</span>
      </div>
    </footer>
  </div>
</template>
