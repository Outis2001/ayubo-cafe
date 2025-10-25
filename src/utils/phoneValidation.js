/**
 * Phone Validation Utilities
 * Validates Sri Lankan phone numbers in +94 format
 */

/**
 * Valid Sri Lankan mobile prefixes (without country code)
 * Mobile numbers typically start with 7
 */
const VALID_MOBILE_PREFIXES = ['70', '71', '72', '75', '76', '77', '78', '79'];

/**
 * Validates if a phone number is a valid Sri Lankan mobile number
 * @param {string} phoneNumber - Phone number to validate (can be in various formats)
 * @returns {Object} - { isValid: boolean, message: string, formatted: string|null }
 */
export const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return {
      isValid: false,
      message: 'Phone number is required',
      formatted: null,
    };
  }

  // Remove all spaces, hyphens, and parentheses
  const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

  // Check if it contains only valid characters (digits and optional +)
  if (!/^[\+]?[0-9]+$/.test(cleaned)) {
    return {
      isValid: false,
      message: 'Phone number contains invalid characters',
      formatted: null,
    };
  }

  let nationalNumber = '';

  // Handle different input formats
  if (cleaned.startsWith('+94')) {
    // Format: +94XXXXXXXXX
    nationalNumber = cleaned.substring(3);
  } else if (cleaned.startsWith('94')) {
    // Format: 94XXXXXXXXX
    nationalNumber = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    // Format: 0XXXXXXXXX (local format)
    nationalNumber = cleaned.substring(1);
  } else {
    // Format: XXXXXXXXX (without prefix)
    nationalNumber = cleaned;
  }

  // Validate length (should be 9 digits for Sri Lankan mobile)
  if (nationalNumber.length !== 9) {
    return {
      isValid: false,
      message: 'Phone number must be 9 digits (e.g., 771234567)',
      formatted: null,
    };
  }

  // Validate that it starts with a valid mobile prefix
  const prefix = nationalNumber.substring(0, 2);
  if (!VALID_MOBILE_PREFIXES.includes(prefix)) {
    return {
      isValid: false,
      message: `Invalid mobile prefix. Must start with one of: ${VALID_MOBILE_PREFIXES.join(', ')}`,
      formatted: null,
    };
  }

  // All validations passed
  const formatted = `+94${nationalNumber}`;
  return {
    isValid: true,
    message: 'Valid phone number',
    formatted: formatted,
  };
};

/**
 * Formats a phone number to international format (+94XXXXXXXXX)
 * @param {string} phoneNumber - Phone number to format
 * @returns {string|null} - Formatted phone number or null if invalid
 */
export const formatPhoneNumber = (phoneNumber) => {
  const validation = validatePhoneNumber(phoneNumber);
  return validation.formatted;
};

/**
 * Normalizes a phone number to E.164 format (+94XXXXXXXXX)
 * Same as formatPhoneNumber, provided for clarity
 * @param {string} phoneNumber - Phone number to normalize
 * @returns {string|null} - Normalized phone number or null if invalid
 */
export const normalizePhoneNumber = (phoneNumber) => {
  return formatPhoneNumber(phoneNumber);
};

/**
 * Checks if a phone number is valid (boolean only)
 * @param {string} phoneNumber - Phone number to check
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidPhoneNumber = (phoneNumber) => {
  return validatePhoneNumber(phoneNumber).isValid;
};

/**
 * Formats phone number for display with spaces (e.g., +94 77 123 4567)
 * @param {string} phoneNumber - Phone number to format
 * @returns {string|null} - Display formatted phone number or null if invalid
 */
export const formatPhoneNumberForDisplay = (phoneNumber) => {
  const formatted = formatPhoneNumber(phoneNumber);
  if (!formatted) return null;

  // Format: +94 XX XXX XXXX
  const countryCode = formatted.substring(0, 3); // +94
  const prefix = formatted.substring(3, 5); // XX
  const middle = formatted.substring(5, 8); // XXX
  const last = formatted.substring(8, 12); // XXXX

  return `${countryCode} ${prefix} ${middle} ${last}`;
};

