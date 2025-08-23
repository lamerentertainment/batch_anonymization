<script setup>
import Anon from './components/Anon.vue';
</script>

<template>
  <div class="min-h-screen bg-base-200 flex flex-col items-center justify-center">
    <div class="w-full max-w-6xl p-6">
      <div class="bg-base-100 shadow-md rounded-lg">
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
