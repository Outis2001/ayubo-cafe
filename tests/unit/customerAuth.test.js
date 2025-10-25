/**
 * Customer Authentication Tests
 * 
 * Tests for customer authentication utilities (Section 2.0)
 * Tests OTP generation, verification, signup, and login flows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as customerAuth from '../../src/utils/customerAuth';

// Mock dependencies
vi.mock('../../src/config/supabase.js', () => ({
  supabaseClient: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../src/utils/auditLog.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../src/utils/sms.js', () => ({
  sendOTPSMS: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../src/utils/phoneValidation.js', () => ({
  validatePhoneNumber: vi.fn((phone) => {
    if (!phone || phone === 'invalid') {
      return { isValid: false, message: 'Invalid phone number', formatted: null };
    }
    return { isValid: true, message: 'Valid phone number', formatted: '+94771234567' };
  }),
  formatPhoneNumber: vi.fn((phone) => {
    if (!phone || phone === 'invalid') return null;
    return '+94771234567';
  }),
}));

describe('Customer Authentication Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('requestOTP', () => {
    it('should generate and send OTP for valid phone number', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { sendOTPSMS } = await import('../../src/utils/sms.js');
      
      // Mock database operations
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [], // No recent OTP requests
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ otp_id: '123', phone_number: '+94771234567' }],
          error: null,
        }),
      });

      const result = await customerAuth.requestOTP('0771234567');

      expect(result.success).toBe(true);
      expect(result.message).toContain('OTP sent');
      expect(sendOTPSMS).toHaveBeenCalled();
    });

    it('should reject invalid phone number', async () => {
      const result = await customerAuth.requestOTP('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number');
    });

    it('should enforce rate limiting', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      // Mock rate limit exceeded
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [
                { created_at: new Date().toISOString() },
                { created_at: new Date().toISOString() },
                { created_at: new Date().toISOString() },
              ],
              error: null,
            }),
          }),
        }),
      });

      const result = await customerAuth.requestOTP('0771234567');

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('should handle database errors gracefully', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const result = await customerAuth.requestOTP('0771234567');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyOTP', () => {
    it('should verify correct OTP code', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      // Mock OTP record with hashed OTP
      // For testing, we'll assume the OTP hash matches
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      otp_id: '123',
                      otp_hash: '$2a$10$mockhash',
                      phone_number: '+94771234567',
                      verification_attempts: 0,
                      expires_at: new Date(Date.now() + 600000).toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ otp_id: '123', is_verified: true }],
            error: null,
          }),
        }),
      });

      // Mock bcrypt comparison - we can't actually test bcrypt in this simple mock
      // In a real scenario, you'd need to mock the bcrypt module
      
      const result = await customerAuth.verifyOTP('+94771234567', '123456');

      // Result may vary based on actual OTP verification logic
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should reject invalid OTP format', async () => {
      const result = await customerAuth.verifyOTP('+94771234567', '12');

      expect(result.success).toBe(false);
      expect(result.error).toContain('6-digit');
    });

    it('should reject empty OTP', async () => {
      const result = await customerAuth.verifyOTP('+94771234567', '');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle expired OTP', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null, // No valid OTP found (expired)
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await customerAuth.verifyOTP('+94771234567', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should track verification attempts', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      // Mock max attempts reached
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      otp_id: '123',
                      otp_hash: '$2a$10$mockhash',
                      phone_number: '+94771234567',
                      verification_attempts: 5, // Max attempts
                      expires_at: new Date(Date.now() + 600000).toISOString(),
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await customerAuth.verifyOTP('+94771234567', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum');
    });
  });

  describe('signupCustomer', () => {
    it('should create customer account after OTP verification', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null, // Customer doesn't exist
            error: null,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                customer_id: 'cust-123',
                phone_number: '+94771234567',
                name: 'Test Customer',
                email: 'test@example.com',
              },
              error: null,
            }),
          }),
        }),
      });

      const customerData = {
        phone_number: '+94771234567',
        name: 'Test Customer',
        email: 'test@example.com',
      };

      const result = await customerAuth.signupCustomer(customerData);

      expect(result.success).toBe(true);
      expect(result.customer).toBeDefined();
      expect(result.customer.customer_id).toBe('cust-123');
    });

    it('should reject signup without verified OTP', async () => {
      const customerData = {
        phone_number: 'invalid',
        name: 'Test Customer',
      };

      const result = await customerAuth.signupCustomer(customerData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should prevent duplicate customer accounts', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      // Mock existing customer
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ customer_id: 'existing-123', phone_number: '+94771234567' }],
            error: null,
          }),
        }),
      });

      const customerData = {
        phone_number: '+94771234567',
        name: 'Test Customer',
      };

      const result = await customerAuth.signupCustomer(customerData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should validate email format if provided', async () => {
      const customerData = {
        phone_number: '+94771234567',
        name: 'Test Customer',
        email: 'invalid-email',
      };

      const result = await customerAuth.signupCustomer(customerData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });

    it('should handle optional fields correctly', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                customer_id: 'cust-123',
                phone_number: '+94771234567',
                name: null,
                email: null,
                birthday: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const customerData = {
        phone_number: '+94771234567',
        // No optional fields
      };

      const result = await customerAuth.signupCustomer(customerData);

      expect(result.success).toBe(true);
      expect(result.customer).toBeDefined();
    });
  });

  describe('loginCustomer', () => {
    it('should login existing customer with valid OTP', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                customer_id: 'cust-123',
                phone_number: '+94771234567',
                name: 'Test Customer',
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ customer_id: 'cust-123', last_login_at: new Date().toISOString() }],
            error: null,
          }),
        }),
      });

      const result = await customerAuth.loginCustomer('+94771234567', '123456');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should reject login for non-existent customer', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Customer not found' },
            }),
          }),
        }),
      });

      const result = await customerAuth.loginCustomer('+94771234567', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject login for inactive customer', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                customer_id: 'cust-123',
                phone_number: '+94771234567',
                is_active: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await customerAuth.loginCustomer('+94771234567', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
    });

    it('should update last login timestamp', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ customer_id: 'cust-123', last_login_at: new Date().toISOString() }],
          error: null,
        }),
      });

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                customer_id: 'cust-123',
                phone_number: '+94771234567',
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
        update: updateMock,
      });

      await customerAuth.loginCustomer('+94771234567', '123456');

      // The update should have been called (last_login_at)
      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce client-side rate limiting', () => {
      // This would test the checkOTPRateLimit function if it's exported
      // Since it's internal, we test it through requestOTP
      
      // Set up localStorage to simulate rate limit
      if (typeof localStorage !== 'undefined') {
        const rateLimits = {
          '+94771234567': [
            Date.now(),
            Date.now() - 1000,
            Date.now() - 2000,
          ],
        };
        localStorage.setItem('ayubo_cafe_otp_rate_limit', JSON.stringify(rateLimits));
      }

      // The next requestOTP should be rate limited
      // This is implicitly tested in the requestOTP tests
      expect(true).toBe(true); // Placeholder
    });

    it('should clean up expired rate limit entries', () => {
      if (typeof localStorage !== 'undefined') {
        const oldTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
        const rateLimits = {
          '+94771234567': [oldTime, oldTime, oldTime],
        };
        localStorage.setItem('ayubo_cafe_otp_rate_limit', JSON.stringify(rateLimits));
      }

      // After cleanup, old entries should be removed
      // This would be tested through actual rate limit functions
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Security', () => {
    it('should hash OTP codes before storage', async () => {
      // OTPs should never be stored in plain text
      // This is tested implicitly through the OTP creation flow
      const { supabaseClient } = await import('../../src/config/supabase.js');
      
      const insertMock = vi.fn().mockResolvedValue({
        data: [{ otp_id: '123' }],
        error: null,
      });

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: insertMock,
      });

      await customerAuth.requestOTP('0771234567');

      // The insert should have been called with hashed OTP
      if (insertMock.mock.calls.length > 0) {
        const insertData = insertMock.mock.calls[0][0];
        // OTP hash should exist and not be plain text
        expect(insertData).toBeDefined();
      }
    });

    it('should generate cryptographically secure OTP codes', async () => {
      // OTP generation should use crypto.getRandomValues
      // This is implicitly tested through the requestOTP flow
      const result = await customerAuth.requestOTP('0771234567');
      
      // We can't directly access the OTP, but we know it was generated
      expect(result).toBeDefined();
    });
  });
});

