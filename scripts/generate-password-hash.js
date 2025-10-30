#!/usr/bin/env node

/**
 * Master Password Hash Generator
 *
 * This script generates a SHA-256 hash for the master password
 * to be used in the application's restricted mode.
 *
 * Usage:
 *   node scripts/generate-password-hash.js
 *
 * The output should be added to your .env.local file:
 *   VITE_MASTER_PASSWORD_HASH=...
 *   VITE_MASTER_PASSWORD_SALT=...
 */

import crypto from 'crypto';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askPassword() {
  return new Promise((resolve) => {
    rl.question('Enter Master Password: ', (password) => {
      resolve(password);
    });
  });
}

function askConfirmPassword() {
  return new Promise((resolve) => {
    rl.question('Confirm Master Password: ', (password) => {
      rl.close();
      resolve(password);
    });
  });
}

async function generateHash(password, salt) {
  return new Promise((resolve, reject) => {
    // Use Node.js crypto for SHA-256
    const hash = crypto.createHash('sha256');
    hash.update(password + salt);
    resolve(hash.digest('hex'));
  });
}

(async () => {
  console.log('\n=== Master Password Hash Generator ===\n');
  console.log('This will generate a hash for your deployment master password.');
  console.log('The password will be used to unlock restricted mode.\n');

  const password = await askPassword();
  const confirmPassword = await askConfirmPassword();

  if (password !== confirmPassword) {
    console.error('\n❌ Passwords do not match. Please try again.\n');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n❌ Password must be at least 8 characters long.\n');
    process.exit(1);
  }

  const salt = crypto.randomUUID();
  const hash = await generateHash(password, salt);

  console.log('\n✅ Hash generated successfully!\n');
  console.log('=== ADD THESE TO .env.local ===\n');
  console.log(`VITE_MASTER_PASSWORD_HASH=${hash}`);
  console.log(`VITE_MASTER_PASSWORD_SALT=${salt}`);
  console.log('\n================================\n');
  console.log('⚠️  Keep these values secret and do NOT commit them to Git!\n');
})();
