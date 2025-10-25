/**
 * Rate Limiter Utility
 * 
 * Client-side rate limiting for failed login attempts.
 * Tracks attempts by IP address (or browser fingerprint) and enforces limits.
 * 
 * Note: This is a client-side implementation using localStorage.
 * For production, consider implementing server-side rate limiting as well.
 * 
 * @module utils/rateLimiter
 */

const RATE_LIMIT_KEY = 'ayubo_cafe_rate_limit';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Get browser fingerprint (simple implementation)
 * 
 * Creates a simple fingerprint based on browser characteristics.
 * In a real-world scenario, consider using a library like FingerprintJS.
 * 
 * @returns {string} Browser fingerprint
 */
const getBrowserFingerprint = () => {
  // Simple fingerprint based on user agent and screen resolution
  const { userAgent, language } = navigator;
  const { width, height, colorDepth } = screen;
  
  const fingerprint = `${userAgent}-${language}-${width}x${height}-${colorDepth}`;
  
  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `fp_${Math.abs(hash)}`;
};

/**
 * Get rate limit data from localStorage
 * 
 * @returns {Object} Rate limit data object
 */
const getRateLimitData = () => {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    if (!data) {
      return {};
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading rate limit data:', error);
    return {};
  }
};

/**
 * Save rate limit data to localStorage
 * 
 * @param {Object} data - Rate limit data to save
 */
const saveRateLimitData = (data) => {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving rate limit data:', error);
  }
};

/**
 * Get identifier for rate limiting
 * 
 * Uses browser fingerprint as a proxy for IP address (client-side limitation).
 * 
 * @returns {string} Identifier for rate limiting
 */
const getIdentifier = () => {
  return getBrowserFingerprint();
};

/**
 * Record a failed login attempt
 * 
 * Increments the failed attempt counter for the current identifier.
 * 
 * @param {string} username - Username that was attempted
 * @returns {Object} Result with isLocked boolean and remaining attempts
 * 
 * @example
 * const result = recordFailedAttempt('john_doe');
 * if (result.isLocked) {
 *   console.log('Account locked for', result.minutesRemaining, 'minutes');
 * }
 */
export const recordFailedAttempt = (username = null) => {
  const identifier = getIdentifier();
  const now = Date.now();
  const data = getRateLimitData();

  // Get or initialize entry for this identifier
  if (!data[identifier]) {
    data[identifier] = {
      attempts: [],
      lockedUntil: null
    };
  }

  const entry = data[identifier];

  // Check if currently locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const minutesRemaining = Math.ceil((entry.lockedUntil - now) / (60 * 1000));
    return {
      isLocked: true,
      attemptsRemaining: 0,
      minutesRemaining,
      lockedUntil: new Date(entry.lockedUntil).toISOString()
    };
  }

  // Clean up old attempts (older than 15 minutes)
  entry.attempts = entry.attempts.filter(attempt => 
    now - attempt.timestamp < LOCKOUT_DURATION
  );

  // Record new failed attempt
  entry.attempts.push({
    timestamp: now,
    username: username || 'unknown'
  });

  // Check if should be locked
  if (entry.attempts.length >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION;
    
    // Save and return locked status
    saveRateLimitData(data);
    
    return {
      isLocked: true,
      attemptsRemaining: 0,
      minutesRemaining: 15,
      lockedUntil: new Date(entry.lockedUntil).toISOString(),
      totalAttempts: entry.attempts.length
    };
  }

  // Save updated data
  saveRateLimitData(data);

  return {
    isLocked: false,
    attemptsRemaining: MAX_ATTEMPTS - entry.attempts.length,
    attemptsMade: entry.attempts.length,
    maxAttempts: MAX_ATTEMPTS
  };
};

/**
 * Check if identifier is currently locked
 * 
 * @returns {Object} Lock status with isLocked boolean and time remaining
 * 
 * @example
 * const status = checkRateLimit();
 * if (status.isLocked) {
 *   alert(`Too many attempts. Try again in ${status.minutesRemaining} minutes.`);
 * }
 */
export const checkRateLimit = () => {
  const identifier = getIdentifier();
  const now = Date.now();
  const data = getRateLimitData();

  // No entry means no attempts
  if (!data[identifier]) {
    return {
      isLocked: false,
      timeLeft: 0,
      attemptsRemaining: MAX_ATTEMPTS,
      attemptsMade: 0
    };
  }

  const entry = data[identifier];

  // Check if locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const timeLeft = entry.lockedUntil - now;
    const minutesRemaining = Math.ceil(timeLeft / (60 * 1000));
    const secondsRemaining = Math.ceil(timeLeft / 1000);
    
    return {
      isLocked: true,
      attemptsRemaining: 0,
      timeLeft, // Add timeLeft in milliseconds
      minutesRemaining,
      secondsRemaining,
      lockedUntil: new Date(entry.lockedUntil).toISOString()
    };
  }

  // Clean up old attempts
  entry.attempts = entry.attempts.filter(attempt => 
    now - attempt.timestamp < LOCKOUT_DURATION
  );

  // Save cleaned data
  saveRateLimitData(data);

  return {
    isLocked: false,
    timeLeft: 0,
    attemptsRemaining: MAX_ATTEMPTS - entry.attempts.length,
    attemptsMade: entry.attempts.length,
    maxAttempts: MAX_ATTEMPTS
  };
};

