<template>
  <div class="modal modal-open">
    <div class="modal-box w-11/12 max-w-6xl h-[85vh] flex flex-col">
      <h3 class="font-bold text-lg">Case Management</h3>

      <!-- Case Selector with Actions -->
      <div class="mt-4 flex gap-2 items-center">
        <select
          v-model="selectedCaseId"
          @change="onCaseSelected"
          class="select select-bordered select-sm flex-1"
        >
          <option value="">-- Fall auswählen --</option>
          <option v-for="c in filteredCases" :key="c.id" :value="c.id">
            {{ c.name }} ({{ c.entities?.length || 0 }} Entitäten, {{ getDocCount(c.id) }} Docs)
          </option>
        </select>
        <button
          @click="loadCaseToAnon"
          class="btn btn-sm btn-primary gap-1"
          :disabled="!selectedCaseId"
        >
          <ArrowDownTrayIcon class="h-4 w-4" />
          Fall laden
        </button>
        <button @click="createNewCase" class="btn btn-sm btn-outline">
          Neuer Fall
        </button>
        <button
          @click="deleteCurrentCase"
          class="btn btn-sm btn-error"
          :disabled="!selectedCaseId"
        >
          Löschen
        </button>
      </div>

      <!-- Search and Filter -->
      <div class="mt-2 flex gap-2 items-center">
        <input
          v-model="search"
          class="input input-bordered input-sm flex-1"
          placeholder="Suche nach Name oder Beschreibung"
        />
        <input
          v-model="tagFilter"
          class="input input-bordered input-sm w-40"
          placeholder="#tag"
        />
        <label class="cursor-pointer label gap-2">
          <span class="label-text">Favs</span>
          <input type="checkbox" class="toggle toggle-sm" v-model="favoritesOnly" />
        </label>
      </div>

      <div class="divider my-2"></div>

      <!-- Documents Section (Prominent, at top) -->
      <div v-if="currentCase" class="flex-1 overflow-hidden flex flex-col">
        <div class="flex justify-between items-center mb-3">
          <h4 class="font-bold text-lg">
            Dokumente ({{ currentDocuments.length }})
          </h4>
          <button @click="createBlankDocument" class="btn btn-sm btn-primary gap-1">
            <DocumentPlusIcon class="h-4 w-4" />
            Neues Dokument
          </button>
        </div>

        <!-- Documents Grid (2 columns) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 overflow-y-auto">
          <div v-for="doc in currentDocuments" :key="doc.id"
               class="card bg-base-100 border border-base-300 h-64">
            <div class="card-body p-3 gap-2 flex flex-col">
              <!-- Header with name -->
              <div class="flex items-center justify-between gap-2">
                <input
                  v-model="doc.name"
                  @change="saveDocument(doc)"
                  class="input input-ghost input-sm font-semibold flex-1"
                  placeholder="Dokument-Name"
                />
                <button
                  @click="deleteDocument(doc)"
                  class="btn btn-ghost btn-xs text-error shrink-0"
                >
                  ✕
                </button>
              </div>

              <!-- Textarea with content -->
              <textarea
                v-model="doc.content"
                @change="saveDocument(doc)"
                class="textarea textarea-bordered textarea-sm flex-1 text-xs leading-tight font-mono"
                placeholder="Anonymisierter Text..."
              ></textarea>

              <!-- Footer with actions -->
              <div class="flex gap-2 items-center justify-between">
                <div class="text-xs opacity-60">
                  {{ formatDate(doc.updatedAt) }}
                </div>
                <div class="flex gap-1">
                  <button
                    @click="loadDocumentToAnon(doc)"
                    class="btn btn-xs btn-primary"
                    :title="getLoadTooltip()"
                  >
                    {{ currentMode === 'anonymize' ? '→ Output' : '→ Input' }}
                  </button>
                  <button
                    @click="viewFullScreen(doc)"
                    class="btn btn-xs btn-ghost"
                    title="Vollbild anzeigen"
                  >
                    🔍
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state for documents -->
          <div v-if="currentDocuments.length === 0"
               class="col-span-full text-center py-12 opacity-60">
            <DocumentIcon class="h-16 w-16 mx-auto mb-3 opacity-40" />
            <p>Noch keine Dokumente vorhanden</p>
            <p class="text-sm mt-1">Erstellen Sie ein neues Dokument oder speichern Sie anonymisierte Texte aus Anon.vue</p>
          </div>
        </div>
      </div>

      <!-- Empty state when no case selected -->
      <div v-else class="flex-1 flex items-center justify-center border rounded bg-base-200 opacity-60">
        <div class="text-center">
          <FolderIcon class="h-16 w-16 mx-auto mb-3 opacity-40" />
          <p class="text-lg">Wählen Sie einen Fall aus oder erstellen Sie einen neuen</p>
        </div>
      </div>

      <div class="divider my-2"></div>

      <!-- Case Details (Collapsible, at bottom) -->
      <div v-if="currentCase" class="collapse collapse-arrow bg-base-200 border border-base-300">
        <input type="checkbox" v-model="showCaseDetails" />
        <div class="collapse-title font-semibold text-sm">
          Fall-Metadaten & Aktionen
        </div>
        <div class="collapse-content space-y-3">
          <!-- Name -->
          <input
            v-model="currentCase.name"
            @change="saveCase"
            class="input input-bordered input-sm w-full font-semibold"
            placeholder="Fall-Name"
          />

          <!-- Description -->
          <textarea
            v-model="currentCase.description"
            @change="saveCase"
            class="textarea textarea-bordered textarea-sm w-full"
            rows="2"
            placeholder="Beschreibung des Falls..."
          ></textarea>

          <!-- Tags & Favorite -->
          <div class="flex gap-2">
            <input
              :value="(currentCase.tags || []).join(',')"
              @change="updateTags"
              class="input input-bordered input-sm flex-1"
              placeholder="tags,komma,getrennt"
            />
            <button @click="toggleFav" class="btn btn-ghost btn-sm">
              {{ currentCase.favorite ? '★' : '☆' }}
            </button>
          </div>

          <!-- Entities (nested collapsible) -->
          <div class="collapse collapse-arrow bg-base-100 border border-base-300">
            <input type="checkbox" v-model="showEntities" />
            <div class="collapse-title text-sm font-semibold py-2 min-h-0">
              Entitäten ({{ currentCase.entities?.length || 0 }})
              <span class="badge badge-sm ml-2">{{ currentCase.mode || 'anonymize' }}</span>
            </div>
            <div class="collapse-content">
              <div class="max-h-48 overflow-y-auto space-y-1 pt-2">
                <div v-for="e in currentCase.entities" :key="e.id"
                     class="text-xs bg-base-200 p-2 rounded flex items-center gap-2">
                  <span class="badge badge-outline badge-xs">{{ e.id }}_{{ e.type }}</span>
                  <span>{{ e.name }}</span>
                </div>
                <div v-if="!currentCase.entities?.length"
                     class="text-xs opacity-50 text-center py-4">
                  Keine Entitäten gespeichert
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-wrap">
            <button
              v-if="canUpdateFromAnon"
              @click="updateEntitiesFromAnon"
              class="btn btn-xs btn-outline gap-1"
            >
              <ArrowUpTrayIcon class="h-4 w-4" />
              Entitäten von Anon aktualisieren
            </button>
            <button @click="exportCase" class="btn btn-xs btn-outline gap-1">
              <DocumentArrowDownIcon class="h-4 w-4" />
              Export Fall
            </button>
            <button @click="duplicateCase" class="btn btn-xs btn-outline gap-1">
              Duplizieren
            </button>
            <button class="btn btn-xs btn-outline" @click="exportAll">
              Export Alle
            </button>
            <label class="btn btn-xs btn-outline">
              Import
              <input type="file" accept="application/json" class="hidden" @change="importFile" />
            </label>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="mt-4 flex justify-end">
        <button class="btn btn-sm" @click="$emit('close')">Schließen</button>
      </div>

      <!-- Toast Notification -->
      <div v-if="toastVisible" class="toast toast-center fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div
          :class="['alert', toastType === 'error' ? 'alert-error' : 'alert-info']"
          :style="{ maxWidth: '90vw', width: '600px' }"
        >
          <span class="whitespace-pre-wrap break-words font-mono text-sm flex-1">{{ toastMessage }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Fullscreen Document Viewer (Modal-in-Modal) -->
  <div v-if="fullScreenDoc" class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
       @click.self="fullScreenDoc = null">
    <div class="bg-base-100 rounded-lg w-full max-w-4xl h-5/6 flex flex-col shadow-2xl">
      <div class="p-4 border-b border-base-300 flex justify-between items-center">
        <h3 class="font-bold text-lg">{{ fullScreenDoc.name }}</h3>
        <button @click="fullScreenDoc = null" class="btn btn-sm btn-ghost">
          <XMarkIcon class="h-5 w-5" />
        </button>
      </div>
      <div class="flex-1 p-4 overflow-auto">
        <textarea
          v-model="fullScreenDoc.content"
          @change="saveDocument(fullScreenDoc)"
          class="textarea textarea-bordered w-full h-full text-sm font-mono"
          placeholder="Anonymisierter Text..."
        ></textarea>
      </div>
      <div class="p-4 border-t border-base-300 flex gap-2">
        <button
          @click="loadDocumentToAnon(fullScreenDoc); fullScreenDoc = null"
          class="btn btn-sm btn-primary gap-1"
        >
          <ArrowDownTrayIcon class="h-4 w-4" />
          In Anon.vue laden
        </button>
        <button @click="fullScreenDoc = null" class="btn btn-sm btn-outline">
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import caseCache from '../utils/caseCache.js';
import documentCache from '../utils/documentCache.js';
import {
  FolderIcon,
  DocumentIcon,
  DocumentPlusIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'CaseManagementModal',
  components: {
    FolderIcon,
    DocumentIcon,
    DocumentPlusIcon,
    DocumentArrowDownIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    XMarkIcon
  },
  props: {
    currentEntities: {
      type: Array,
      default: () => []
    },
    currentMode: {
      type: String,
      default: 'anonymize'
    },
    activeCaseId: {
      type: String,
      default: null
    }
  },
  emits: ['close', 'loadCase', 'loadDocument'],
  data() {
    return {
      cases: [],
      selectedCaseId: this.activeCaseId || '',
      currentCase: null,
      currentDocuments: [],
      documentCounts: {}, // Map of caseId -> doc count

      // UI state
      search: '',
      tagFilter: '',
      favoritesOnly: false,
      showEntities: false,
      showCaseDetails: false,
      fullScreenDoc: null,

      // Toast
      toastVisible: false,
      toastMessage: '',
      toastType: 'info',
      toastTimer: null,

      loading: false
    };
  },
  computed: {
    filteredCases() {
      const q = this.search.trim().toLowerCase();
      const tag = this.tagFilter.trim();
      return this.cases.filter(c =>
        (!this.favoritesOnly || c.favorite) &&
        (!tag || c.tags?.includes(tag)) &&
        (!q || c.name?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
      );
    },
    canUpdateFromAnon() {
      return this.currentEntities && this.currentEntities.length > 0;
    }
  },
  async mounted() {
    await this.refreshCases();
    await this.loadDocumentCounts();

    // If a case is already active, load it
    if (this.selectedCaseId) {
      await this.onCaseSelected();
    }
  },
  methods: {
    showToast(msg, opts = {}) {
      try {
        if (this.toastTimer) {
          clearTimeout(this.toastTimer);
          this.toastTimer = null;
        }
        this.toastMessage = msg;
        this.toastType = opts.type || 'info';
        this.toastVisible = true;

        const ms = typeof opts.duration === 'number' ? opts.duration : 2500;
        this.toastTimer = setTimeout(() => {
          this.toastVisible = false;
          this.toastTimer = null;
        }, ms);
      } catch(_) {}
    },

    async refreshCases() {
      this.loading = true;
      this.cases = await caseCache.list();
      this.loading = false;
    },

    async loadDocumentCounts() {
      // Load document counts for all cases
      const counts = {};
      for (const c of this.cases) {
        counts[c.id] = await documentCache.countByCase(c.id);
      }
      this.documentCounts = counts;
    },

    getDocCount(caseId) {
      return this.documentCounts[caseId] || 0;
    },

    async createNewCase() {
      const name = prompt('Name des neuen Falls:', 'Neuer Fall');
      if (!name) return;

      try {
        console.log('[CaseManagement] Creating new case:', name);
        const newCase = await caseCache.create({ name });
        console.log('[CaseManagement] Case created:', newCase);

        await this.refreshCases();
        console.log('[CaseManagement] Cases refreshed, total:', this.cases.length);

        await this.loadDocumentCounts();

        this.selectedCaseId = newCase.id;
        console.log('[CaseManagement] Selected case ID:', this.selectedCaseId);

        await this.onCaseSelected();
        console.log('[CaseManagement] Case selected:', this.currentCase);

        this.showToast('Fall erstellt');
      } catch (err) {
        console.error('[CaseManagement] Error creating case:', err);
        this.showToast('Fehler beim Erstellen: ' + err.message, { type: 'error', duration: 5000 });
      }
    },

    async onCaseSelected() {
      if (!this.selectedCaseId) {
        this.currentCase = null;
        this.currentDocuments = [];
        return;
      }

      console.log('[CaseManagement] Loading case:', this.selectedCaseId);
      this.currentCase = await caseCache.getById(this.selectedCaseId);
      console.log('[CaseManagement] Case loaded:', this.currentCase);
      console.log('[CaseManagement] Entities in loaded case:', this.currentCase?.entities?.length || 0);

      if (this.currentCase) {
        this.currentDocuments = await documentCache.listByCase(this.selectedCaseId);
      }
    },

    async saveCase() {
      if (!this.currentCase) return;
      await caseCache.update(this.currentCase.id, {
        name: this.currentCase.name,
        description: this.currentCase.description
      });
      await this.refreshCases();
      this.showToast('Gespeichert');
    },

    async updateTags(event) {
      if (!this.currentCase) return;
      const tags = event.target.value.split(',').map(s => s.trim()).filter(Boolean);
      await caseCache.update(this.currentCase.id, { tags });
      this.currentCase.tags = tags;
      await this.refreshCases();
    },

    async toggleFav() {
      if (!this.currentCase) return;
      await caseCache.update(this.currentCase.id, { favorite: !this.currentCase.favorite });
      this.currentCase.favorite = !this.currentCase.favorite;
      await this.refreshCases();
    },

    async deleteCurrentCase() {
      if (!this.currentCase) return;

      const confirmMsg = `Fall "${this.currentCase.name}" wirklich löschen?\n\nAlle Dokumente (${this.currentDocuments.length}) werden ebenfalls gelöscht.`;
      if (!confirm(confirmMsg)) return;

      // Delete all documents first
      await documentCache.removeByCase(this.currentCase.id);

      // Delete the case
      await caseCache.remove(this.currentCase.id);

      await this.refreshCases();
      await this.loadDocumentCounts();
      this.selectedCaseId = '';
      this.currentCase = null;
      this.currentDocuments = [];
      this.showToast('Fall gelöscht');
    },

    loadCaseToAnon() {
      if (!this.currentCase) return;
      this.$emit('loadCase', this.currentCase);
    },

    async updateEntitiesFromAnon() {
      if (!this.currentCase) return;

      console.log('[CaseManagement] Updating entities from Anon');
      console.log('[CaseManagement] Current entities:', this.currentEntities);
      console.log('[CaseManagement] Current mode:', this.currentMode);

      await caseCache.update(this.currentCase.id, {
        entities: this.currentEntities,
        mode: this.currentMode
      });

      console.log('[CaseManagement] Entities updated in cache');

      this.currentCase.entities = this.currentEntities;
      this.currentCase.mode = this.currentMode;
      await this.refreshCases();

      console.log('[CaseManagement] Cases refreshed');

      this.showToast('Entitätenliste aktualisiert');
    },

    async exportCase() {
      if (!this.currentCase) return;

      const exportData = {
        case: this.currentCase,
        documents: this.currentDocuments
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `case-${this.currentCase.name.replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Fall exportiert');
    },

    async duplicateCase() {
      if (!this.currentCase) return;

      const newCase = await caseCache.create({
        name: this.currentCase.name + ' (Kopie)',
        description: this.currentCase.description,
        entities: [...(this.currentCase.entities || [])],
        mode: this.currentCase.mode,
        tags: [...(this.currentCase.tags || [])],
        favorite: this.currentCase.favorite
      });

      await this.refreshCases();
      await this.loadDocumentCounts();
      this.selectedCaseId = newCase.id;
      await this.onCaseSelected();
      this.showToast('Fall dupliziert');
    },

    // Document methods
    async createBlankDocument() {
      if (!this.currentCase) return;

      const name = prompt('Name des neuen Dokuments:', 'Neues Dokument');
      if (!name) return;

      await documentCache.create({
        caseId: this.currentCase.id,
        name,
        content: ''
      });

      this.currentDocuments = await documentCache.listByCase(this.currentCase.id);
      this.documentCounts[this.currentCase.id] = this.currentDocuments.length;
      this.showToast('Dokument erstellt');
    },

    async saveDocument(doc) {
      await documentCache.update(doc.id, {
        name: doc.name,
        content: doc.content
      });
      this.showToast('Gespeichert');
    },

    async deleteDocument(doc) {
      if (!confirm(`Dokument "${doc.name}" wirklich löschen?`)) return;

      await documentCache.remove(doc.id);
      this.currentDocuments = await documentCache.listByCase(this.currentCase.id);
      this.documentCounts[this.currentCase.id] = this.currentDocuments.length;
      this.showToast('Dokument gelöscht');
    },

    loadDocumentToAnon(doc) {
      this.$emit('loadDocument', {
        content: doc.content,
        name: doc.name
      });
    },

    viewFullScreen(doc) {
      this.fullScreenDoc = { ...doc };
    },

    getLoadTooltip() {
      if (this.currentMode === 'anonymize') {
        return 'Anonymisierten Text in Output-Area laden';
      } else {
        return 'Anonymisierten Text in Input-Area laden (zum Deanonymisieren)';
      }
    },

    formatDate(timestamp) {
      if (!timestamp) return '';
      try {
        return new Date(timestamp).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return '';
      }
    },

    async exportAll() {
      const allCases = await caseCache.export();
      const allDocuments = await documentCache.export();

      const exportData = {
        cases: allCases,
        documents: allDocuments,
        exportedAt: Date.now()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all-cases-export.json';
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Alle Cases exportiert');
    },

    async importFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        let casesImported = 0;
        let docsImported = 0;

        // Check if it's a full export or single case export
        if (data.cases && data.documents) {
          // Full export
          casesImported = await caseCache.import(data.cases);
          docsImported = await documentCache.import(data.documents);
        } else if (data.case && data.documents) {
          // Single case export
          casesImported = await caseCache.import([data.case]);
          docsImported = await documentCache.import(data.documents);
        } else {
          throw new Error('Ungültiges Import-Format');
        }

        await this.refreshCases();
        await this.loadDocumentCounts();
        this.showToast(`Import erfolgreich: ${casesImported} Cases, ${docsImported} Dokumente`, { duration: 4000 });
      } catch (err) {
        this.showToast('Import fehlgeschlagen: ' + err.message, { type: 'error', duration: 5000 });
      }
    }
  }
};
</script>
