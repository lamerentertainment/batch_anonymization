import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { initConnection } from './net/connection.js';
import { removeLegacyStorage } from './legacyCleanup.js';

createApp(App).mount('#app');
initConnection();
removeLegacyStorage();
