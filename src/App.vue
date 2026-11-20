<script setup>
import { computed, ref } from 'vue';
import BatchAnonymizer from './components/BatchAnonymizer.vue';
import ModeSwitch from './components/ModeSwitch.vue';
import ModellView from './views/ModellView.vue';
import VerbindungView from './views/VerbindungView.vue';
import { BUILD, connection } from './net/connection.js';

// Hauptbereich; die Nebenbereiche (Modell, Verbindung) sind bewusst zurückhaltend gestaltet
const sideTabs = [
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
      <nav class="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Bereiche">
        <button
          class="btn gap-2"
          :class="active === 'anonymisieren' ? 'btn-primary' : 'btn-outline btn-primary'"
          :aria-current="active === 'anonymisieren' ? 'page' : undefined"
          @click="active = 'anonymisieren'"
        >
          <img src="/icon.svg" alt="" class="size-6" /> Lokal anonymisieren
        </button>
        <span class="h-5 border-l border-base-300" aria-hidden="true"></span>
        <button
          v-for="tab in sideTabs"
          :key="tab.id"
          class="btn btn-ghost btn-xs font-normal"
          :class="active === tab.id
            ? 'bg-transparent text-base-content underline underline-offset-4'
            : 'text-base-content/60 hover:text-base-content'"
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
