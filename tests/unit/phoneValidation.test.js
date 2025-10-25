/**
 * Phone Validation Tests
 * 
 * Tests for Sri Lankan phone number validation utilities (Section 2.0)
 */

import { describe, it, expect } from 'vitest';
import {
  validatePhoneNumber,
  formatPhoneNumber,
  normalizePhoneNumber,
  isValidPhoneNumber,
  formatPhoneNumberForDisplay,
  maskPhoneNumber,
  getNationalNumber,
  arePhoneNumbersEqual,
  extractPhoneNumbers,
  getCarrier,
  VALID_MOBILE_PREFIXES,
  TEST_PHONE_NUMBERS,
} from '../../src/utils/phoneValidation';

describe('Phone Validation Utilities', () => {
  describe('validatePhoneNumber', () => {
    it('should validate phone number with +94 prefix', () => {
      const result = validatePhoneNumber('+94771234567');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+94771234567');
      expect(result.message).toBe('Valid phone number');
    });

    it('should validate phone number with 94 prefix (no +)', () => {
      const result = validatePhoneNumber('94771234567');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+94771234567');
    });

    it('should validate phone number with 0 prefix (local format)', () => {
      const result = validatePhoneNumber('0771234567');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+94771234567');
    });

    it('should validate phone number without prefix', () => {
      const result = validatePhoneNumber('771234567');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+94771234567');
    });

    it('should validate phone number with spaces', () => {
      const result = validatePhoneNumber('+94 77 123 4567');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+94771234567');
    });

    it('should validate phone number with hyphens', () => {
      const result = validatePhoneNumber('077-123-4567');
      
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+94771234567');
    });

    it('should reject empty phone number', () => {
      const result = validatePhoneNumber('');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('required');
      expect(result.formatted).toBeNull();
    });

    it('should reject null phone number', () => {
      const result = validatePhoneNumber(null);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('required');
    });

    it('should reject phone number with invalid characters', () => {
      const result = validatePhoneNumber('077abc1234');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('invalid characters');
    });

    it('should reject phone number that is too short', () => {
      const result = validatePhoneNumber('077123');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('9 digits');
    });

    it('should reject phone number that is too long', () => {
      const result = validatePhoneNumber('077123456789');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('9 digits');
    });

    it('should reject phone number with invalid prefix', () => {
      const result = validatePhoneNumber('+94881234567');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Invalid mobile prefix');
    });

    it('should validate all valid mobile prefixes', () => {
      const validPrefixes = ['70', '71', '72', '75', '76', '77', '78', '79'];
      
      validPrefixes.forEach(prefix => {
        const result = validatePhoneNumber(`${prefix}1234567`);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle TEST_PHONE_NUMBERS valid cases', () => {
      TEST_PHONE_NUMBERS.valid.forEach(phone => {
        const result = validatePhoneNumber(phone);
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle TEST_PHONE_NUMBERS invalid cases', () => {
      TEST_PHONE_NUMBERS.invalid.forEach(phone => {
        const result = validatePhoneNumber(phone);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format valid phone number', () => {
      const formatted = formatPhoneNumber('0771234567');
      expect(formatted).toBe('+94771234567');
    });

    it('should return null for invalid phone number', () => {
      const formatted = formatPhoneNumber('invalid');
      expect(formatted).toBeNull();
    });

    it('should normalize different input formats to same output', () => {
      const inputs = ['+94771234567', '94771234567', '0771234567', '771234567'];
      const expected = '+94771234567';
      
      inputs.forEach(input => {
        expect(formatPhoneNumber(input)).toBe(expected);
      });
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize phone number', () => {
      const normalized = normalizePhoneNumber('077 123 4567');
      expect(normalized).toBe('+94771234567');
    });

    it('should return null for invalid phone number', () => {
      const normalized = normalizePhoneNumber('123');
      expect(normalized).toBeNull();
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone number', () => {
      expect(isValidPhoneNumber('+94771234567')).toBe(true);
    });

    it('should return false for invalid phone number', () => {
      expect(isValidPhoneNumber('123')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidPhoneNumber('')).toBe(false);
    });
  });

  describe('formatPhoneNumberForDisplay', () => {
    it('should format phone number with spaces', () => {
      const display = formatPhoneNumberForDisplay('0771234567');
      expect(display).toBe('+94 77 123 4567');
    });

    it('should return null for invalid phone number', () => {
      const display = formatPhoneNumberForDisplay('invalid');
      expect(display).toBeNull();
    });

    it('should handle different input formats', () => {
      const inputs = ['+94771234567', '0771234567', '771234567'];
      const expected = '+94 77 123 4567';
      
      inputs.forEach(input => {
        expect(formatPhoneNumberForDisplay(input)).toBe(expected);
      });
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask middle digits of phone number', () => {
      const masked = maskPhoneNumber('0771234567');
      expect(masked).toBe('+94 77 *** **67');
    });

    it('should return null for invalid phone number', () => {
      const masked = maskPhoneNumber('invalid');
      expect(masked).toBeNull();
    });

    it('should show only first 2 and last 2 digits', () => {
      const masked = maskPhoneNumber('+94761234567');
      expect(masked).toMatch(/\+94 76 \*\*\* \*\*67/);
    });
  });

  describe('getNationalNumber', () => {
    it('should extract national number without country code', () => {
      const national = getNationalNumber('+94771234567');
      expect(national).toBe('771234567');
    });

    it('should return null for invalid phone number', () => {
      const national = getNationalNumber('invalid');
      expect(national).toBeNull();
    });

    it('should extract same national number from different formats', () => {
      const inputs = ['+94771234567', '0771234567', '771234567'];
      const expected = '771234567';
      
      inputs.forEach(input => {
        expect(getNationalNumber(input)).toBe(expected);
      });
    });
  });

  describe('arePhoneNumbersEqual', () => {
    it('should return true for same phone numbers in different formats', () => {
      const result = arePhoneNumbersEqual('+94771234567', '0771234567');
      expect(result).toBe(true);
    });

    it('should return false for different phone numbers', () => {
      const result = arePhoneNumbersEqual('+94771234567', '+94761234567');
      expect(result).toBe(false);
    });

    it('should return false if one number is invalid', () => {
      const result = arePhoneNumbersEqual('+94771234567', 'invalid');
      expect(result).toBe(false);
    });

    it('should return false if both numbers are invalid', () => {
      const result = arePhoneNumbersEqual('invalid1', 'invalid2');
      expect(result).toBe(false);
    });

    it('should handle phone numbers with spaces and hyphens', () => {
      const result = arePhoneNumbersEqual('+94 77 123 4567', '077-123-4567');
      expect(result).toBe(true);
    });
  });

  describe('extractPhoneNumbers', () => {
    it('should extract phone numbers from text', () => {
      const text = 'Call me at +94771234567 or 0761234567';
      const extracted = extractPhoneNumbers(text);
      
      expect(extracted).toHaveLength(2);
      expect(extracted).toContain('+94771234567');
      expect(extracted).toContain('+94761234567');
    });

    it('should handle text with no phone numbers', () => {
      const text = 'No phone numbers here';
      const extracted = extractPhoneNumbers(text);
      
      expect(extracted).toHaveLength(0);
    });

    it('should return empty array for empty text', () => {
      const extracted = extractPhoneNumbers('');
      expect(extracted).toEqual([]);
    });

    it('should return empty array for null text', () => {
      const extracted = extractPhoneNumbers(null);
      expect(extracted).toEqual([]);
    });

    it('should not return duplicates', () => {
      const text = '+94771234567 and 0771234567 and 771234567';
      const extracted = extractPhoneNumbers(text);
      
      // All three represent the same number
      expect(extracted).toHaveLength(1);
      expect(extracted[0]).toBe('+94771234567');
    });

    it('should handle mixed formats in text', () => {
      const text = 'Numbers: +94 77 123 4567, 94761234567, 0751234567';
      const extracted = extractPhoneNumbers(text);
      
      expect(extracted.length).toBeGreaterThan(0);
    });
  });

  describe('getCarrier', () => {
    it('should identify Dialog carrier (77 prefix)', () => {
      const carrier = getCarrier('+94771234567');
      expect(carrier).toBe('Dialog');
    });

    it('should identify Dialog carrier (76 prefix)', () => {
      const carrier = getCarrier('+94761234567');
      expect(carrier).toBe('Dialog');
    });

    it('should identify Mobitel carrier (71 prefix)', () => {
      const carrier = getCarrier('+94711234567');
      expect(carrier).toBe('Mobitel');
    });

    it('should identify Mobitel carrier (70 prefix)', () => {
      const carrier = getCarrier('+94701234567');
      expect(carrier).toBe('Mobitel');
    });

    it('should identify Hutch carrier (72 prefix)', () => {
      const carrier = getCarrier('+94721234567');
      expect(carrier).toBe('Hutch');
    });

    it('should identify Hutch carrier (78 prefix)', () => {
      const carrier = getCarrier('+94781234567');
      expect(carrier).toBe('Hutch');
    });

    it('should identify Airtel carrier (75 prefix)', () => {
      const carrier = getCarrier('+94751234567');
      expect(carrier).toBe('Airtel');
    });

    it('should identify Etisalat carrier (79 prefix)', () => {
      const carrier = getCarrier('+94791234567');
      expect(carrier).toBe('Etisalat');
    });

    it('should return null for invalid phone number', () => {
      const carrier = getCarrier('invalid');
      expect(carrier).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle phone number with parentheses', () => {
      const result = validatePhoneNumber('(077) 123-4567');
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe('+94771234567');
    });

    it('should handle phone number with multiple spaces', () => {
      const result = validatePhoneNumber('+94   77   123   4567');
      expect(result.isValid).toBe(true);
    });

    it('should reject phone number with letters', () => {
      const result = validatePhoneNumber('+94 77 abc 4567');
      expect(result.isValid).toBe(false);
    });

    it('should reject phone number with special characters', () => {
      const result = validatePhoneNumber('+94@771234567');
      expect(result.isValid).toBe(false);
    });

    it('should handle non-string input gracefully', () => {
      const result = validatePhoneNumber(771234567);
      expect(result.isValid).toBe(false);
    });
  });
});

