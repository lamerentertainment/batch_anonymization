<script setup>
import Anon from './components/Anon.vue';
</script>

<template>
  <div class="min-h-screen bg-base-200 flex flex-col">
    <div class="w-full p-0">
      <div class="bg-base-100 shadow-md rounded-none">
        <anon :value="''" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  margin-bottom: 1rem;
}
</style>
