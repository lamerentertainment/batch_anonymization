# Restricted Mode - Deployment Guide

## Overview

The application includes a **Restricted Mode** feature that provides low-level security for honest, non-technical users. When active, it prevents:

- **Copying** anonymized text in Anonymize mode
- **Pasting** text in Reverse/Pseudonymize mode

This is a **policy enforcement** feature, not cryptographic security. It can be bypassed by technical users with browser DevTools knowledge.

---

## Setup Instructions

### 1. Generate Master Password Hash

Before deployment, you need to generate a secure hash for the master password:

```bash
# Navigate to project directory
cd /path/to/iusable_anonymization

# Run the hash generator
node scripts/generate-password-hash.js
```

You will be prompted to:
1. Enter a master password (minimum 8 characters)
2. Confirm the password

**Example output:**
```
=== Master Password Hash Generator ===

Enter Master Password: ********
Confirm Master Password: ********

✅ Hash generated successfully!

=== ADD THESE TO .env.local ===

VITE_MASTER_PASSWORD_HASH=a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4...
VITE_MASTER_PASSWORD_SALT=12345678-abcd-1234-abcd-123456789abc

================================

⚠️  Keep these values secret and do NOT commit them to Git!
```

---

### 2. Create `.env.local` File

Create a `.env.local` file in the project root (this file is already in `.gitignore`):

```bash
# Copy the template
cp .env.example .env.local

# Edit with your generated values
nano .env.local
```

Add the generated hash, salt, and session token:

```bash
VITE_MASTER_PASSWORD_HASH=a3f5b8c9d2e1f4a7b6c5d8e9f1a2b3c4...
VITE_MASTER_PASSWORD_SALT=12345678-abcd-1234-abcd-123456789abc
VITE_SESSION_TOKEN=f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6...
```

**⚠️ IMPORTANT:**
- **Never commit** `.env.local` to Git
- Keep these values **secret**
- Store the master password in a secure password manager

---

### 3. Build and Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy the 'dist' folder
# The hash and salt are now embedded in the build
```

The environment variables are baked into the build at compile time via Vite's `import.meta.env`.

---

## User Experience

### Default State: Restricted Mode 🔒

When users first open the application:
- **Restricted Mode** is active by default
- Copying anonymized text is **blocked**
- Pasting in reverse mode is **blocked**
- Users see 🔒 icons on disabled buttons

### Unlocking: Unrestricted Mode 🔓

To unlock:
1. User opens **Settings** (⚙️ icon)
2. Scrolls to **🔒 Security Settings**
3. Enters the **Master Password**
4. Clicks **Unlock**

Once unlocked:
- The state is saved in `localStorage`
- Remains active even after page reload
- User can re-lock anytime from Settings

---

## Technical Details

### Files Created/Modified

**New Files:**
- `scripts/generate-password-hash.js` - Password hash generator
- `src/utils/securityManager.js` - Security state manager
- `.env.example` - Environment variable template
- `RESTRICTED_MODE_README.md` - This file

**Modified Files:**
- `src/components/Anon.vue` - Added security UI and logic

### How It Works

1. **Master Password:** Set by deployer at build time
2. **Hash Storage:** SHA-256 hash stored in environment variables
3. **Session Token:** Unique token generated with each password change
4. **State Management:** Restricted/Unrestricted state + session token in `localStorage`
5. **Session Validation:** On every page load, the stored session token is compared with the current deployed token:
   - If tokens match → session remains valid → user stays unrestricted
   - If tokens don't match → session is invalid → user reverts to restricted mode
6. **Blocking Mechanisms:**
   - Copy button disabled when restricted
   - Paste button disabled when restricted
   - Keyboard shortcuts (Ctrl/Cmd+C, Ctrl/Cmd+V) intercepted
   - Clipboard API calls blocked programmatically

### Security Level

✅ **Protects against:**
- Accidental copy/paste
- Honest, non-technical users
- Quick copy-paste by casual observers

❌ **Does NOT protect against:**
- Browser DevTools manipulation
- Screenshot tools
- Code modification
- Technical users with JavaScript knowledge

**This is intended as a "policy reminder" feature, not cryptographic security.**

---

## Changing the Master Password

To change the master password after deployment:

1. Generate a new hash and session token (step 1 above)
2. Update `.env.local` with new values (hash, salt, **AND session token**)
3. Rebuild: `npm run build`
4. Redeploy

**What happens to users:**
- All **existing browser sessions become invalid** (session token no longer matches)
- Users are automatically reverted to **Restricted Mode** on their next page visit
- Users must enter the **new password** to unlock again
- This ensures complete session invalidation across all browsers when password changes

---

## Troubleshooting

### "Master password not configured" error

**Cause:** Environment variables not set correctly.

**Solution:**
1. Check `.env.local` exists in project root
2. Verify **all three variables** are set: `VITE_MASTER_PASSWORD_HASH`, `VITE_MASTER_PASSWORD_SALT`, `VITE_SESSION_TOKEN`
3. Verify variables start with `VITE_` prefix
4. Rebuild: `npm run build`

### Session becomes invalid after deployment

**Cause:** Session token in `.env.local` was changed (password update).

**Solution:**
- This is **expected behavior** when the password is changed
- Users will see **Restricted Mode** activated
- Users need to enter the **new password** to unlock
- All previous sessions are intentionally invalidated for security

### Users can still copy/paste

**Cause:** They may have unlocked the mode, or are using browser DevTools.

**Solution:**
- This is expected behavior for unlocked users
- For DevTools bypass: This is a limitation of browser-based security

### Password not working

**Cause:** Hash mismatch or incorrect password.

**Solution:**
1. Verify you're using the correct password
2. Regenerate hash if needed
3. Check browser console for error messages

---

## FAQ

**Q: Can users change the master password?**
A: No, only the deployer can set/change it at build time.

**Q: Is this GDPR/HIPAA compliant security?**
A: No, this is a UI-level restriction for policy enforcement only.

**Q: What happens if user clears localStorage?**
A: Restricted Mode becomes active again (default state). The session token is also cleared.

**Q: What happens when I change the password?**
A: All existing user sessions become invalid. Users will see Restricted Mode activated and need to enter the new password to unlock. This happens automatically on their next page visit thanks to session token validation.

**Q: Can I disable Restricted Mode entirely?**
A: Yes, simply don't set the environment variables. The app will still work, and restrictions won't apply.

---

## Support

For issues or questions about Restricted Mode:
1. Check browser console for error messages
2. Verify environment variables are set correctly
3. Ensure you're using the correct master password

---

**Last Updated:** 2024
**Version:** 1.0
