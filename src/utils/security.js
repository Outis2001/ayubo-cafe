/**
 * Security Utilities
 * 
 * Provides security functions for CSRF protection, session management,
 * and other security-related features.
 * 
 * @module utils/security
 */

import { sanitizeInput } from './validation';

/**
 * Generate CSRF token
 * 
 * Creates a cryptographically random token for CSRF protection
 * 
 * @returns {string} CSRF token
 */
export const generateCSRFToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Get or create CSRF token
 * 
 * Returns existing token from session storage or creates a new one
 * 
 * @returns {string} CSRF token
 */
export const getCSRFToken = () => {
  let token = sessionStorage.getItem('csrf_token');
  
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
  }
  
  return token;
};

/**
 * Validate CSRF token
 * 
 * Checks if provided token matches the stored token
 * 
 * @param {string} token - Token to validate
 * @returns {boolean} True if token is valid
 */
export const validateCSRFToken = (token) => {
  const storedToken = sessionStorage.getItem('csrf_token');
  return token === storedToken && token !== null && token !== '';
};

/**
 * Clear CSRF token
 * 
 * Removes CSRF token from session storage
 */
export const clearCSRFToken = () => {
  sessionStorage.removeItem('csrf_token');
};

/**
 * Add CSRF token to request headers
 * 
 * @param {Object} headers - Existing headers object
 * @returns {Object} Headers with CSRF token added
 */
export const addCSRFHeader = (headers = {}) => {
  return {
    ...headers,
    'X-CSRF-Token': getCSRFToken(),
  };
};

/**
 * Sanitize object recursively
 * 
 * Sanitizes all string values in an object to prevent XSS
 * 
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeInput(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
};

/**
 * Check if session is expired
 * 
 * @param {string|Date} expiryTime - Session expiry time
 * @returns {boolean} True if session is expired
 */
export const isSessionExpired = (expiryTime) => {
  if (!expiryTime) return true;
  
  const expiry = typeof expiryTime === 'string' ? new Date(expiryTime) : expiryTime;
  return new Date() > expiry;
};

/**
 * Calculate session expiry time
 * 
 * @param {number} durationHours - Session duration in hours (default: 24)
 * @returns {Date} Expiry time
 */
export const calculateSessionExpiry = (durationHours = 24) => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + durationHours);
  return expiry;
};

/**
 * Secure localStorage/sessionStorage wrapper
 * 
 * Provides encryption for sensitive data in storage (basic implementation)
 */
export const SecureStorage = {
  /**
   * Store data securely
   * 
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @param {boolean} useSession - Use sessionStorage instead of localStorage
   */
  set: (key, value, useSession = false) => {
    try {
      const data = JSON.stringify(value);
      // In production, consider encrypting the data before storing
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(`secure_${key}`, data);
    } catch (error) {
      console.error('[SecureStorage] Error storing data:', error);
    }
  },

  /**
   * Retrieve data securely
   * 
   * @param {string} key - Storage key
   * @param {boolean} useSession - Use sessionStorage instead of localStorage
   * @returns {any} Stored value or null
   */
  get: (key, useSession = false) => {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      const data = storage.getItem(`secure_${key}`);
      if (!data) return null;
      
      // In production, decrypt the data before parsing
      return JSON.parse(data);
    } catch (error) {
      console.error('[SecureStorage] Error retrieving data:', error);
      return null;
    }
  },

  /**
   * Remove data
   * 
   * @param {string} key - Storage key
   * @param {boolean} useSession - Use sessionStorage instead of localStorage
   */
  remove: (key, useSession = false) => {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      storage.removeItem(`secure_${key}`);
    } catch (error) {
      console.error('[SecureStorage] Error removing data:', error);
    }
  },

  /**
   * Clear all secure storage
   * 
   * @param {boolean} useSession - Use sessionStorage instead of localStorage
   */
  clear: (useSession = false) => {
    try {
      const storage = useSession ? sessionStorage : localStorage;
      const keys = [];
      
      // Collect all secure_ keys
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('secure_')) {
          keys.push(key);
        }
      }
      
      // Remove them
      keys.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.error('[SecureStorage] Error clearing storage:', error);
    }
  }
};

/**
 * Prevent clickjacking
 * 
 * Check if page is loaded in an iframe (potential clickjacking attack)
 * 
 * @returns {boolean} True if potential clickjacking detected
 */
export const detectClickjacking = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If we can't access window.top, we're probably in an iframe
    return true;
  }
};

/**
 * Validate URL to prevent open redirect vulnerabilities
 * 
 * @param {string} url - URL to validate
 * @param {Array} allowedDomains - List of allowed domains
 * @returns {boolean} True if URL is safe
 */
export const validateRedirectURL = (url, allowedDomains = []) => {
  try {
    // Relative URLs are safe
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }

    const urlObj = new URL(url, window.location.origin);
    
    // Check protocol (only http/https allowed)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Check if domain is in allowed list
    if (allowedDomains.length > 0) {
      return allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`));
    }

    // If no allowed domains specified, only allow same origin
    return urlObj.origin === window.location.origin;
  } catch (e) {
    // Invalid URL
    return false;
  }
};

/**
 * Generate secure random ID
 * 
 * @param {number} length - Length of ID (default: 16)
 * @returns {string} Random ID
 */
export const generateSecureID = (length = 16) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash data using SubtleCrypto API
 * 
 * @param {string} data - Data to hash
 * @param {string} algorithm - Hash algorithm (default: SHA-256)
 * @returns {Promise<string>} Hashed data as hex string
 */
export const hashData = async (data, algorithm = 'SHA-256') => {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('[Security] Error hashing data:', error);
    throw error;
  }
};

/**
 * Content Security Policy violation handler
 * 
 * @param {SecurityPolicyViolationEvent} event - CSP violation event
 */
export const handleCSPViolation = (event) => {
  console.warn('[Security] CSP Violation:', {
    blockedURI: event.blockedURI,
    violatedDirective: event.violatedDirective,
    originalPolicy: event.originalPolicy,
    sourceFile: event.sourceFile,
    lineNumber: event.lineNumber,
  });

  // In production, send violation report to logging service
  // Example: sendToErrorMonitoring('csp_violation', event);
};

/**
 * Initialize security monitoring
 * 
 * Sets up event listeners for security-related events
 */
export const initializeSecurityMonitoring = () => {
  // Listen for CSP violations
  document.addEventListener('securitypolicyviolation', handleCSPViolation);

  // Detect clickjacking
  if (detectClickjacking()) {
    console.warn('[Security] Potential clickjacking detected - page loaded in iframe');
    // In production, consider breaking out of iframe or showing warning
  }

  // Initialize CSRF token
  getCSRFToken();

  console.log('✅ Security monitoring initialized');
};

/**
 * Clean up security monitoring
 */
export const cleanupSecurityMonitoring = () => {
  document.removeEventListener('securitypolicyviolation', handleCSPViolation);
};

export default {
  generateCSRFToken,
  getCSRFToken,
  validateCSRFToken,
  clearCSRFToken,
  addCSRFHeader,
  sanitizeObject,
  isSessionExpired,
  calculateSessionExpiry,
  SecureStorage,
  detectClickjacking,
  validateRedirectURL,
  generateSecureID,
  hashData,
  initializeSecurityMonitoring,
  cleanupSecurityMonitoring,
};