/**
 * Reset rate limit for current identifier
 * 
 * Called after successful login to clear failed attempt counter.
 * 
 * @example
 * // After successful login
 * resetRateLimit();
 */
export const resetRateLimit = () => {
  const identifier = getIdentifier();
  const data = getRateLimitData();

  // Remove entry for this identifier
  if (data[identifier]) {
    delete data[identifier];
    saveRateLimitData(data);
  }
};

/**
 * Get remaining attempts before lockout
 * 
 * @returns {number} Number of attempts remaining
 */
export const getRemainingAttempts = () => {
  const status = checkRateLimit();
  return status.attemptsRemaining;
};

/**
 * Get lockout end time if currently locked
 * 
 * @returns {Date|null} Lockout end time or null if not locked
 */
export const getLockoutEndTime = () => {
  const status = checkRateLimit();
  return status.isLocked ? new Date(status.lockedUntil) : null;
};

/**
 * Clean up old rate limit data
 * 
 * Removes all entries that are no longer relevant (older than lockout duration).
 * Should be called periodically to prevent localStorage bloat.
 * 
 * @example
 * // Call on app initialization
 * cleanupRateLimitData();
 */
export const cleanupRateLimitData = () => {
  const now = Date.now();
  const data = getRateLimitData();
  let hasChanges = false;

  for (const identifier in data) {
    const entry = data[identifier];

    // Remove if not locked and no recent attempts
    const hasRecentAttempts = entry.attempts.some(attempt => 
      now - attempt.timestamp < LOCKOUT_DURATION
    );

    const isLocked = entry.lockedUntil && now < entry.lockedUntil;

    if (!hasRecentAttempts && !isLocked) {
      delete data[identifier];
      hasChanges = true;
    } else if (entry.attempts.length > 0) {
      // Clean up old attempts within entry
      const oldLength = entry.attempts.length;
      entry.attempts = entry.attempts.filter(attempt => 
        now - attempt.timestamp < LOCKOUT_DURATION
      );
      if (entry.attempts.length !== oldLength) {
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    saveRateLimitData(data);
  }
};

/**
 * Get all rate limit information
 * 
 * Useful for debugging or displaying lockout information to the user.
 * 
 * @returns {Object} Complete rate limit status
 */
export const getRateLimitInfo = () => {
  const status = checkRateLimit();
  const identifier = getIdentifier();

  return {
    identifier,
    ...status,
    maxAttempts: MAX_ATTEMPTS,
    lockoutDurationMinutes: LOCKOUT_DURATION / (60 * 1000)
  };
};

/**
 * API Endpoint Rate Limiter
 * 
 * Tracks API endpoint calls to prevent abuse
 * 
 * @param {string} endpoint - API endpoint name
 * @param {number} maxCalls - Maximum calls allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Result with allowed boolean
 */
export const checkAPIRateLimit = (endpoint, maxCalls = 10, windowMs = 60000) => {
  const key = `api_rate_limit_${endpoint}`;
  const now = Date.now();
  
  try {
    const data = localStorage.getItem(key);
    let calls = data ? JSON.parse(data) : [];
    
    // Remove old calls outside the window
    calls = calls.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (calls.length >= maxCalls) {
      const oldestCall = Math.min(...calls);
      const resetTime = oldestCall + windowMs;
      const secondsRemaining = Math.ceil((resetTime - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetIn: secondsRemaining,
        message: `Too many requests. Try again in ${secondsRemaining} seconds.`
      };
    }
    
    // Add new call
    calls.push(now);
    localStorage.setItem(key, JSON.stringify(calls));
    
    return {
      allowed: true,
      remaining: maxCalls - calls.length,
      callsMade: calls.length,
      maxCalls
    };
  } catch (error) {
    console.error('[Rate Limiter] Error checking API rate limit:', error);
    // Fail open in case of error
    return {
      allowed: true,
      remaining: maxCalls,
      callsMade: 0,
      maxCalls
    };
  }
};

/**
 * Reset API rate limit for specific endpoint
 * 
 * @param {string} endpoint - API endpoint name
 */
export const resetAPIRateLimit = (endpoint) => {
  const key = `api_rate_limit_${endpoint}`;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('[Rate Limiter] Error resetting API rate limit:', error);
  }
};

/**
 * Clean up all API rate limit data
 */
export const cleanupAPIRateLimits = () => {
  const now = Date.now();
  const keys = [];
  
  try {
    // Get all API rate limit keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('api_rate_limit_')) {
        keys.push(key);
      }
    }
    
    // Clean up old data
    keys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          let calls = JSON.parse(data);
          calls = calls.filter(timestamp => now - timestamp < 3600000); // Keep last hour
          
          if (calls.length === 0) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(calls));
          }
        } catch (e) {
          // Invalid data, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('[Rate Limiter] Error cleaning up API rate limits:', error);
  }
};

// Initialize: Clean up old data on module load
cleanupRateLimitData();
cleanupAPIRateLimits();

// Alias exports for compatibility with LoginForm
export const checkLockoutStatus = checkRateLimit;
export const resetFailedLoginAttempts = resetRateLimit;
export const trackFailedLoginAttempt = recordFailedAttempt;

