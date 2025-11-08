<template>
  <div class="modal modal-open">
    <div class="modal-box w-11/12 max-w-6xl h-[85vh] flex flex-col">
      <h3 class="font-bold text-lg">Text Block Library</h3>

      <div class="mt-4 flex gap-2 items-center">
        <input v-model="search" class="input input-bordered input-sm flex-1" placeholder="Search tag/description/content" />
        <input v-model="tagFilter" class="input input-bordered input-sm w-40" placeholder="#tag" />
        <label class="cursor-pointer label gap-2">
          <span class="label-text">Favs</span>
          <input type="checkbox" class="toggle" v-model="favoritesOnly" />
        </label>
      </div>

      <div class="mt-2 text-sm text-base-content/70">
        Textbausteine können in Prompts mit <code v-pre>{{textblock}}</code> (manuell auswählbar) oder
        <code v-pre>{{textblock:'tag-name'}}</code> (automatisch) eingefügt werden.
      </div>

      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-auto">
        <div v-for="b in filtered" :key="b.id" class="card bg-base-200 h-80">
          <div class="card-body p-3 gap-2 flex flex-col">
            <div class="flex items-center justify-between gap-2">
              <input
                class="input input-ghost input-sm font-semibold flex-1 font-mono"
                v-model="b.tag"
                @change="save(b)"
                placeholder="unique-tag"
                :class="{ 'input-error': tagErrors[b.id] }"
              />
              <button class="btn btn-ghost btn-xs shrink-0" @click="toggleFav(b)">{{ b.favorite ? '★' : '☆' }}</button>
            </div>
            <div v-if="tagErrors[b.id]" class="text-xs text-error">{{ tagErrors[b.id] }}</div>

            <input
              class="input input-bordered input-sm text-sm"
              v-model="b.description"
              @change="save(b)"
              placeholder="Brief description"
            />

            <textarea
              class="textarea textarea-bordered textarea-sm flex-1 text-[0.9em] leading-[1.3]"
              v-model="b.content"
              @change="save(b)"
              placeholder="Text block content..."
            ></textarea>

            <div class="flex gap-2 items-center">
              <button class="btn btn-xs btn-outline" @click="copyTag(b)">Copy Tag</button>
              <button class="btn btn-xs btn-outline" @click="dup(b)">Duplicate</button>
              <button class="btn btn-xs btn-error" @click="del(b)">Delete</button>
            </div>
            <div class="text-xs opacity-60">Updated: {{ new Date(b.updatedAt).toLocaleString() }} · Uses: {{ b.uses||0 }}</div>
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <button class="btn btn-sm" @click="createBlank">New Text Block</button>
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
            toastType === 'error' ? 'alert-error' : 'alert-info'
          ]"
          :style="{
            maxWidth: '90vw',
            width: '600px'
          }"
        >
          <span class="whitespace-pre-wrap break-words font-mono text-sm flex-1">{{ toastMessage }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import textBlockCache from '../utils/textBlockCache.js';

export default {
  name: 'TextBlockLibraryModal',
  emits: ['close'],
  data() {
    return {
      search: '',
      tagFilter: '',
      favoritesOnly: false,
      list: [],
      loading: false,
      toastVisible: false,
      toastMessage: '',
      toastType: 'info',
      toastTimer: null,
      tagErrors: {}
    };
  },
  computed: {
    filtered() {
      const q = this.search.trim().toLowerCase();
      const tag = this.tagFilter.trim().toLowerCase();
      return this.list.filter(b =>
        (!this.favoritesOnly || b.favorite) &&
        (!tag || b.tag?.toLowerCase().includes(tag)) &&
        (!q || b.tag?.toLowerCase().includes(q) || b.description?.toLowerCase().includes(q) || b.content?.toLowerCase().includes(q))
      );
    }
  },
  async mounted() {
    await this.refresh();
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
    async refresh() {
      this.loading = true;
      this.list = await textBlockCache.list();
      this.loading = false;
    },
    async save(b) {
      try {
        // Clear previous error for this block (Vue 3 way)
        delete this.tagErrors[b.id];

        await textBlockCache.update(b.id, {
          tag: b.tag,
          description: b.description,
          content: b.content
        });
        await this.refresh();
        this.showToast('Saved');
      } catch (err) {
        console.error('Save error:', err);
        // Set error in Vue 3 reactive way
        this.tagErrors[b.id] = err.message || 'Save failed';
        this.showToast(err.message || 'Save failed', { type: 'error' });
        await this.refresh(); // Refresh to revert invalid changes
      }
    },
    async toggleFav(b) {
      await textBlockCache.update(b.id, { favorite: !b.favorite });
      await this.refresh();
    },
    async createBlank() {
      try {
        // Try to create with simple 'new-block' tag first
        // If it fails due to duplicate, add a small suffix
        let tag = 'new-block';
        let created = false;
        let attempts = 0;

        while (!created && attempts < 100) {
          try {
            await textBlockCache.create({
              tag: tag,
              description: '',
              content: ''
            });
            created = true;
          } catch (err) {
            if (err.message && err.message.includes('already exists')) {
              attempts++;
              tag = `new-block-${attempts}`;
            } else {
              throw err;
            }
          }
        }

        await this.refresh();
      } catch (err) {
        this.showToast(err.message || 'Create failed', { type: 'error' });
      }
    },
    async dup(b) {
      try {
        const timestamp = Date.now().toString(36);
        await textBlockCache.create({
          tag: `${b.tag}-copy-${timestamp}`,
          description: b.description,
          content: b.content,
          favorite: !!b.favorite
        });
        await this.refresh();
      } catch (err) {
        this.showToast(err.message || 'Duplicate failed', { type: 'error' });
      }
    },
    async del(b) {
      if (confirm(`Delete text block "${b.tag}"?`)) {
        await textBlockCache.remove(b.id);
        await this.refresh();
      }
    },
    async copyTag(b) {
      try {
        const placeholder = `{{textblock:'${b.tag}'}}`;
        await navigator.clipboard.writeText(placeholder);
        this.showToast(`Copied: ${placeholder}`);
      } catch (e) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = `{{textblock:'${b.tag}'}}`;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          this.showToast(`Copied: {{textblock:'${b.tag}'}}`);
        } catch (err) {
          this.showToast('Copy failed', { type: 'error' });
        }
        document.body.removeChild(textarea);
      }
    },
    async exportAll() {
      const list = await textBlockCache.export();
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'text-block-library.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    async importFile(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const list = JSON.parse(text);
        const count = await textBlockCache.import(list);
        this.showToast(`Imported ${count} text blocks`);
        await this.refresh();
      } catch (err) {
        this.showToast(err.message || 'Import failed', { type: 'error', duration: 5000 });
      }
    }
  }
};
</script>
