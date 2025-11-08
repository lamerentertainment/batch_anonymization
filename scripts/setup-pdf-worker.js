#!/usr/bin/env node

/**
 * Setup script to copy PDF.js worker for offline functionality
 * This ensures the application can work completely offline
 */

import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const SOURCE = join(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const DEST = join(projectRoot, 'public/pdf.worker.min.mjs');

async function setupWorker() {
  console.log('📦 Setting up PDF.js worker for offline functionality...');

  if (!existsSync(SOURCE)) {
    console.warn('⚠️  Warning: pdfjs-dist not found in node_modules.');
    console.warn('   Run "npm install" first, or the app will use CDN fallback.');
    process.exit(0); // Exit gracefully, not an error
  }

  try {
    await copyFile(SOURCE, DEST);
    console.log('✅ PDF.js worker copied to public/pdf.worker.min.mjs');
    console.log('   Application will now work completely offline!');
  } catch (error) {
    console.error('❌ Error copying PDF.js worker:', error.message);
    process.exit(1);
  }
}

setupWorker();
