import promptCache from './promptCache.js';
import textBlockCache from './textBlockCache.js';
import { parseTextBlockPlaceholders, injectTextBlocks, validateTextBlocks } from './textBlockParser.js';
import notificationService from './notificationService.js';

/**
 * Shared service for Gemini inference - used by both PromptLibraryModal and Anon.vue
 */
export default {
  /**
   * Perform Gemini inference with a given prompt
   *
   * @param {Object} prompt - The prompt object with id, content, etc.
   * @param {Object} options - Options for the inference
   * @param {Function} options.showToast - Toast notification callback (msg, opts)
   * @param {Function} options.onResult - Callback when inference completes (responseText)
   * @param {Object} options.selectedTextBlocks - Map of promptId -> textBlockId for generic placeholders
   * @param {Array} options.textBlocks - Available text blocks (optional, will load if not provided)
   * @returns {Promise<string>} The Gemini response text
   */
  async inferWithPrompt(prompt, options = {}) {
    const {
      showToast = (msg) => console.log(msg),
      onResult = () => {},
      selectedTextBlocks = {},
      textBlocks = null
    } = options;

    try {
      let template = (prompt.content || '').toString();
      if (!template.includes('{{anontext}}')) {
        showToast('Prompt requires {{anontext}} placeholder.');
        return '';
      }

      // Step 1: Parse and validate text block placeholders
      const { hasGeneric, tags } = parseTextBlockPlaceholders(template);
      console.log('[GeminiInference] hasGeneric:', hasGeneric, 'tags:', tags);

      // Step 2: Validate generic placeholder has selection
      if (hasGeneric && !selectedTextBlocks[prompt.id]) {
        showToast('Please select a text block for {{textblock}} placeholder.', { type: 'error' });
        console.log('[GeminiInference] BLOCKED: Generic textblock placeholder requires selection');
        return '';
      }

      // Step 3: Load text blocks if not provided
      const availableTextBlocks = textBlocks || await textBlockCache.list();

      // Step 4: Pre-validate that all required text blocks exist BEFORE loading
      if (tags.length > 0) {
        const availableTags = new Set(
          availableTextBlocks
            .filter(tb => tb && tb.tag)
            .map(tb => tb.tag.toLowerCase())
        );

        const missingTags = tags.filter(tag => !availableTags.has(tag.toLowerCase()));

        if (missingTags.length > 0) {
          showToast(`Fehlende Text Blocks: ${missingTags.join(', ')}`, { type: 'error', duration: 5000 });
          console.log('[GeminiInference] BLOCKED: Missing text blocks:', missingTags);
          console.log('[GeminiInference] Available tags:', Array.from(availableTags));
          return '';
        }
        console.log('[GeminiInference] All required text blocks exist:', tags);
      }

      // Step 5: Load required text blocks
      const taggedBlocks = await textBlockCache.getByTags(tags);
      const validation = validateTextBlocks(tags, taggedBlocks);

      if (!validation.valid) {
        showToast(`Missing text blocks: ${validation.missingTags.join(', ')}`, { type: 'error' });
        console.log('[GeminiInference] BLOCKED: validateTextBlocks failed:', validation.missingTags);
        return '';
      }

      // Step 6: Get selected block for generic placeholder
      let selectedBlock = null;
      if (hasGeneric) {
        selectedBlock = await textBlockCache.getById(selectedTextBlocks[prompt.id]);
        if (!selectedBlock) {
          showToast('Selected text block not found.');
          return '';
        }
      }

      // Step 7: Inject text blocks into prompt
      template = injectTextBlocks(template, taggedBlocks, selectedBlock);

      // Step 8: Mark text blocks as used (don't await to avoid blocking)
      if (selectedBlock) {
        textBlockCache.markUsed(selectedBlock.id).catch(e => console.warn('Failed to mark text block as used:', e));
      }
      for (const block of taggedBlocks) {
        textBlockCache.markUsed(block.id).catch(e => console.warn('Failed to mark text block as used:', e));
      }

      // Step 9: Get anonymized text
      showToast('Reading anonymized text…');
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
        showToast('Cannot access anonymized text.', { type: 'error', detail: String(e && (e.stack || e.message || e)) });
        return '';
      }
      if (!exported) {
        const lastAt = Number(localStorage.getItem('anon.currentUpdatedAt') || localStorage.getItem('anon.lastExportAt') || 0);
        const lastInfo = lastAt ? ` Last update at: ${new Date(lastAt).toLocaleString()}` : '';
        showToast('No anonymized text available. Please add text and entities under Anonymisieren first.', { type: 'error', detail: 'No current anonymized output found.' + lastInfo });
        return '';
      }

      // Step 10: Security check - ensure anonymization actually happened
      let entitiesCount = 0;
      let hasPlaceholderFlag = '';
      let exportMode = '';
      try {
        entitiesCount = Number(localStorage.getItem('anon.currentEntitiesCount') || localStorage.getItem('anon.lastExportEntitiesCount') || '0');
        hasPlaceholderFlag = String(localStorage.getItem('anon.currentHasPlaceholder') || localStorage.getItem('anon.lastExportHasPlaceholder') || '');
        exportMode = String(localStorage.getItem('anon.currentMode') || localStorage.getItem('anon.lastExportMode') || '');
      } catch (e) {
        // Non-fatal, we'll still compute a direct regex check below
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
        showToast('Inference blocked: text appears not anonymized.', {
          type: 'error',
          detail: `For safety, Gemini inference requires at least one entity and at least one anonymization placeholder in the anonymized text.\n\n${details}`,
        });
        return '';
      }

      // Step 11: Check scroll review status (Restricted Mode feature)
      try {
        const reviewRequired = localStorage.getItem('anon.currentScrollReviewRequired') === 'true';
        const reviewCompleted = localStorage.getItem('anon.currentScrollReviewCompleted') === 'true';

        if (reviewRequired && !reviewCompleted) {
          showToast('Please review anonymized text by scrolling through it first.', {
            type: 'error',
            detail: 'For safety in Restricted Mode, you must review the entire anonymized text by scrolling through it before running prompts. This ensures you have verified all entities were correctly anonymized.'
          });
          return '';
        }
      } catch (e) {
        // Non-fatal, continue if localStorage access fails
        console.warn('Failed to check scroll review status:', e);
      }

      // Step 12: Build final prompt
      const promptText = template.replaceAll('{{anontext}}', exported);
      console.log('[GeminiInference] Final prompt length:', promptText.length);

      // Step 13: Check API key
      const apiKey = (localStorage.getItem('settings.geminiApiKey') || '').trim();
      if (!apiKey) {
        showToast('Gemini API key missing. Add it in Settings.');
        return '';
      }

      // Step 14: Call Gemini
      showToast('Calling Gemini…', { duration: 0, loading: true });
      const responseText = await this.callGemini(promptText, apiKey, showToast);
      console.log('[GeminiInference] Gemini response length:', responseText?.length || 0);

      if (!responseText) {
        showToast('No response from Gemini.');
        return '';
      }

      // Step 15: Update prompt usage
      showToast('Gemini response received.');
      await promptCache.update(prompt.id, { uses: (prompt.uses||0) + 1, updatedAt: Date.now() });

      // Step 16: Show notification when Gemini inference completes (only if window is in background)
      try {
        notificationService.notifyGeminiInferenceCompleteIfHidden(prompt.title || 'Prompt');
      } catch (e) {
        console.warn('Failed to show Gemini inference notification:', e);
      }

      // Step 17: Trigger callback
      onResult(responseText);

      return responseText;
    } catch (err) {
      console.error('inferWithPrompt error:', err);
      showToast('Error during inference.', { type: 'error', detail: String(err && (err.stack || err.message || err)) });
      return '';
    }
  },

  /**
   * Call Gemini API with streaming support
   */
  async callGemini(text, apiKey, showToast = () => {}) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [ { parts: [ { text } ] } ],
        generationConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: -1  // Dynamic thinking
          }
        }
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn('Gemini HTTP error', res.status, t);
      showToast(`Gemini error ${res.status}`, { type: 'error' });
      return '';
    }

    // Parse streaming response
    let thoughtsSummary = '';
    let finalAnswer = '';

    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Extract complete JSON objects by counting braces
        let braceCount = 0;
        let objectStart = -1;

        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];

          if (char === '{') {
            if (braceCount === 0) {
              objectStart = i;
            }
            braceCount++;
          } else if (char === '}') {
            braceCount--;

            if (braceCount === 0 && objectStart !== -1) {
              // We have a complete JSON object
              const jsonStr = buffer.substring(objectStart, i + 1);

              try {
                const chunk = JSON.parse(jsonStr);
                const parts = chunk?.candidates?.[0]?.content?.parts || [];

                for (const part of parts) {
                  if (!part.text) continue;

                  if (part.thought) {
                    // Thought summary → update toast
                    thoughtsSummary += part.text;
                    showToast('🧠 Thinking: ' + thoughtsSummary, { duration: 0, loading: true });
                  } else {
                    // Normal answer → accumulate (don't show yet)
                    finalAnswer += part.text;
                  }
                }
              } catch (parseErr) {
                console.warn('Failed to parse JSON object:', parseErr);
              }

              // Remove processed object from buffer
              buffer = buffer.substring(i + 1);
              i = -1; // Reset loop
              objectStart = -1;
            }
          }
        }
      }
    } catch (streamErr) {
      console.error('Stream reading error:', streamErr);
      showToast('Error reading stream', { type: 'error', detail: String(streamErr && (streamErr.stack || streamErr.message || streamErr)) });
      return '';
    }

    return finalAnswer.trim();
  },

  /**
   * Get the most recently used prompt
   */
  async getMostRecentPrompt() {
    const prompts = await promptCache.list();
    if (!prompts || prompts.length === 0) return null;

    // Prompts are already sorted by updatedAt DESC in promptCache.list()
    return prompts[0];
  }
};
