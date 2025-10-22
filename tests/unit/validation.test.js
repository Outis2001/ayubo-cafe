/**
 * Unit Tests for Validation Utilities
 * 
 * Example unit tests demonstrating the testing pattern.
 * These can be expanded to cover all validation functions.
 */

import { describe, it, expect } from 'vitest';
import { validatePassword, validateEmail, validateUsername } from '../../src/utils/validation';

describe('Password Validation', () => {
  it('should accept valid password', () => {
    const result = validatePassword('ValidPass123!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('Short1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must be at least 8 characters long');
  });

  it('should reject password without uppercase letter', () => {
    const result = validatePassword('lowercase123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must contain at least 1 uppercase letter');
  });

  it('should reject password without lowercase letter', () => {
    const result = validatePassword('UPPERCASE123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must contain at least 1 lowercase letter');
  });

  it('should reject password without number', () => {
    const result = validatePassword('NoNumbers!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must contain at least 1 number');
  });

  it('should reject password without special character', () => {
    const result = validatePassword('NoSpecial123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Must contain at least 1 special character (!@#$%^&*...)');
  });

  it('should return all applicable errors', () => {
    const result = validatePassword('bad');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('Email Validation', () => {
  it('should accept valid email', () => {
    const result = validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('should accept email with plus sign', () => {
    const result = validateEmail('user+tag@example.com');
    expect(result.isValid).toBe(true);
  });

  it('should accept email with subdomain', () => {
    const result = validateEmail('user@mail.example.com');
    expect(result.isValid).toBe(true);
  });

  it('should reject email without @', () => {
    const result = validateEmail('userexample.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject email without domain', () => {
    const result = validateEmail('user@');
    expect(result.isValid).toBe(false);
  });

  it('should reject empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
  });
});

describe('Username Validation', () => {
  it('should accept valid username', () => {
    const result = validateUsername('valid_user123');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('should accept username with underscores', () => {
    const result = validateUsername('user_name');
    expect(result.isValid).toBe(true);
  });

  it('should accept username with numbers', () => {
    const result = validateUsername('user123');
    expect(result.isValid).toBe(true);
  });

  it('should reject username shorter than 3 characters', () => {
    const result = validateUsername('ab');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('at least 3 characters');
  });

  it('should reject username longer than 50 characters', () => {
    const result = validateUsername('a'.repeat(51));
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username must be 50 characters or less');
  });

  it('should reject username with special characters', () => {
    const result = validateUsername('user@name');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Username can only contain letters, numbers, and underscores');
  });

  it('should reject username with spaces', () => {
    const result = validateUsername('user name');
    expect(result.isValid).toBe(false);
  });

  it('should reject empty username', () => {
    const result = validateUsername('');
    expect(result.isValid).toBe(false);
  });
});

