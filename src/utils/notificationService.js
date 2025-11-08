/**
 * NotificationService - Web Notifications for long-running async tasks
 *
 * Provides browser notifications when user has the window minimized or in background.
 * Supports user preferences stored in localStorage.
 */

class NotificationService {
  constructor() {
    this.permissionGranted = false;
    this.settings = this.loadSettings();
    this.checkPermission();
  }

  /**
   * Load notification settings from localStorage
   */
  loadSettings() {
    try {
      const enabled = localStorage.getItem('settings.notifications.enabled');
      const entityDetection = localStorage.getItem('settings.notifications.entityDetection');
      const geminiInference = localStorage.getItem('settings.notifications.geminiInference');

      return {
        enabled: enabled === null ? true : enabled === 'true', // Default: enabled
        entityDetection: entityDetection === null ? true : entityDetection === 'true', // Default: enabled
        geminiInference: geminiInference === null ? true : geminiInference === 'true', // Default: enabled
      };
    } catch (e) {
      console.warn('Failed to load notification settings:', e);
      return {
        enabled: true,
        entityDetection: true,
        geminiInference: true,
      };
    }
  }

  /**
   * Save notification settings to localStorage
   */
  saveSettings(settings) {
    try {
      this.settings = { ...this.settings, ...settings };
      localStorage.setItem('settings.notifications.enabled', String(this.settings.enabled));
      localStorage.setItem('settings.notifications.entityDetection', String(this.settings.entityDetection));
      localStorage.setItem('settings.notifications.geminiInference', String(this.settings.geminiInference));
    } catch (e) {
      console.warn('Failed to save notification settings:', e);
    }
  }

  /**
   * Check current notification permission status
   */
  checkPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      this.permissionGranted = false;
      return false;
    }

    this.permissionGranted = Notification.permission === 'granted';
    return this.permissionGranted;
  }

  /**
   * Request notification permission from user
   * @returns {Promise<boolean>} true if permission granted
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission was denied');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (e) {
      console.error('Failed to request notification permission:', e);
      return false;
    }
  }

  /**
   * Show a notification
   * @param {string} title - Notification title
   * @param {object} options - Notification options
   * @param {string} options.body - Notification message body
   * @param {string} options.icon - Icon URL (optional)
   * @param {string} options.tag - Tag to prevent duplicates (optional)
   * @param {boolean} options.requireInteraction - Keep notification until user dismisses (optional)
   * @returns {Notification|null} The notification instance or null
   */
  show(title, options = {}) {
    // Check if notifications are enabled globally
    if (!this.settings.enabled) {
      return null;
    }

    // Check if we have permission
    if (!this.permissionGranted) {
      console.log('Notification blocked: permission not granted');
      return null;
    }

    try {
      const notification = new Notification(title, {
        body: options.body || '',
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag || 'iusable-notification',
        requireInteraction: options.requireInteraction !== undefined ? options.requireInteraction : false,
        silent: options.silent || false,
      });

      // Optional: Handle notification click to focus window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (e) {
      console.error('Failed to show notification:', e);
      return null;
    }
  }

  /**
   * Show notification for completed entity detection
   * @param {number} entityCount - Number of entities detected
   */
  notifyEntityDetectionComplete(entityCount) {
    if (!this.settings.entityDetection) {
      return null;
    }

    const title = 'Entitätserkennung abgeschlossen';
    const body = entityCount > 0
      ? `${entityCount} Entitäten wurden erkannt und sind bereit zur Anonymisierung.`
      : 'Keine Entitäten gefunden.';

    return this.show(title, {
      body,
      tag: 'entity-detection',
      requireInteraction: false,
    });
  }

  /**
   * Show notification for completed Gemini inference
   * @param {string} promptTitle - Title of the prompt that was run
   */
  notifyGeminiInferenceComplete(promptTitle) {
    if (!this.settings.geminiInference) {
      return null;
    }

    const title = 'Gemini Inferenz abgeschlossen';
    const body = promptTitle
      ? `Prompt "${promptTitle}" wurde erfolgreich ausgeführt.`
      : 'Die Gemini-Inferenz wurde erfolgreich abgeschlossen.';

    return this.show(title, {
      body,
      tag: 'gemini-inference',
      requireInteraction: false,
    });
  }

  /**
   * Check if browser tab/window is currently visible
   * @returns {boolean} true if document is visible
   */
  isDocumentVisible() {
    return !document.hidden;
  }

  /**
   * Only show notification if document is hidden (user is away)
   * This prevents showing notifications when user is actively using the app
   */
  showIfHidden(title, options) {
    if (this.isDocumentVisible()) {
      // User is actively viewing the app, no need for notification
      return null;
    }
    return this.show(title, options);
  }

  /**
   * Notify entity detection complete, only if user has window in background
   */
  notifyEntityDetectionCompleteIfHidden(entityCount) {
    if (!this.settings.entityDetection || this.isDocumentVisible()) {
      return null;
    }
    return this.notifyEntityDetectionComplete(entityCount);
  }

  /**
   * Notify Gemini inference complete, only if user has window in background
   */
  notifyGeminiInferenceCompleteIfHidden(promptTitle) {
    if (!this.settings.geminiInference || this.isDocumentVisible()) {
      return null;
    }
    return this.notifyGeminiInferenceComplete(promptTitle);
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
