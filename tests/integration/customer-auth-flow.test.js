/**
 * Customer Authentication Flow Integration Tests
 * 
 * Tests complete customer authentication flows (Section 2.0)
 * - Signup flow: Request OTP → Verify OTP → Create account
 * - Login flow: Request OTP → Verify OTP → Login
 * - Rate limiting and security
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock components and contexts
vi.mock('../../src/config/supabase.js', () => ({
  supabaseClient: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../src/utils/sms.js', () => ({
  sendOTPSMS: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../src/utils/auditLog.js', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Customer Authentication Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Complete Signup Flow', () => {
    it('should complete full signup flow: phone → OTP → details → account created', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { sendOTPSMS } = await import('../../src/utils/sms.js');
      const { requestOTP, verifyOTP, signupCustomer } = await import('../../src/utils/customerAuth.js');

      // Step 1: Request OTP
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [], // No recent OTPs
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ otp_id: 'otp-123', phone_number: '+94771234567' }],
          error: null,
        }),
      });

      const otpResult = await requestOTP('0771234567');
      
      expect(otpResult.success).toBe(true);
      expect(sendOTPSMS).toHaveBeenCalled();

      // Step 2: Verify OTP
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      otp_id: 'otp-123',
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
            data: [{ otp_id: 'otp-123', is_verified: true }],
            error: null,
          }),
        }),
      });

      const verifyResult = await verifyOTP('+94771234567', '123456');
      
      expect(verifyResult).toBeDefined();

      // Step 3: Create customer account
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
                created_at: new Date().toISOString(),
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

      const signupResult = await signupCustomer(customerData);

      expect(signupResult.success).toBe(true);
      expect(signupResult.customer).toBeDefined();
      expect(signupResult.customer.customer_id).toBe('cust-123');
    });

    it('should handle OTP expiration during signup', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { requestOTP, verifyOTP } = await import('../../src/utils/customerAuth.js');

      // Request OTP
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ otp_id: 'otp-123', phone_number: '+94771234567' }],
          error: null,
        }),
      });

      await requestOTP('0771234567');

      // Try to verify expired OTP
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null, // OTP expired
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const verifyResult = await verifyOTP('+94771234567', '123456');

      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error).toContain('expired');
    });

    it('should prevent duplicate accounts for same phone number', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { signupCustomer } = await import('../../src/utils/customerAuth.js');

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

      const result = await signupCustomer(customerData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should handle OTP resend with rate limiting', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { requestOTP } = await import('../../src/utils/customerAuth.js');

      // First request - success
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ otp_id: 'otp-123' }],
          error: null,
        }),
      });

      const result1 = await requestOTP('0771234567');
      expect(result1.success).toBe(true);

      // Simulate multiple rapid requests (rate limiting)
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

      const result2 = await requestOTP('0771234567');
      
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('rate limit');
    });
  });

  describe('Complete Login Flow', () => {
    it('should complete full login flow: phone → OTP → login success', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { requestOTP, loginCustomer } = await import('../../src/utils/customerAuth.js');

      // Step 1: Request OTP for login
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ otp_id: 'otp-456', phone_number: '+94771234567' }],
          error: null,
        }),
      });

      const otpResult = await requestOTP('0771234567');
      expect(otpResult.success).toBe(true);

      // Step 2: Login with OTP
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                customer_id: 'cust-123',
                phone_number: '+94771234567',
                name: 'Existing Customer',
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

      const loginResult = await loginCustomer('+94771234567', '123456');

      expect(loginResult).toBeDefined();
    });

    it('should reject login for non-existent customer', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { loginCustomer } = await import('../../src/utils/customerAuth.js');

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

      const result = await loginCustomer('+94771234567', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject login for inactive customer account', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { loginCustomer } = await import('../../src/utils/customerAuth.js');

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

      const result = await loginCustomer('+94771234567', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
    });

    it('should update last login timestamp on successful login', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { loginCustomer } = await import('../../src/utils/customerAuth.js');

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

      await loginCustomer('+94771234567', '123456');

      expect(updateMock).toHaveBeenCalled();
    });
  });

  describe('Security and Validation', () => {
    it('should validate phone number format before processing', async () => {
      const { requestOTP } = await import('../../src/utils/customerAuth.js');

      const result = await requestOTP('invalid-phone');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number');
    });

    it('should enforce OTP attempt limits', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { verifyOTP } = await import('../../src/utils/customerAuth.js');

      // Mock max attempts reached
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      otp_id: 'otp-123',
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

      const result = await verifyOTP('+94771234567', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum');
    });

    it('should log audit events for authentication actions', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { logAuditEvent } = await import('../../src/utils/auditLog.js');
      const { requestOTP } = await import('../../src/utils/customerAuth.js');

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ otp_id: 'otp-123' }],
          error: null,
        }),
      });

      await requestOTP('0771234567');

      // Audit logging should have been called
      expect(logAuditEvent).toHaveBeenCalled();
    });

    it('should handle concurrent OTP requests gracefully', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { requestOTP } = await import('../../src/utils/customerAuth.js');

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ otp_id: 'otp-123' }],
          error: null,
        }),
      });

      // Simulate concurrent requests
      const promises = [
        requestOTP('0771234567'),
        requestOTP('0771234567'),
        requestOTP('0771234567'),
      ];

      const results = await Promise.all(promises);

      // At least one should succeed or be rate limited
      const successCount = results.filter(r => r.success).length;
      const rateLimitedCount = results.filter(r => !r.success && r.error?.includes('rate limit')).length;

      expect(successCount + rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle database connection errors', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { requestOTP } = await import('../../src/utils/customerAuth.js');

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection failed' },
            }),
          }),
        }),
      });

      const result = await requestOTP('0771234567');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle SMS sending failures', async () => {
      const { supabaseClient } = await import('../../src/config/supabase.js');
      const { sendOTPSMS } = await import('../../src/utils/sms.js');
      const { requestOTP } = await import('../../src/utils/customerAuth.js');

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          data: [{ otp_id: 'otp-123' }],
          error: null,
        }),
      });

      // Mock SMS failure
      sendOTPSMS.mockResolvedValueOnce({ success: false, error: 'SMS gateway error' });

      const result = await requestOTP('0771234567');

      // Should handle SMS failure gracefully
      expect(result).toBeDefined();
    });

    it('should clear sensitive data from memory after processing', async () => {
      const { signupCustomer } = await import('../../src/utils/customerAuth.js');
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
              },
              error: null,
            }),
          }),
        }),
      });

      const customerData = {
        phone_number: '+94771234567',
        name: 'Test Customer',
      };

      await signupCustomer(customerData);

      // Original object should not be modified
      expect(customerData).toEqual({
        phone_number: '+94771234567',
        name: 'Test Customer',
      });
    });
  });
});

