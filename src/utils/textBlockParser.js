/**
 * Parser and injection utilities for text block placeholders in prompts
 *
 * Supported formats:
 * - {{textblock}} - Generic placeholder, requires manual selection
 * - {{textblock:'tag-name'}} - Auto-inject text block with specific tag
 */

/**
 * Parse a prompt text for text block placeholders
 * @param {string} promptText - The prompt template to parse
 * @returns {object} - { hasGeneric: boolean, tags: string[] }
 */
export function parseTextBlockPlaceholders(promptText) {
  if (!promptText || typeof promptText !== 'string') {
    return { hasGeneric: false, tags: [] };
  }

  // Check for generic {{textblock}} placeholder
  const hasGeneric = /\{\{textblock\}\}/i.test(promptText);

  // Extract all tagged placeholders: {{textblock:'tag-name'}}
  const tagPattern = /\{\{textblock:\s*['"]([^'"]+)['"]\s*\}\}/gi;
  const tags = [];
  let match;

  while ((match = tagPattern.exec(promptText)) !== null) {
    const tag = match[1].trim();
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return { hasGeneric, tags };
}

/**
 * Inject text blocks into a prompt template
 * @param {string} promptText - The prompt template
 * @param {array} textBlocks - Array of text block objects from textBlockCache
 * @param {object|null} selectedBlock - The manually selected block for {{textblock}} (optional)
 * @returns {string} - Processed prompt with text blocks injected
 */
export function injectTextBlocks(promptText, textBlocks = [], selectedBlock = null) {
  if (!promptText || typeof promptText !== 'string') {
    return promptText || '';
  }

  let result = promptText;

  // 1. Replace generic {{textblock}} with selected block
  if (selectedBlock && selectedBlock.content) {
    result = result.replace(/\{\{textblock\}\}/gi, selectedBlock.content);
  }

  // 2. Replace tagged {{textblock:'tag-name'}} with corresponding blocks
  if (Array.isArray(textBlocks) && textBlocks.length > 0) {
    // Create a map for quick lookup
    const blockMap = {};
    textBlocks.forEach(block => {
      if (block && block.tag) {
        blockMap[block.tag.toLowerCase()] = block;
      }
    });

    // Replace each tagged placeholder
    result = result.replace(
      /\{\{textblock:\s*['"]([^'"]+)['"]\s*\}\}/gi,
      (match, tag) => {
        const normalizedTag = tag.trim().toLowerCase();
        const block = blockMap[normalizedTag];
        return block ? block.content : match; // Keep placeholder if block not found
      }
    );
  }

  return result;
}

/**
 * Validate that all required text blocks exist
 * @param {array} requiredTags - Array of tag names that are required
 * @param {array} availableBlocks - Array of text block objects from textBlockCache
 * @returns {object} - { valid: boolean, missingTags: string[] }
 */
export function validateTextBlocks(requiredTags = [], availableBlocks = []) {
  if (!Array.isArray(requiredTags) || requiredTags.length === 0) {
    return { valid: true, missingTags: [] };
  }

  const availableTags = new Set(
    availableBlocks
      .filter(b => b && b.tag)
      .map(b => b.tag.toLowerCase())
  );

  const missingTags = requiredTags.filter(
    tag => !availableTags.has(tag.toLowerCase())
  );

  return {
    valid: missingTags.length === 0,
    missingTags
  };
}

/**
 * Check if a text block content contains circular references
 * (prevents text blocks from containing {{textblock}} placeholders)
 * @param {string} content - Text block content to check
 * @returns {boolean} - true if circular reference detected
 */
export function hasCircularReference(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }
  return /\{\{textblock[:\}]/i.test(content);
}