/**
 * Masks a phone number for privacy (e.g., +94 77 *** **67)
 * @param {string} phoneNumber - Phone number to mask
 * @returns {string|null} - Masked phone number or null if invalid
 */
export const maskPhoneNumber = (phoneNumber) => {
  const formatted = formatPhoneNumber(phoneNumber);
  if (!formatted) return null;

  const countryCode = formatted.substring(0, 3); // +94
  const prefix = formatted.substring(3, 5); // XX
  const last = formatted.substring(10, 12); // XX (last 2 digits)

  return `${countryCode} ${prefix} *** **${last}`;
};

/**
 * Gets the national number (without country code)
 * @param {string} phoneNumber - Phone number
 * @returns {string|null} - National number or null if invalid
 */
export const getNationalNumber = (phoneNumber) => {
  const formatted = formatPhoneNumber(phoneNumber);
  if (!formatted) return null;
  return formatted.substring(3); // Remove +94
};

/**
 * Checks if two phone numbers are the same (compares normalized versions)
 * @param {string} phone1 - First phone number
 * @param {string} phone2 - Second phone number
 * @returns {boolean} - True if they represent the same number
 */
export const arePhoneNumbersEqual = (phone1, phone2) => {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  
  if (!normalized1 || !normalized2) return false;
  return normalized1 === normalized2;
};

/**
 * Extracts phone numbers from text
 * @param {string} text - Text to extract phone numbers from
 * @returns {string[]} - Array of formatted phone numbers found
 */
export const extractPhoneNumbers = (text) => {
  if (!text || typeof text !== 'string') return [];

  // Regex to match potential phone numbers
  const patterns = [
    /\+94\s*\d{2}\s*\d{3}\s*\d{4}/g,  // +94 77 123 4567
    /\+94\d{9}/g,                       // +94771234567
    /94\d{9}/g,                         // 94771234567
    /0\d{9}/g,                          // 0771234567
  ];

  const found = [];
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const formatted = formatPhoneNumber(match);
        if (formatted && !found.includes(formatted)) {
          found.push(formatted);
        }
      });
    }
  });

  return found;
};

/**
 * Gets carrier/network from phone prefix (informational)
 * @param {string} phoneNumber - Phone number
 * @returns {string|null} - Carrier name or null if invalid
 */
export const getCarrier = (phoneNumber) => {
  const validation = validatePhoneNumber(phoneNumber);
  if (!validation.isValid) return null;

  const nationalNumber = validation.formatted.substring(3);
  const prefix = nationalNumber.substring(0, 2);

  const carriers = {
    '70': 'Mobitel',
    '71': 'Mobitel',
    '72': 'Hutch',
    '75': 'Airtel',
    '76': 'Dialog',
    '77': 'Dialog',
    '78': 'Hutch',
    '79': 'Etisalat',
  };

  return carriers[prefix] || 'Unknown';
};

// Export validation rules for use in forms
export const PHONE_VALIDATION_RULES = {
  required: 'Phone number is required',
  pattern: {
    value: /^[\+]?(94|0)?[0-9\s\-\(\)]+$/,
    message: 'Invalid phone number format',
  },
  validate: (value) => {
    const result = validatePhoneNumber(value);
    return result.isValid || result.message;
  },
};

// Export for testing and documentation
export const TEST_PHONE_NUMBERS = {
  valid: [
    '+94771234567',
    '94771234567',
    '0771234567',
    '771234567',
    '+94 77 123 4567',
    '077 123 4567',
  ],
  invalid: [
    '1234567',           // Too short
    '+94881234567',      // Invalid prefix (88)
    '+94771234',         // Too short
    '077123456789',      // Too long
    'abcd',              // Not a number
    '+1234567890',       // Wrong country code
    '',                  // Empty
  ],
};

