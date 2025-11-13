<template>
  <div class="modal modal-open">
    <div class="modal-box w-11/12 max-w-6xl h-[85vh] flex flex-col">
      <h3 class="font-bold text-lg">Prompt Library</h3>

      <div class="mt-4 flex gap-2 items-center">
        <input v-model="search" class="input input-bordered input-sm flex-1" placeholder="Search title/content" />
        <input v-model="tag" class="input input-bordered input-sm w-40" placeholder="#tag" />
        <label class="cursor-pointer label gap-2">
          <span class="label-text">Favs</span>
          <input type="checkbox" class="toggle" v-model="favoritesOnly" />
        </label>
      </div>

      <div class="mt-2 text-sm text-base-content/70">
        Sämtliche Prompts müssen einen <code v-pre>{{anontext}}</code> Platzhalter aufweisen, worin vor der LLM-Inferenz automatisch
        der anonymiserte Text eingefügt wird.
      </div>

      <!-- Scroll Review Warning (Restricted Mode) -->
      <div v-if="isInferLocked" class="mt-2 alert alert-warning py-2 px-3 text-sm">
        <LockClosedIcon class="w-4 h-4" />
        <span>
          <strong>Restricted Mode:</strong> Bitte scrollen Sie durch den gesamten anonymisierten Text in der Output-Area,
          bevor Sie Gemini-Inferenz verwenden können.
        </span>
      </div>

      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-auto">
        <div v-for="p in filtered" :key="p.id" class="card bg-base-200 h-80">
          <div class="card-body p-3 gap-2 flex flex-col">
            <div class="flex items-center justify-between">
              <input class="input input-ghost input-sm font-semibold w-full" v-model="p.title" @change="save(p)"/>
              <button class="btn btn-ghost btn-xs shrink-0" @click="toggleFav(p)">{{ p.favorite ? '★' : '☆' }}</button>
            </div>
            <textarea class="textarea textarea-bordered textarea-sm flex-1 text-[0.9em] leading-[1]" v-model="p.content"
                      @change="save(p)"></textarea>

            <!-- Text block selection for {{textblock}} placeholder -->
            <div v-if="getTextBlockInfo(p).hasGeneric" class="flex gap-2 items-center">
              <span class="text-xs shrink-0">Text block:</span>
              <select v-model="selectedTextBlocks[p.id]" @change="onTextBlockSelectionChange(p.id)" class="select select-bordered select-xs flex-1">
                <option value="">Select text block...</option>
                <option v-for="tb in textBlocks" :key="tb.id" :value="tb.id">
                  {{tb.tag}} - {{tb.description || 'No description'}}
                </option>
              </select>
            </div>

            <!-- Auto-inject tags display for {{textblock:'tag'}} with validation -->
            <div v-if="getTextBlockInfo(p).tags.length > 0" class="flex gap-1 items-center flex-wrap">
              <span class="text-xs opacity-60">Auto-inject:</span>
              <span v-for="tag in getTextBlockInfo(p).tags" :key="tag"
                    :class="[
                      'badge badge-xs',
                      getTextBlockValidation(p).availableTags.has(tag.toLowerCase()) ? 'badge-success' : 'badge-error'
                    ]">
                {{ getTextBlockValidation(p).availableTags.has(tag.toLowerCase()) ? '✓' : '✗' }} {{tag}}
              </span>
            </div>

            <div class="flex gap-2 items-center">
              <input class="input input-bordered input-xs flex-1" placeholder="comma,separated,tags" :value="(p.tags || []).join(',')" @change="updateTags(p, $event.target.value)" />

              <!-- Context Button -->
              <div class="dropdown dropdown-end relative">
                <button
                  @click="toggleContextMenu(p.id)"
                  class="btn btn-xs"
                  :class="{ 'btn-active': isContextEnabled(p.id), 'btn-ghost': !isContextEnabled(p.id) }"
                  :disabled="!activeCase"
                  :title="activeCase ? (isContextEnabled(p.id) ? `${getContextDocumentCount(p.id)} Dokument(e) als Kontext` : 'Dokumente als Kontext hinzufügen') : 'Kein aktiver Fall geladen'"
                >
                  <DocumentTextIcon class="w-3 h-3" />
                  <span v-if="getContextDocumentCount(p.id) > 0" class="badge badge-xs ml-1">{{ getContextDocumentCount(p.id) }}</span>
                </button>

                <!-- Context Dropdown Menu -->
                <div v-if="showContextMenu[p.id]" class="dropdown-content menu bg-base-200 rounded-box z-50 w-80 p-4 shadow-xl absolute right-0 top-full mt-1">
                  <h3 class="font-bold mb-2 text-sm">Kontext-Dokumente auswählen</h3>

                  <!-- Falls kein aktiver Case -->
                  <div v-if="!activeCase" class="text-xs text-base-content/70">
                    Kein aktiver Fall geladen
                  </div>

                  <!-- Falls keine Dokumente -->
                  <div v-else-if="availableDocuments.length === 0" class="text-xs text-base-content/70">
                    Keine Dokumente im Fall vorhanden
                  </div>

                  <!-- Dokumenten-Liste -->
                  <div v-else class="space-y-2 max-h-64 overflow-y-auto">
                    <label v-for="doc in availableDocuments" :key="doc.id" class="flex items-center gap-2 cursor-pointer hover:bg-base-300 p-2 rounded">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-xs"
                        :checked="(selectedDocumentsForContext[p.id] || []).includes(doc.id)"
                        @change="toggleDocumentSelection(p.id, doc.id)"
                      />
                      <div class="flex-1">
                        <div class="text-xs font-medium">{{ doc.name }}</div>
                        <div class="text-[10px] text-base-content/50">{{ formatDate(doc.createdAt) }}</div>
                      </div>
                    </label>
                  </div>

                  <div class="divider my-2"></div>

                  <div class="flex gap-2">
                    <button @click="selectAllDocuments(p.id)" class="btn btn-xs btn-ghost flex-1">Alle</button>
                    <button @click="deselectAllDocuments(p.id)" class="btn btn-xs btn-ghost flex-1">Keine</button>
                    <button @click="closeContextMenu(p.id)" class="btn btn-xs btn-primary flex-1">OK</button>
                  </div>
                </div>
              </div>

              <button
                class="btn btn-xs btn-warning gap-1"
                :class="{ 'btn-disabled': isInferLocked || isPromptIncomplete(p) }"
                :disabled="isInferLocked || isPromptIncomplete(p)"
                @click="inferWithGemini(p)"
                :title="getInferButtonTitle(p)"
              >
                <LockClosedIcon v-if="isInferLocked" class="w-3 h-3" />
                Infer with Gemini
              </button>
              <button class="btn btn-xs btn-outline" @click="dup(p)">Duplicate</button>
              <button class="btn btn-xs btn-error" @click="del(p)">Delete</button>
            </div>
            <div class="text-xs opacity-60">Updated: {{ new Date(p.updatedAt).toLocaleString() }} · Uses: {{ p.uses||0 }}</div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <button class="btn btn-sm" @click="createBlank">New Prompt</button>
        <button class="btn btn-sm btn-outline" @click="exportAll">Export</button>
        <label class="btn btn-sm btn-outline">
          Import
          <input type="file" accept="application/json" class="hidden" @change="importFile" />
        </label>
        <button class="btn btn-sm btn-error ml-auto" @click="$emit('close')">Close</button>
      </div>
      <div v-if="toastVisible" class="toast toast-center fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div
          :class="[
            'alert',
            toastType === 'error' ? 'alert-error' : 'alert-info',
            toastDetail ? 'cursor-pointer' : '',
            toastLoading ? 'animate-pulse' : ''
          ]"
          :style="{
            maxWidth: '90vw',
            width: '600px',
            maxHeight: '400px',
            overflow: 'auto'
          }"
          @click="onToastClick"
          role="button"
          :title="toastDetail ? 'Click to view details' : ''"
        >
          <span class="flex items-start w-full">
            <span v-if="toastLoading" class="loading loading-spinner loading-xs mr-2 mt-1 shrink-0" aria-hidden="true"></span>
            <span class="whitespace-pre-wrap break-words font-mono text-sm flex-1">{{ toastMessage }}<template v-if="toastDetail"> (click to view details)</template></span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import promptCache from '../utils/promptCache.js';
