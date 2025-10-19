/**
 * Input Validation Utilities
 * 
 * Provides validation functions for user inputs including:
 * - Email validation
 * - Username validation
 * - Password strength validation
 * 
 * @module utils/validation
 */

import validator from 'validator';

/**
 * Validate email address format
 * 
 * Uses the validator library to check if email is in valid format.
 * Performs comprehensive email validation including:
 * - Proper email structure (user@domain.com)
 * - Valid characters
 * - Domain validation
 * 
 * @param {string} email - Email address to validate
 * @returns {Object} Validation result with isValid boolean and error message
 * 
 * @example
 * const result = validateEmail('user@example.com');
 * // Returns: { isValid: true, error: null }
 * 
 * const result2 = validateEmail('invalid-email');
 * // Returns: { isValid: false, error: 'Invalid email format' }
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email must be provided'
    };
  }

  // Trim whitespace
  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return {
      isValid: false,
      error: 'Email cannot be empty'
    };
  }

  // Check maximum length (254 is RFC standard)
  if (trimmedEmail.length > 254) {
    return {
      isValid: false,
      error: 'Email is too long (max 254 characters)'
    };
  }

  // Use validator library for comprehensive email validation
  const isValidFormat = validator.isEmail(trimmedEmail, {
    allow_display_name: false,
    require_display_name: false,
    allow_utf8_local_part: true,
    require_tld: true
  });

  if (!isValidFormat) {
    return {
      isValid: false,
      error: 'Invalid email format'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validate username format and requirements
 * 
 * Checks if username meets the following criteria:
 * - 3-50 characters in length
 * - Only alphanumeric characters and underscores
 * - Cannot start or end with underscore
 * - Cannot have consecutive underscores
 * 
 * @param {string} username - Username to validate
 * @returns {Object} Validation result with isValid boolean and error message
 * 
 * @example
 * const result = validateUsername('john_doe123');
 * // Returns: { isValid: true, error: null }
 * 
 * const result2 = validateUsername('ab');
 * // Returns: { isValid: false, error: 'Username must be 3-50 characters long' }
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return {
      isValid: false,
      error: 'Username must be provided'
    };
  }

  // Trim whitespace
  const trimmedUsername = username.trim();

  if (trimmedUsername.length === 0) {
    return {
      isValid: false,
      error: 'Username cannot be empty'
    };
  }

  // Check length (3-50 characters)
  if (trimmedUsername.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters long'
    };
  }

  if (trimmedUsername.length > 50) {
    return {
      isValid: false,
      error: 'Username must be 50 characters or less'
    };
  }

  // Check for valid characters (alphanumeric + underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, and underscores'
    };
  }

  // Cannot start or end with underscore
  if (trimmedUsername.startsWith('_') || trimmedUsername.endsWith('_')) {
    return {
      isValid: false,
      error: 'Username cannot start or end with an underscore'
    };
  }

  // Cannot have consecutive underscores
  if (/__/.test(trimmedUsername)) {
    return {
      isValid: false,
      error: 'Username cannot contain consecutive underscores'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validate password strength and requirements
 * 
 * Checks if password meets the following security requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 number (0-9)
 * - At least 1 special character (!@#$%^&*()_+...)
 * 
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 * 
 * @example
 * const result = validatePassword('MyP@ssw0rd');
 * // Returns: { isValid: true, errors: [] }
 * 
 * const result2 = validatePassword('weak');
 * // Returns: { 
 * //   isValid: false, 
 * //   errors: ['Must be at least 8 characters long', 'Must contain...']
 * // }
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password must be provided']
    };
  }

  // Check minimum length (8 characters)
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

  // Check maximum length (for reasonable limits)
  if (password.length > 128) {
    errors.push('Password is too long (max 128 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate first name or last name
 * 
 * Checks if name meets requirements:
 * - 1-50 characters in length
 * - Only letters, spaces, hyphens, and apostrophes
 * - Cannot start or end with space
 * 
 * @param {string} name - Name to validate (first or last)
 * @param {string} fieldName - Field name for error messages (e.g., 'First name', 'Last name')
 * @returns {Object} Validation result with isValid boolean and error message
 * 
 * @example
 * const result = validateName("O'Connor", 'Last name');
 * // Returns: { isValid: true, error: null }
 */
