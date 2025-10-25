/**
 * Order Holds Utility Tests
 * 
 * Tests for order holds date validation and management functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getActiveOrderHolds,
  isDateBlocked,
  getBlockedDates,
  validatePickupDate,
  createOrderHold,
  deactivateOrderHold,
  deleteOrderHold,
} from '../../src/utils/orderHolds';

// Mock Supabase client
vi.mock('../../src/config/supabase', () => ({
  supabaseClient: {
    from: vi.fn(),
  },
}));

import { supabaseClient } from '../../src/config/supabase';

describe('Order Holds Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveOrderHolds', () => {
    it('should fetch active holds successfully', async () => {
      const mockHolds = [
        { hold_id: '1', hold_date: '2024-12-25', reason: 'Christmas' },
        { hold_id: '2', hold_date: '2024-12-31', reason: 'New Year Eve' },
      ];

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockHolds,
              error: null,
            }),
          }),
        }),
      });

      const result = await getActiveOrderHolds();

      expect(result.success).toBe(true);
      expect(result.holds).toEqual(mockHolds);
      expect(result.holds).toHaveLength(2);
    });

    it('should handle fetch errors', async () => {
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const result = await getActiveOrderHolds();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.holds).toEqual([]);
    });
  });

  describe('isDateBlocked', () => {
    it('should return true for blocked date', async () => {
      const mockHold = { hold_id: '1', reason: 'Fully booked' };

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockHold,
            error: null,
          }),
        }),
      });

      const result = await isDateBlocked('2024-12-25');

      expect(result.success).toBe(true);
      expect(result.isBlocked).toBe(true);
      expect(result.reason).toBe('Fully booked');
    });

    it('should return false for non-blocked date', async () => {
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await isDateBlocked('2024-12-26');

      expect(result.success).toBe(true);
      expect(result.isBlocked).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('should handle Date object input', async () => {
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const date = new Date('2024-12-26');
      const result = await isDateBlocked(date);

      expect(result.success).toBe(true);
      expect(result.isBlocked).toBe(false);
    });
  });

  describe('validatePickupDate', () => {
    it('should reject past dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = await validatePickupDate(yesterday, 2, 90);

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('past');
    });

    it('should reject dates less than minimum advance days', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = await validatePickupDate(tomorrow, 2, 90);

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('2 days in advance');
    });

    it('should reject dates more than maximum advance days', async () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 100);

      const result = await validatePickupDate(farFuture, 2, 90);

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('90 days in advance');
    });

    it('should accept valid date within range', async () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 5);

      // Mock isDateBlocked to return not blocked
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await validatePickupDate(validDate, 2, 90);

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject blocked dates', async () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 5);

      // Mock isDateBlocked to return blocked
      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { hold_id: '1', reason: 'Holiday' },
            error: null,
          }),
        }),
      });

      const result = await validatePickupDate(validDate, 2, 90);

      expect(result.success).toBe(true);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Holiday');
    });
  });

  describe('getBlockedDates', () => {
    it('should return array of blocked dates', async () => {
      const mockHolds = [
        { hold_id: '1', hold_date: '2024-12-25', reason: 'Christmas' },
        { hold_id: '2', hold_date: '2024-12-31', reason: 'New Year' },
      ];

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockHolds,
              error: null,
            }),
          }),
        }),
      });

      const result = await getBlockedDates();

      expect(result.success).toBe(true);
      expect(result.blockedDates).toHaveLength(2);
      expect(result.holdsMap['2024-12-25']).toEqual({
        reason: 'Christmas',
        holdId: '1',
      });
      expect(result.holdsMap['2024-12-31']).toEqual({
        reason: 'New Year',
        holdId: '2',
      });
    });
  });

  describe('createOrderHold', () => {
    it('should create hold successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dateString = futureDate.toISOString().split('T')[0];

      const mockHold = {
        hold_id: 'new-hold-id',
        hold_date: dateString,
        reason: 'Maintenance',
        is_active: true,
      };

      supabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockHold,
              error: null,
            }),
          }),
        }),
      });

      const result = await createOrderHold(dateString, 'Maintenance', 'user-123');

      expect(result.success).toBe(true);
      expect(result.hold).toEqual(mockHold);
    });

    it('should reject past dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateString = yesterday.toISOString().split('T')[0];

      const result = await createOrderHold(dateString, 'Test', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('past');
    });

    it('should handle duplicate date error', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const dateString = futureDate.toISOString().split('T')[0];

      supabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate key' },
            }),
          }),
        }),
      });

      const result = await createOrderHold(dateString, 'Test', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });

  describe('deactivateOrderHold', () => {
    it('should deactivate hold successfully', async () => {
      supabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await deactivateOrderHold('hold-123');

      expect(result.success).toBe(true);
    });

    it('should handle deactivation errors', async () => {
      supabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      const result = await deactivateOrderHold('hold-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('deleteOrderHold', () => {
    it('should delete hold successfully', async () => {
      supabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await deleteOrderHold('hold-123');

      expect(result.success).toBe(true);
    });

    it('should handle deletion errors', async () => {
      supabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Permission denied' },
          }),
        }),
      });

      const result = await deleteOrderHold('hold-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });
});

