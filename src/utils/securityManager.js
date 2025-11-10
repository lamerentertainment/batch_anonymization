/**
 * Security Manager
 *
 * Manages the restricted/unrestricted mode for the application.
 * The master password is set at deployment time via environment variables.
 * Users can unlock restricted mode by entering the master password.
 */

const SECURITY_KEY = 'security.isUnrestricted';
const SESSION_TOKEN_KEY = 'security.sessionToken';
const MASTER_HASH = import.meta.env.VITE_MASTER_PASSWORD_HASH;
const SALT = import.meta.env.VITE_MASTER_PASSWORD_SALT;
const CURRENT_SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;

class SecurityManager {
  /**
   * Hash a password with the configured salt using SHA-256
   * @param {string} password - The password to hash
   * @returns {Promise<string>} The hex-encoded hash
   */
  async hashPassword(password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + SALT);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('Failed to hash password:', error);
      throw error;
    }
  }

  /**
   * Verify if a password matches the master password
   * @param {string} password - The password to verify
   * @returns {Promise<boolean>} True if password is correct
   */
  async verifyPassword(password) {
    if (!MASTER_HASH || !SALT) {
      console.error('Master password not configured! Set VITE_MASTER_PASSWORD_HASH and VITE_MASTER_PASSWORD_SALT in .env.local');
      return false;
    }

    if (!password || typeof password !== 'string') {
      return false;
    }

    try {
      const hash = await this.hashPassword(password);
      return hash === MASTER_HASH;
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Validate the current session token against stored token
   * This ensures that old sessions are invalidated when password is changed
   * @returns {boolean} True if session token is valid
   */
  isSessionValid() {
    try {
      const storedToken = localStorage.getItem(SESSION_TOKEN_KEY);

      // If no token stored or current token not configured, session is invalid
      if (!storedToken || !CURRENT_SESSION_TOKEN) {
        return false;
      }

      // Token must match exactly
      return storedToken === CURRENT_SESSION_TOKEN;
    } catch (error) {
      console.warn('Failed to validate session token:', error);
      return false;
    }
  }

  /**
   * Check if the app is currently in unrestricted mode
   * @returns {boolean} True if unrestricted mode is active
   */
  isUnrestricted() {
    try {
      const value = localStorage.getItem(SECURITY_KEY);

      // Only unrestricted if flag is true AND session token is valid
      if (value === 'true') {
        return this.isSessionValid();
      }

      return false;
    } catch (error) {
      console.warn('Failed to read security state from localStorage:', error);
      return false;
    }
  }

  /**
   * Set the unrestricted mode state
   * @param {boolean} value - Whether unrestricted mode should be active
   */
  setUnrestricted(value) {
    try {
      localStorage.setItem(SECURITY_KEY, value ? 'true' : 'false');

      // When unlocking, also store the current session token
      if (value && CURRENT_SESSION_TOKEN) {
        localStorage.setItem(SESSION_TOKEN_KEY, CURRENT_SESSION_TOKEN);
      } else {
        // When locking, clear the session token
        localStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch (error) {
      console.error('Failed to save security state to localStorage:', error);
    }
  }

  /**
   * Lock the application (activate restricted mode)
   */
  lock() {
    this.setUnrestricted(false);
  }

  /**
   * Attempt to unlock the application with a password
   * @param {string} password - The password to try
   * @returns {Promise<boolean>} True if unlock was successful
   */
  async unlock(password) {
    const valid = await this.verifyPassword(password);
    if (valid) {
      this.setUnrestricted(true);
      return true;
    }
    return false;
  }

  /**
   * Check if master password is configured
   * @returns {boolean} True if master password is set
   */
  isConfigured() {
    return !!(MASTER_HASH && SALT && CURRENT_SESSION_TOKEN);
  }
}

export default new SecurityManager();