import textBlockCache from '../utils/textBlockCache.js';
import documentCache from '../utils/documentCache.js';
import { parseTextBlockPlaceholders, injectTextBlocks, validateTextBlocks } from '../utils/textBlockParser.js';
import notificationService from '../utils/notificationService.js';
import geminiInferenceService from '../utils/geminiInferenceService.js';
import { LockClosedIcon } from '@heroicons/vue/24/solid';
import { DocumentTextIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'PromptLibraryModal',
  components: {
    LockClosedIcon,
    DocumentTextIcon
  },
  props: {
    activeCase: {
      type: Object,
      default: null
    }
  },
  emits: ['close', 'inferResult', 'toast'],
  data() {
    return {
      search: '',
      tag: '',
      favoritesOnly: false,
      list: [],
      loading: false,
      toastVisible: false,
      toastMessage: '',
      toastDetail: '',
      toastType: 'info',
      toastTimer: null,
      toastLoading: false,
      scrollReviewRequired: false,
      scrollReviewCompleted: false,
      // Text block integration
      textBlocks: [],
      selectedTextBlocks: {}, // Map of promptId -> textBlockId for {{textblock}} placeholders
      // Document Context for Inference
      availableDocuments: [],
      selectedDocumentsForContext: {}, // Map of promptId -> [docIds]
      showContextMenu: {} // Map of promptId -> boolean
    };
  },
  computed: {
    filtered() {
      const q = this.search.trim().toLowerCase();
      const tag = this.tag.trim();
      return this.list.filter(p =>
        (!this.favoritesOnly || p.favorite) &&
        (!tag || p.tags?.includes(tag)) &&
        (!q || p.title?.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q))
      );
    },
    isInferLocked() {
      return this.scrollReviewRequired && !this.scrollReviewCompleted;
    }
  },
  watch: {
    selectedTextBlocks: {
      handler() {
        this.saveCachedTextBlockSelections();
      },
      deep: true
    }
  },
  async mounted() {
    await this.refresh();
    await this.refreshTextBlocks();
    this.updateScrollReviewStatus();
    this.loadCachedTextBlockSelections();

    // Listen for custom scroll review events from Anon.vue
    window.addEventListener('scrollReviewStatusChanged', this.updateScrollReviewStatus);
  },
  beforeUnmount() {
    window.removeEventListener('scrollReviewStatusChanged', this.updateScrollReviewStatus);
  },
  methods: {
    loadCachedTextBlockSelections() {
      try {
        const cached = localStorage.getItem('promptLibrary.textBlockSelections');
        if (!cached) {
          console.log('[PromptLibrary] No cached text block selections found');
          return;
        }

        const selections = JSON.parse(cached);
        console.log('[PromptLibrary] Loaded cached selections:', selections);

        // Validate that cached text blocks still exist
        const validTextBlockIds = new Set(this.textBlocks.map(tb => tb.id));

        let restoredCount = 0;
        for (const [promptId, textBlockId] of Object.entries(selections)) {
          if (validTextBlockIds.has(textBlockId)) {
            this.selectedTextBlocks[promptId] = textBlockId;
            restoredCount++;
          } else {
            console.log('[PromptLibrary] Skipping invalid text block:', textBlockId, 'for prompt:', promptId);
          }
        }
        console.log('[PromptLibrary] Restored', restoredCount, 'text block selections');
      } catch (e) {
        console.warn('Failed to load cached text block selections:', e);
      }
    },
    saveCachedTextBlockSelections() {
      try {
        // Only save non-empty selections
        const toSave = {};
        for (const [promptId, textBlockId] of Object.entries(this.selectedTextBlocks)) {
          if (textBlockId) {
            toSave[promptId] = textBlockId;
          }
        }
        localStorage.setItem('promptLibrary.textBlockSelections', JSON.stringify(toSave));
        console.log('[PromptLibrary] Saved text block selections:', toSave);
      } catch (e) {
        console.warn('Failed to save cached text block selections:', e);
      }
    },
    onTextBlockSelectionChange(promptId) {
      // Explicitly save when selection changes
      this.saveCachedTextBlockSelections();
      console.log('[PromptLibrary] Text block selection changed for prompt:', promptId, 'Selected:', this.selectedTextBlocks[promptId]);
    },
    updateScrollReviewStatus() {
      try {
        this.scrollReviewRequired = localStorage.getItem('anon.currentScrollReviewRequired') === 'true';
        this.scrollReviewCompleted = localStorage.getItem('anon.currentScrollReviewCompleted') === 'true';
      } catch (e) {
        console.warn('Failed to read scroll review status:', e);
      }
    },
    showToast(msg, opts = {}) {
      try {
        if (this.toastTimer) {
          clearTimeout(this.toastTimer);
          this.toastTimer = null;
        }
        this.toastMessage = msg;
        this.toastType = opts.type || 'info';
        this.toastDetail = opts.detail || '';
        this.toastVisible = true;
        this.toastLoading = opts.loading === true;

        const sticky = opts.sticky === true || opts.duration === 0;
        if (!sticky) {
          const ms = typeof opts.duration === 'number' ? opts.duration : 2500;
          this.toastTimer = setTimeout(() => {
            this.toastVisible = false;
            this.toastTimer = null;
            this.toastLoading = false;
          }, ms);
        }
      } catch(_) {}
      this.$emit('toast', msg, opts);
    },
    onToastClick() {
      if (this.toastDetail) {
        try {
          alert(this.toastDetail);
        } catch (e) {
          console.log('Toast detail:', this.toastDetail);
        }
      }
    },
    async refresh() { this.loading = true; this.list = await promptCache.list(); this.loading = false; },
    async refreshTextBlocks() { this.textBlocks = await textBlockCache.list(); },
    getTextBlockInfo(p) {
      if (!p || !p.content) return { hasGeneric: false, tags: [] };
      return parseTextBlockPlaceholders(p.content);
    },
    getTextBlockValidation(p) {
      const info = this.getTextBlockInfo(p);
      const availableTags = new Set(
        this.textBlocks
          .filter(tb => tb && tb.tag)
          .map(tb => tb.tag.toLowerCase())
      );

      const isValid = info.tags.every(tag => availableTags.has(tag.toLowerCase()));

      if (info.tags.length > 0) {
        console.log('[PromptLibrary] Validation for prompt:', p.id);
        console.log('  Required tags:', info.tags);
        console.log('  Available tags:', Array.from(availableTags));
        console.log('  Is valid:', isValid);
      }

      return {
        availableTags: availableTags,
        isValid: isValid
      };
    },
    isPromptIncomplete(p) {
      const info = this.getTextBlockInfo(p);

      // Check if generic {{textblock}} needs selection
      if (info.hasGeneric && !this.selectedTextBlocks[p.id]) {
        console.log('[PromptLibrary] Prompt incomplete: missing text block selection');
        return true;
      }

      // Check if all tagged textblocks exist
      const validation = this.getTextBlockValidation(p);
      if (!validation.isValid) {
        console.log('[PromptLibrary] Prompt incomplete: missing tagged text blocks');
        return true;
      }

      return false;
    },
    getInferButtonTitle(p) {
      if (this.isInferLocked) {
        return 'Bitte scrollen Sie durch den anonymisierten Text in der Output-Area, bevor Sie Gemini verwenden können.';
      }

      const info = this.getTextBlockInfo(p);
      const validation = this.getTextBlockValidation(p);

      if (info.hasGeneric && !this.selectedTextBlocks[p.id]) {
        return 'Bitte wählen Sie einen Text Block aus dem Dropdown aus.';
      }

      if (!validation.isValid) {
        const missingTags = info.tags.filter(tag => !validation.availableTags.has(tag.toLowerCase()));
        return `Fehlende Text Blocks: ${missingTags.join(', ')}`;
      }

      return '';
    },
    async save(p) { await promptCache.update(p.id, { title: p.title, content: p.content }); await this.refresh(); },
    async toggleFav(p) { await promptCache.update(p.id, { favorite: !p.favorite }); await this.refresh(); },
    async updateTags(p, csv) { const tags = csv.split(',').map(s => s.trim()).filter(Boolean); await promptCache.update(p.id, { tags }); await this.refresh(); },
    async createBlank() { await promptCache.create({ title: 'New prompt', content: '' }); await this.refresh(); },
    async dup(p) { await promptCache.create({ title: p.title + ' (copy)', content: p.content, tags: Array.isArray(p.tags) ? [...p.tags] : [], favorite: !!p.favorite }); await this.refresh(); },
    async del(p) { if (confirm('Delete this prompt?')) { await promptCache.remove(p.id); await this.refresh(); } },
    async inferWithGemini(p) {
      // Build context prefix for this specific prompt
      const contextPrefix = this.buildContextPrefix(p.id);

      await geminiInferenceService.inferWithPrompt(p, {
        showToast: this.showToast.bind(this),
        onResult: (responseText) => this.$emit('inferResult', responseText),
        selectedTextBlocks: this.selectedTextBlocks,
        textBlocks: this.textBlocks,
        contextPrefix: contextPrefix
      });
    },
    async exportAll() {
      const list = await promptCache.export();
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'prompt-library.json'; a.click();
      URL.revokeObjectURL(url);
    },
    async importFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const list = JSON.parse(text);
      const count = await promptCache.import(list);
      alert(`Imported ${count} prompts`);
      await this.refresh();
    },
    // Document Context Methods
    async loadAvailableDocuments() {
      if (!this.activeCase) {
        this.availableDocuments = [];
        return;
      }

      try {
        this.availableDocuments = await documentCache.listByCase(this.activeCase.id);
        console.log('[PromptLibrary] Loaded documents for context:', this.availableDocuments.length);
      } catch (err) {
        console.error('[PromptLibrary] Failed to load documents for context:', err);
        this.availableDocuments = [];
      }
    },
    loadContextSelection(promptId) {
      if (!this.activeCase || !promptId) return [];

      try {
        const savedSelection = localStorage.getItem(`promptLibrary.contextDocuments.${promptId}.${this.activeCase.id}`);
        if (savedSelection) {
          const parsed = JSON.parse(savedSelection);
          // Filter out documents that no longer exist
          const validIds = this.availableDocuments.map(d => d.id);
          return parsed.filter(id => validIds.includes(id));
        }
      } catch (err) {
        console.error('[PromptLibrary] Failed to load context selection:', err);
      }
      return [];
    },
    toggleDocumentSelection(promptId, docId) {
      if (!this.selectedDocumentsForContext[promptId]) {
        this.selectedDocumentsForContext[promptId] = [];
      }

      const selected = this.selectedDocumentsForContext[promptId];
      const index = selected.indexOf(docId);

      if (index > -1) {
        selected.splice(index, 1);
      } else {
        selected.push(docId);
      }

      this.saveContextSelection(promptId);
    },
    selectAllDocuments(promptId) {
      this.selectedDocumentsForContext[promptId] = this.availableDocuments.map(d => d.id);
      this.saveContextSelection(promptId);
    },
    deselectAllDocuments(promptId) {
      this.selectedDocumentsForContext[promptId] = [];
      this.saveContextSelection(promptId);
    },
    saveContextSelection(promptId) {
      if (!this.activeCase || !promptId) return;

      try {
        const selection = this.selectedDocumentsForContext[promptId] || [];
        localStorage.setItem(
          `promptLibrary.contextDocuments.${promptId}.${this.activeCase.id}`,
          JSON.stringify(selection)
        );
        console.log('[PromptLibrary] Context selection saved:', selection.length, 'documents for prompt', promptId);
      } catch (err) {
        console.error('[PromptLibrary] Failed to save context selection:', err);
      }
    },
    toggleContextMenu(promptId) {
      const currentState = this.showContextMenu[promptId] || false;
      this.showContextMenu[promptId] = !currentState;

      if (!currentState) {
        // Opening menu, load documents if needed
        if (this.availableDocuments.length === 0) {
          this.loadAvailableDocuments();
        }
        // Load saved selection for this prompt
        if (!this.selectedDocumentsForContext[promptId]) {
          this.selectedDocumentsForContext[promptId] = this.loadContextSelection(promptId);
        }
      }
    },
    closeContextMenu(promptId) {
      this.showContextMenu[promptId] = false;
    },
    buildContextPrefix(promptId) {
      const selectedDocs = this.selectedDocumentsForContext[promptId] || [];

      if (selectedDocs.length === 0) {
        return '';
      }

      const docs = this.availableDocuments.filter(doc => selectedDocs.includes(doc.id));

      if (docs.length === 0) {
        return '';
      }

      let prefix = 'Nachfolgend erfolgt der Kontext der Aufgabe, welche dir am Ende dieses Prompts formuliert wird\n\n## Kontext\n\n';

      docs.forEach(doc => {
        prefix += `### ${doc.name}\n\n${doc.content}\n\n`;
      });

      return prefix;
    },
    isContextEnabled(promptId) {
      const selected = this.selectedDocumentsForContext[promptId] || [];
      return selected.length > 0;
    },
    getContextDocumentCount(promptId) {
      const selected = this.selectedDocumentsForContext[promptId] || [];
      return selected.length;
    },
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }
};
</script>
