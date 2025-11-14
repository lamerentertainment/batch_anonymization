<template>
  <div class="modal modal-open">
    <div class="modal-box w-11/12 max-w-6xl h-[90vh] flex flex-col">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-lg">Prompt bearbeiten & inferieren</h3>

        <!-- Context Button -->
        <div class="dropdown dropdown-end relative">
          <button
            @click="toggleContextMenu"
            class="btn btn-sm"
            :class="{ 'btn-active': isContextEnabled, 'btn-ghost': !isContextEnabled }"
            :disabled="!activeCase"
            :title="activeCase ? (isContextEnabled ? `${getContextDocumentCount} Dokument(e) als Kontext` : 'Dokumente als Kontext hinzufügen') : 'Kein aktiver Fall geladen'"
          >
            <DocumentTextIcon class="w-4 h-4" />
            <span v-if="getContextDocumentCount > 0" class="badge badge-xs ml-1">{{ getContextDocumentCount }}</span>
          </button>

          <!-- Context Dropdown Menu -->
          <div v-if="showContextMenu" class="dropdown-content menu bg-base-200 rounded-box z-50 w-80 p-4 shadow-xl absolute right-0 top-full mt-1">
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
                  :checked="localSelectedDocuments.includes(doc.id)"
                  @change="toggleDocumentSelection(doc.id)"
                />
                <div class="flex-1">
                  <div class="text-xs font-medium">{{ doc.name }}</div>
                  <div class="text-[10px] text-base-content/50">{{ formatDate(doc.createdAt) }}</div>
                </div>
              </label>
            </div>

            <div class="divider my-2"></div>

            <div class="flex gap-2">
              <button @click="selectAllDocuments" class="btn btn-xs btn-ghost flex-1">Alle</button>
              <button @click="deselectAllDocuments" class="btn btn-xs btn-ghost flex-1">Keine</button>
              <button @click="closeContextMenu" class="btn btn-xs btn-primary flex-1">OK</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Textarea for Prompt Editing -->
      <div class="mt-4 flex-1 flex flex-col">
        <textarea
          v-model="editedPromptContent"
          class="textarea textarea-bordered flex-1 text-sm leading-tight font-mono"
          placeholder="Prompt hier bearbeiten..."
        ></textarea>
      </div>

      <div class="divider my-2"></div>

      <!-- Two Column Grid for Textblocks and Documents -->
      <div class="grid grid-cols-2 gap-4 h-48 overflow-hidden">
        <!-- Textblocks Column -->
        <div class="flex flex-col">
          <h4 class="font-semibold text-sm mb-2">Textbausteine ({{ filteredTextBlocks.length }})</h4>
          <div class="overflow-y-auto flex-1 space-y-1">
            <div
              v-for="tb in filteredTextBlocks"
              :key="tb.id"
              class="flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer"
              @click="insertTextBlock(tb)"
            >
              <button class="btn btn-xs btn-ghost shrink-0" title="Einfügen">+</button>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold font-mono truncate">{{ tb.tag }}</div>
                <div class="text-[10px] text-base-content/60 truncate">{{ tb.description || 'No description' }}</div>
              </div>
            </div>
            <div v-if="filteredTextBlocks.length === 0" class="text-xs text-base-content/50 p-2">
              Keine Textbausteine gefunden
            </div>
          </div>
        </div>

        <!-- Documents Column -->
        <div class="flex flex-col">
          <h4 class="font-semibold text-sm mb-2">Dokumente ({{ filteredDocuments.length }})</h4>
          <div class="overflow-y-auto flex-1 space-y-1">
            <div
              v-for="doc in filteredDocuments"
              :key="doc.id"
              class="flex items-center gap-2 p-2 hover:bg-base-200 rounded cursor-pointer"
              @click="insertDocument(doc)"
            >
              <button class="btn btn-xs btn-ghost shrink-0" title="Einfügen">+</button>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-semibold truncate">{{ doc.name }}</div>
                <div class="text-[10px] text-base-content/60 truncate">{{ formatDate(doc.createdAt) }}</div>
              </div>
            </div>
            <div v-if="availableDocuments.length === 0 && !activeCase" class="text-xs text-base-content/50 p-2">
              Kein aktiver Fall geladen
            </div>
            <div v-else-if="filteredDocuments.length === 0" class="text-xs text-base-content/50 p-2">
              Keine Dokumente gefunden
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filter -->
      <div class="mt-3 flex gap-2">
        <input
          v-model="searchQuery"
          class="input input-bordered input-sm flex-1"
          placeholder="Suche in Textbausteinen und Dokumenten..."
        />
      </div>

      <!-- Action Buttons -->
      <div class="mt-4 flex gap-2 justify-end">
        <button class="btn btn-sm btn-ghost" @click="$emit('close')">Abbrechen</button>
        <button
          class="btn btn-sm btn-outline gap-1"
          @click="copyFullPromptToClipboard"
          title="Vollständigen Prompt (mit Kontext und Textbausteinen) in Zwischenablage kopieren"
        >
          📋 Volltext kopieren
        </button>
        <button
          class="btn btn-sm btn-outline gap-1"
          @click="showFullPromptInTextarea"
          title="Vollständigen Prompt (mit Kontext und Textbausteinen) in Textarea anzeigen"
        >
          👁 Volltext anzeigen
        </button>
        <button
          class="btn btn-sm btn-warning gap-1"
          :class="{ 'btn-disabled': isInferLocked }"
          :disabled="isInferLocked"
          @click="inferWithEditedPrompt"
        >
          <LockClosedIcon v-if="isInferLocked" class="w-3 h-3" />
          Infer with Gemini
        </button>
      </div>

      <!-- Toast Notification -->
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
import textBlockCache from '../utils/textBlockCache.js';
import documentCache from '../utils/documentCache.js';
import geminiInferenceService from '../utils/geminiInferenceService.js';
import { parseTextBlockPlaceholders, injectTextBlocks, validateTextBlocks } from '../utils/textBlockParser.js';
import { LockClosedIcon } from '@heroicons/vue/24/solid';
import { DocumentTextIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'PromptEditInferenceModal',
  components: {
    LockClosedIcon,
    DocumentTextIcon
  },
  props: {
    prompt: {
      type: Object,
      required: true
    },
    activeCase: {
      type: Object,
      default: null
    },
    selectedTextBlocks: {
      type: Object,
      default: () => ({})
    },
    selectedDocumentsForContext: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['close', 'inferResult'],
  data() {
    return {
      editedPromptContent: '',
      searchQuery: '',
      textBlocks: [],
      availableDocuments: [],
      toastVisible: false,
      toastMessage: '',
      toastDetail: '',
      toastType: 'info',
      toastTimer: null,
      toastLoading: false,
      scrollReviewRequired: false,
      scrollReviewCompleted: false,
      // Document Context
      localSelectedDocuments: [],
      showContextMenu: false
    };
  },
  computed: {
    filteredTextBlocks() {
      if (!this.searchQuery.trim()) {
        return this.textBlocks;
      }
      const query = this.searchQuery.toLowerCase();
      return this.textBlocks.filter(tb =>
        tb.tag?.toLowerCase().includes(query) ||
        tb.description?.toLowerCase().includes(query) ||
        tb.content?.toLowerCase().includes(query)
      );
    },
    filteredDocuments() {
      if (!this.searchQuery.trim()) {
        return this.availableDocuments;
      }
      const query = this.searchQuery.toLowerCase();
      return this.availableDocuments.filter(doc =>
        doc.name?.toLowerCase().includes(query) ||
        doc.content?.toLowerCase().includes(query)
      );
    },
    isInferLocked() {
      return this.scrollReviewRequired && !this.scrollReviewCompleted;
    },
    isContextEnabled() {
      return this.localSelectedDocuments.length > 0;
    },
    getContextDocumentCount() {
      return this.localSelectedDocuments.length;
    }
  },
  async mounted() {
    // Initialize edited content with original prompt
    this.editedPromptContent = this.prompt.content || '';

    // Initialize local selected documents from parent props
    const parentSelection = this.selectedDocumentsForContext[this.prompt.id] || [];
    this.localSelectedDocuments = [...parentSelection];

    // Load textblocks and documents
    await this.loadTextBlocks();
    await this.loadDocuments();

    // Update scroll review status
    this.updateScrollReviewStatus();
    window.addEventListener('scrollReviewStatusChanged', this.updateScrollReviewStatus);
  },
  beforeUnmount() {
    window.removeEventListener('scrollReviewStatusChanged', this.updateScrollReviewStatus);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  },
  methods: {
    async loadTextBlocks() {
      try {
        this.textBlocks = await textBlockCache.list();
      } catch (err) {
        console.error('[PromptEditInferenceModal] Failed to load textblocks:', err);
        this.textBlocks = [];
      }
    },
    async loadDocuments() {
      if (!this.activeCase) {
        this.availableDocuments = [];
        return;
      }
      try {
        this.availableDocuments = await documentCache.listByCase(this.activeCase.id);
      } catch (err) {
        console.error('[PromptEditInferenceModal] Failed to load documents:', err);
        this.availableDocuments = [];
      }
    },
    insertTextBlock(textBlock) {
      const placeholder = `{{textblock:'${textBlock.tag}'}}`;
      this.insertAtCursor(placeholder);
      this.showToast(`Eingefügt: ${placeholder}`);
    },
    insertDocument(doc) {
      const docText = `\n\n### ${doc.name}\n\n${doc.content}\n\n`;
      this.insertAtCursor(docText);
      this.showToast(`Dokument eingefügt: ${doc.name}`);
    },
    insertAtCursor(text) {
      // Get the textarea element
      const textarea = this.$el.querySelector('textarea');
      if (!textarea) {
        this.editedPromptContent += text;
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const content = this.editedPromptContent;

      // Insert text at cursor position
      this.editedPromptContent = content.substring(0, start) + text + content.substring(end);

      // Move cursor to end of inserted text
      this.$nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      });
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
    async inferWithEditedPrompt() {
      // Create a temporary prompt object with edited content
      const tempPrompt = {
        ...this.prompt,
        content: this.editedPromptContent
      };

      // Build context prefix from selected documents
      const contextPrefix = this.buildContextPrefix();

      // Call gemini inference service
      await geminiInferenceService.inferWithPrompt(tempPrompt, {
        showToast: this.showToast.bind(this),
        onResult: (responseText) => {
          this.$emit('inferResult', responseText);
          this.$emit('close');
        },
        selectedTextBlocks: this.selectedTextBlocks,
        textBlocks: this.textBlocks,
        contextPrefix: contextPrefix,
        requireAnontext: false // Allow inference without {{anontext}} placeholder
      });
    },
    buildContextPrefix() {
      // Use local selection instead of parent props
      const selectedDocs = this.localSelectedDocuments || [];

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
    toggleContextMenu() {
      this.showContextMenu = !this.showContextMenu;
    },
    closeContextMenu() {
      this.showContextMenu = false;
    },
    toggleDocumentSelection(docId) {
      const index = this.localSelectedDocuments.indexOf(docId);
      if (index > -1) {
        this.localSelectedDocuments.splice(index, 1);
      } else {
        this.localSelectedDocuments.push(docId);
      }
    },
    selectAllDocuments() {
      this.localSelectedDocuments = this.availableDocuments.map(d => d.id);
    },
    deselectAllDocuments() {
      this.localSelectedDocuments = [];
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
    },
    async copyFullPromptToClipboard() {
      try {
        let template = this.editedPromptContent || '';

        // Step 1: Parse and inject text blocks
        const { hasGeneric, tags } = parseTextBlockPlaceholders(template);
        console.log('[PromptEditInferenceModal] hasGeneric:', hasGeneric, 'tags:', tags);

        // Step 2: Load required text blocks
        const taggedBlocks = await textBlockCache.getByTags(tags);
        const validation = validateTextBlocks(tags, taggedBlocks);

        if (!validation.valid) {
          this.showToast(`Fehlende Textbausteine: ${validation.missingTags.join(', ')}`, { type: 'error' });
          console.log('[PromptEditInferenceModal] Missing text blocks:', validation.missingTags);
          return;
        }

        // Step 3: Get selected block for generic placeholder if needed
        let selectedBlock = null;
        if (hasGeneric) {
          const selectedTextBlockId = this.selectedTextBlocks[this.prompt.id];
          if (selectedTextBlockId) {
            selectedBlock = await textBlockCache.getById(selectedTextBlockId);
          }
          if (!selectedBlock && hasGeneric) {
            this.showToast('Bitte wählen Sie einen Textbaustein für {{textblock}} aus.', { type: 'error' });
            return;
          }
        }

        // Step 4: Inject text blocks into template
        template = injectTextBlocks(template, taggedBlocks, selectedBlock);

        // Step 5: Get anonymized text (only if {{anontext}} is present)
        const hasAnontext = template.includes('{{anontext}}');
        let exported = '';

        if (hasAnontext) {
          try {
            exported = localStorage.getItem('anon.currentOutputText') || '';
            if (!exported) {
              exported = localStorage.getItem('anon.lastExportText') || '';
            }
          } catch (e) {
            console.warn('Accessing localStorage failed:', e);
            this.showToast('Kein anonymisierter Text verfügbar.', { type: 'error' });
            return;
          }

          if (!exported) {
            this.showToast('Kein anonymisierter Text verfügbar. Bitte erstellen Sie zuerst einen anonymisierten Text.', { type: 'error' });
            return;
          }
        }

        // Step 6: Replace {{anontext}} placeholder (if present)
        let fullPrompt = hasAnontext ? template.replaceAll('{{anontext}}', exported) : template;

        // Step 7: Prepend context prefix if provided
        const contextPrefix = this.buildContextPrefix();
        if (contextPrefix && contextPrefix.trim()) {
          fullPrompt = contextPrefix + '\n\n---\n\n' + fullPrompt;
          console.log('[PromptEditInferenceModal] Context prefix added, length:', contextPrefix.length);
        }

        // Step 8: Copy to clipboard
        await navigator.clipboard.writeText(fullPrompt);

        const charCount = fullPrompt.length;
        const wordCount = fullPrompt.split(/\s+/).filter(w => w.length > 0).length;
        this.showToast(`Volltext in Zwischenablage kopiert\n${charCount.toLocaleString()} Zeichen · ${wordCount.toLocaleString()} Wörter`, { duration: 3000 });

        console.log('[PromptEditInferenceModal] Full prompt copied to clipboard, length:', charCount);
      } catch (err) {
        console.error('copyFullPromptToClipboard error:', err);
        this.showToast('Fehler beim Kopieren in die Zwischenablage.', { type: 'error', detail: String(err && (err.stack || err.message || err)) });
      }
    },
    async showFullPromptInTextarea() {
      try {
        let template = this.editedPromptContent || '';

        // Step 1: Parse and inject text blocks
        const { hasGeneric, tags } = parseTextBlockPlaceholders(template);
        console.log('[PromptEditInferenceModal] hasGeneric:', hasGeneric, 'tags:', tags);

        // Step 2: Load required text blocks
        const taggedBlocks = await textBlockCache.getByTags(tags);
        const validation = validateTextBlocks(tags, taggedBlocks);

        if (!validation.valid) {
          this.showToast(`Fehlende Textbausteine: ${validation.missingTags.join(', ')}`, { type: 'error' });
          console.log('[PromptEditInferenceModal] Missing text blocks:', validation.missingTags);
          return;
        }

        // Step 3: Get selected block for generic placeholder if needed
        let selectedBlock = null;
        if (hasGeneric) {
          const selectedTextBlockId = this.selectedTextBlocks[this.prompt.id];
          if (selectedTextBlockId) {
            selectedBlock = await textBlockCache.getById(selectedTextBlockId);
          }
          if (!selectedBlock && hasGeneric) {
            this.showToast('Bitte wählen Sie einen Textbaustein für {{textblock}} aus.', { type: 'error' });
            return;
          }
        }

        // Step 4: Inject text blocks into template
        template = injectTextBlocks(template, taggedBlocks, selectedBlock);

        // Step 5: Get anonymized text (only if {{anontext}} is present)
        const hasAnontext = template.includes('{{anontext}}');
        let exported = '';

        if (hasAnontext) {
          try {
            exported = localStorage.getItem('anon.currentOutputText') || '';
            if (!exported) {
              exported = localStorage.getItem('anon.lastExportText') || '';
            }
          } catch (e) {
            console.warn('Accessing localStorage failed:', e);
            this.showToast('Kein anonymisierter Text verfügbar.', { type: 'error' });
            return;
          }

          if (!exported) {
            this.showToast('Kein anonymisierter Text verfügbar. Bitte erstellen Sie zuerst einen anonymisierten Text.', { type: 'error' });
            return;
          }
        }

        // Step 6: Replace {{anontext}} placeholder (if present)
        let fullPrompt = hasAnontext ? template.replaceAll('{{anontext}}', exported) : template;

        // Step 7: Prepend context prefix if provided
        const contextPrefix = this.buildContextPrefix();
        if (contextPrefix && contextPrefix.trim()) {
          fullPrompt = contextPrefix + '\n\n---\n\n' + fullPrompt;
          console.log('[PromptEditInferenceModal] Context prefix added, length:', contextPrefix.length);
        }

        // Step 8: Show in textarea instead of copying
        this.editedPromptContent = fullPrompt;

        const charCount = fullPrompt.length;
        const wordCount = fullPrompt.split(/\s+/).filter(w => w.length > 0).length;
        this.showToast(`Volltext in Textarea angezeigt\n${charCount.toLocaleString()} Zeichen · ${wordCount.toLocaleString()} Wörter`, { duration: 3000 });

        console.log('[PromptEditInferenceModal] Full prompt shown in textarea, length:', charCount);
      } catch (err) {
        console.error('showFullPromptInTextarea error:', err);
        this.showToast('Fehler beim Anzeigen des Volltexts.', { type: 'error', detail: String(err && (err.stack || err.message || err)) });
      }
    }
  }
};
</script>