export const validateName = (name, fieldName = 'Name') => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: `${fieldName} must be provided`
    };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty`
    };
  }

  if (trimmedName.length > 50) {
    return {
      isValid: false,
      error: `${fieldName} must be 50 characters or less`
    };
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
    return {
      isValid: false,
      error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`
    };
  }

  // Cannot start or end with space
  if (name !== trimmedName) {
    return {
      isValid: false,
      error: `${fieldName} cannot start or end with a space`
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validate phone number format
 * 
 * Basic phone number validation (optional field).
 * Accepts various formats but requires at least 10 digits.
 * 
 * @param {string} phone - Phone number to validate
 * @returns {Object} Validation result with isValid boolean and error message
 * 
 * @example
 * const result = validatePhone('+1-555-123-4567');
 * // Returns: { isValid: true, error: null }
 */
export const validatePhone = (phone) => {
  // Phone is optional, so empty is valid
  if (!phone || phone.trim().length === 0) {
    return {
      isValid: true,
      error: null
    };
  }

  if (typeof phone !== 'string') {
    return {
      isValid: false,
      error: 'Phone must be a string'
    };
  }

  const trimmedPhone = phone.trim();

  // Check maximum length
  if (trimmedPhone.length > 20) {
    return {
      isValid: false,
      error: 'Phone number is too long (max 20 characters)'
    };
  }

  // Count digits in phone number
  const digitsOnly = trimmedPhone.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return {
      isValid: false,
      error: 'Phone number must contain at least 10 digits'
    };
  }

  // Check for valid characters (digits, spaces, dashes, parentheses, plus)
  if (!/^[\d\s\-()+ ]+$/.test(trimmedPhone)) {
    return {
      isValid: false,
      error: 'Phone number contains invalid characters'
    };
  }

  return {
    isValid: true,
    error: null
  };
};

/**
 * Validate multiple fields at once
 * 
 * Convenience function to validate multiple inputs and return all errors.
 * 
 * @param {Object} fields - Object with field names as keys and values to validate
 * @returns {Object} Validation result with isValid boolean and errors object
 * 
 * @example
 * const result = validateFields({
 *   email: 'user@example.com',
 *   username: 'john_doe',
 *   password: 'MyP@ssw0rd123'
 * });
 * // Returns: { isValid: true, errors: {} }
 */
export const validateFields = (fields) => {
  const errors = {};
  let isValid = true;

  // Validate each field based on its name
  for (const [fieldName, value] of Object.entries(fields)) {
    let result;

    switch (fieldName) {
      case 'email':
        result = validateEmail(value);
        if (!result.isValid) {
          errors[fieldName] = result.error;
          isValid = false;
        }
        break;

      case 'username':
        result = validateUsername(value);
        if (!result.isValid) {
          errors[fieldName] = result.error;
          isValid = false;
        }
        break;

      case 'password':
        result = validatePassword(value);
        if (!result.isValid) {
          errors[fieldName] = result.errors;
          isValid = false;
        }
        break;

      case 'first_name':
      case 'firstName':
        result = validateName(value, 'First name');
        if (!result.isValid) {
          errors[fieldName] = result.error;
          isValid = false;
        }
        break;

      case 'last_name':
      case 'lastName':
        result = validateName(value, 'Last name');
        if (!result.isValid) {
          errors[fieldName] = result.error;
          isValid = false;
        }
        break;

      case 'phone':
        result = validatePhone(value);
        if (!result.isValid) {
          errors[fieldName] = result.error;
          isValid = false;
        }
        break;

      default:
        // Unknown field, skip validation
        break;
    }
  }

  return {
    isValid,
    errors
  };
};

