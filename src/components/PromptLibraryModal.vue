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

      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-auto">
        <div v-for="p in filtered" :key="p.id" class="card bg-base-200 h-80">
          <div class="card-body p-3 gap-2 flex flex-col">
            <div class="flex items-center justify-between">
              <input class="input input-ghost input-sm font-semibold w-full" v-model="p.title" @change="save(p)"/>
              <button class="btn btn-ghost btn-xs shrink-0" @click="toggleFav(p)">{{ p.favorite ? '★' : '☆' }}</button>
            </div>
            <textarea class="textarea textarea-bordered textarea-sm flex-1 text-[0.9em] leading-[1]" v-model="p.content"
                      @change="save(p)"></textarea>
            <div class="flex gap-2 items-center">
              <input class="input input-bordered input-xs flex-1" placeholder="comma,separated,tags" :value="(p.tags || []).join(',')" @change="updateTags(p, $event.target.value)" />
              <button class="btn btn-xs btn-warning" @click="inferWithGemini(p)">Infer with Gemini</button>
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
          @click="onToastClick"
          role="button"
          :title="toastDetail ? 'Click to view details' : ''"
        >
          <span class="flex items-center">
            <span v-if="toastLoading" class="loading loading-spinner loading-xs mr-2" aria-hidden="true"></span>
            <span>{{ toastMessage }}<template v-if="toastDetail"> (click to view details)</template></span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import promptCache from '../utils/promptCache.js';

export default {
  name: 'PromptLibraryModal',
  emits: ['close', 'inferResult', 'toast'],
  data() {
    return { search: '', tag: '', favoritesOnly: false, list: [], loading: false, toastVisible: false, toastMessage: '', toastDetail: '', toastType: 'info', toastTimer: null, toastLoading: false };
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
    async save(p) { await promptCache.update(p.id, { title: p.title, content: p.content }); await this.refresh(); },
    async toggleFav(p) { await promptCache.update(p.id, { favorite: !p.favorite }); await this.refresh(); },
    async updateTags(p, csv) { const tags = csv.split(',').map(s => s.trim()).filter(Boolean); await promptCache.update(p.id, { tags }); await this.refresh(); },
    async createBlank() { await promptCache.create({ title: 'New prompt', content: '' }); await this.refresh(); },
    async dup(p) { await promptCache.create({ title: p.title + ' (copy)', content: p.content, tags: Array.isArray(p.tags) ? [...p.tags] : [], favorite: !!p.favorite }); await this.refresh(); },
    async del(p) { if (confirm('Delete this prompt?')) { await promptCache.remove(p.id); await this.refresh(); } },
    async inferWithGemini(p) {
      try {
        const template = (p.content || '').toString();
        if (!template.includes('{{anontext}}')) {
          this.showToast('Prompt requires {{anontext}} placeholder.');
          return;
        }
        // Prefer the live anonymized text currently shown in Anon.vue's output area
        this.showToast('Reading anonymized text…');
        let exported = '';
        let source = 'current';
        try {
          exported = localStorage.getItem('anon.currentOutputText') || '';
          if (!exported) {
            exported = localStorage.getItem('anon.lastExportText') || '';
            source = 'exported';
          }
        } catch (e) {
          console.warn('Accessing localStorage failed:', e);
          this.showToast('Cannot access anonymized text.', { type: 'error', detail: String(e && (e.stack || e.message || e)) });
          return;
        }
        if (!exported) {
          const lastAt = Number(localStorage.getItem('anon.currentUpdatedAt') || localStorage.getItem('anon.lastExportAt') || 0);
          const lastInfo = lastAt ? ` Last update at: ${new Date(lastAt).toLocaleString()}` : '';
          this.showToast('No anonymized text available. Please add text and entities under Anonymisieren first.', { type: 'error', detail: 'No current anonymized output found.' + lastInfo });
          return;
        }
        
        // Security check: ensure anonymization actually happened
        let entitiesCount = 0;
        let hasPlaceholderFlag = '';
        let exportMode = '';
        try {
          entitiesCount = Number(localStorage.getItem('anon.currentEntitiesCount') || localStorage.getItem('anon.lastExportEntitiesCount') || '0');
          hasPlaceholderFlag = String(localStorage.getItem('anon.currentHasPlaceholder') || localStorage.getItem('anon.lastExportHasPlaceholder') || '');
          exportMode = String(localStorage.getItem('anon.currentMode') || localStorage.getItem('anon.lastExportMode') || '');
        } catch (e) {
          // Non-fatal, we’ll still compute a direct regex check below
        }
        const hasPlaceholderByRegex = /\[\d+_[^\]]+\]/.test(exported);
        const hasPlaceholder = (hasPlaceholderFlag === 'true') || hasPlaceholderByRegex;

        if (entitiesCount <= 0 || !hasPlaceholder) {
          const details = [
            `entitiesCount=${entitiesCount}`,
            `hasPlaceholder(meta)=${hasPlaceholderFlag}`,
            `hasPlaceholder(regex)=${hasPlaceholderByRegex}`,
            exportMode ? `exportMode=${exportMode}` : null,
            `source=${source}`,
          ].filter(Boolean).join('\n');
          this.showToast('Inference blocked: text appears not anonymized.', {
            type: 'error',
            detail: `For safety, Gemini inference requires at least one entity and at least one anonymization placeholder in the anonymized text.\n\n${details}`,
          });
          return;
        }

        const promptText = template.replaceAll('{{anontext}}', exported);
        const apiKey = (localStorage.getItem('settings.geminiApiKey') || '').trim();
        if (!apiKey) {
          this.showToast('Gemini API key missing. Add it in Settings.');
          return;
        }
        this.showToast('Calling Gemini…', { duration: 0, loading: true });
        const responseText = await this.callGemini(promptText, apiKey);
        if (!responseText) {
          this.showToast('No response from Gemini.');
          return;
        }
        this.showToast('Gemini response received.');
        await promptCache.update(p.id, { uses: (p.uses||0) + 1, updatedAt: Date.now() });
        this.$emit('inferResult', responseText);
      } catch (err) {
        console.error('inferWithGemini error:', err);
        this.showToast('Error during inference.', { type: 'error', detail: String(err && (err.stack || err.message || err)) });
      }
    },
    async callGemini(text, apiKey) {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [ { parts: [ { text } ] } ]
        })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        console.warn('Gemini HTTP error', res.status, t);
        this.showToast(`Gemini error ${res.status}`);
        return '';
      }
      const data = await res.json().catch(() => ({}));
      const txt = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n') || '';
      return txt.trim();
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
    }
  }
};
</script>
