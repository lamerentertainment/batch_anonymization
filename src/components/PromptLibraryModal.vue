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

      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-auto">
        <div v-for="p in filtered" :key="p.id" class="card bg-base-200">
          <div class="card-body p-3 gap-2">
            <div class="flex items-center justify-between">
              <input class="input input-ghost input-sm font-semibold" v-model="p.title" @change="save(p)" />
              <button class="btn btn-ghost btn-xs" @click="toggleFav(p)">{{ p.favorite ? '★' : '☆' }}</button>
            </div>
            <textarea class="textarea textarea-bordered textarea-sm min-h-24" v-model="p.content" @change="save(p)"></textarea>
            <div class="flex gap-2 items-center">
              <input class="input input-bordered input-xs flex-1" placeholder="comma,separated,tags" :value="p.tags.join(',')" @change="updateTags(p, $event.target.value)" />
              <button class="btn btn-xs" @click="insert(p)">Insert</button>
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
    </div>
  </div>
</template>

<script>
import promptCache from '../utils/promptCache.js';

export default {
  name: 'PromptLibraryModal',
  emits: ['close', 'insert'],
  data() {
    return { search: '', tag: '', favoritesOnly: false, list: [], loading: false };
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
    async refresh() { this.loading = true; this.list = await promptCache.list(); this.loading = false; },
    async save(p) { await promptCache.update(p.id, { title: p.title, content: p.content }); await this.refresh(); },
    async toggleFav(p) { await promptCache.update(p.id, { favorite: !p.favorite }); await this.refresh(); },
    async updateTags(p, csv) { const tags = csv.split(',').map(s => s.trim()).filter(Boolean); await promptCache.update(p.id, { tags }); await this.refresh(); },
    async createBlank() { await promptCache.create({ title: 'New prompt', content: '' }); await this.refresh(); },
    async dup(p) { await promptCache.create({ title: p.title + ' (copy)', content: p.content, tags: p.tags, favorite: p.favorite }); await this.refresh(); },
    async del(p) { if (confirm('Delete this prompt?')) { await promptCache.remove(p.id); await this.refresh(); } },
    async insert(p) { await promptCache.update(p.id, { uses: (p.uses||0) + 1, updatedAt: Date.now() }); this.$emit('insert', p.content); },
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
