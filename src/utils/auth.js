/**
 * Authentication Utility Functions
 * 
 * Provides core authentication functionality including:
 * - Password hashing and verification using bcrypt
 * - Secure token generation for sessions and password resets
 * 
 * @module utils/auth
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Salt rounds for bcrypt hashing
 * Higher values = more secure but slower
 * 10 is recommended for production use
 */
const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 * 
 * @param {string} password - Plain text password to hash
 * @returns {Promise<string>} Bcrypt hashed password
 * @throws {Error} If password is empty or hashing fails
 * 
 * @example
 * const hash = await hashPassword('mySecurePassword123');
 * // Returns: $2a$10$...hashed password...
 */
export const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare a plain text password with a bcrypt hash
 * 
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Bcrypt hash to compare against
 * @returns {Promise<boolean>} True if password matches hash, false otherwise
 * @throws {Error} If comparison fails
 * 
 * @example
 * const isValid = await comparePassword('myPassword123', storedHash);
 * if (isValid) {
 *   console.log('Password is correct!');
 * }
 */
export const comparePassword = async (password, hash) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error('Error comparing password:', error);
    throw new Error('Failed to verify password');
  }
};

/**
 * Generate a cryptographically secure session token
 * 
 * Creates a random 64-character hexadecimal string suitable for session tokens.
 * Uses Node.js crypto.randomBytes for cryptographic randomness.
 * 
 * @returns {string} 64-character hexadecimal session token
 * @throws {Error} If token generation fails
 * 
 * @example
 * const sessionToken = generateSessionToken();
 * // Returns: "a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
 */
export const generateSessionToken = () => {
  try {
    // Generate 32 random bytes and convert to hexadecimal (64 characters)
    const token = crypto.randomBytes(32).toString('hex');
    return token;
  } catch (error) {
    console.error('Error generating session token:', error);
    throw new Error('Failed to generate session token');
  }
};

/**
 * Generate a cryptographically secure password reset token
 * 
 * Creates a random 64-character hexadecimal string suitable for password reset links.
 * Uses Node.js crypto.randomBytes for cryptographic randomness.
 * 
 * @returns {string} 64-character hexadecimal reset token
 * @throws {Error} If token generation fails
 * 
 * @example
 * const resetToken = generateResetToken();
 * // Returns: "b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6"
 */
export const generateResetToken = () => {
  try {
    // Generate 32 random bytes and convert to hexadecimal (64 characters)
    const token = crypto.randomBytes(32).toString('hex');
    return token;
  } catch (error) {
    console.error('Error generating reset token:', error);
    throw new Error('Failed to generate reset token');
  }
};

/**
 * Validate password strength
 * 
 * Checks if password meets security requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * 
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 * 
 * @example
 * const result = validatePasswordStrength('Weak123');
 * // Returns: { isValid: false, errors: ['Must contain at least 1 special character'] }
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password must be provided'] };
  }

  // Check minimum length
  if (password.length < 8) {
    errors.push('Must be at least 8 characters long');
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain at least 1 uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain at least 1 lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Must contain at least 1 number');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Must contain at least 1 special character (!@#$%^&*...)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculate password strength score
 * 
 * Returns a strength level based on password characteristics:
 * - weak: Fails some requirements or < 8 characters
 * - medium: Meets all requirements, 8-9 characters
 * - strong: Meets all requirements, 10+ characters
 * 
 * @param {string} password - Password to evaluate
 * @returns {string} Strength level: 'weak', 'medium', or 'strong'
 * 
 * @example
 * const strength = getPasswordStrength('MyP@ssw0rd123');
 * // Returns: 'strong'
 */
export const getPasswordStrength = (password) => {
  const validation = validatePasswordStrength(password);

  if (!validation.isValid) {
    return 'weak';
  }

  // All requirements met
  if (password.length >= 10) {
    return 'strong';
  }

  return 'medium';
};

