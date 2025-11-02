/**
 * Batch Tracking Tests
 * 
 * Tests for batch tracking utilities (Tasks 7.1-7.6)
 * Tests core batch management, age calculations, and FIFO logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase for database operations
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('../../src/config/supabase', () => ({
  supabaseClient: mockSupabase,
}));

// Import functions to test (pure functions that don't need Supabase)
import {
  calculateBatchAge,
  getBatchAgeCategory,
  getBatchAgeColors,
  sortBatchesByAge,
  getTotalStockForProduct,
  isValidBatchQuantity
} from '../../src/utils/batchTracking';

describe('Batch Tracking Utilities', () => {
  
  describe('calculateBatchAge (7.2)', () => {
    it('should return 0 for today', () => {
      const today = new Date();
      const age = calculateBatchAge(today);
      expect(age).toBe(0);
    });

    it('should return 1 for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const age = calculateBatchAge(yesterday);
      expect(age).toBe(1);
    });

    it('should return correct age for 3 days ago', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const age = calculateBatchAge(threeDaysAgo);
      expect(age).toBe(3);
    });

    it('should return correct age for 10 days ago', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const age = calculateBatchAge(tenDaysAgo);
      expect(age).toBe(10);
    });

    it('should return 0 for null or undefined date', () => {
      expect(calculateBatchAge(null)).toBe(0);
      expect(calculateBatchAge(undefined)).toBe(0);
    });

    it('should handle ISO date strings', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const isoString = fiveDaysAgo.toISOString();
      const age = calculateBatchAge(isoString);
      expect(age).toBe(5);
    });

    it('should never return negative age', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const age = calculateBatchAge(futureDate);
      expect(age).toBeGreaterThanOrEqual(0);
    });

    it('should ignore time portion and only compare dates', () => {
      const todayMorning = new Date();
      todayMorning.setHours(8, 0, 0, 0);
      
      const todayEvening = new Date();
      todayEvening.setHours(20, 0, 0, 0);
      
      const age1 = calculateBatchAge(todayMorning);
      const age2 = calculateBatchAge(todayEvening);
      
      expect(age1).toBe(0);
      expect(age2).toBe(0);
    });
  });

  describe('getBatchAgeCategory (7.3)', () => {
    it('should return "fresh" for 0 days', () => {
      expect(getBatchAgeCategory(0)).toBe('fresh');
    });

    it('should return "fresh" for 1 day', () => {
      expect(getBatchAgeCategory(1)).toBe('fresh');
    });

    it('should return "fresh" for 2 days', () => {
      expect(getBatchAgeCategory(2)).toBe('fresh');
    });

    it('should return "medium" for 3 days', () => {
      expect(getBatchAgeCategory(3)).toBe('medium');
    });

    it('should return "medium" for 5 days', () => {
      expect(getBatchAgeCategory(5)).toBe('medium');
    });

    it('should return "medium" for 7 days', () => {
      expect(getBatchAgeCategory(7)).toBe('medium');
    });

    it('should return "old" for 8 days', () => {
      expect(getBatchAgeCategory(8)).toBe('old');
    });

    it('should return "old" for 10 days', () => {
      expect(getBatchAgeCategory(10)).toBe('old');
    });

    it('should return "old" for 30 days', () => {
      expect(getBatchAgeCategory(30)).toBe('old');
    });

    it('should handle edge cases at boundaries', () => {
      expect(getBatchAgeCategory(2)).toBe('fresh');
      expect(getBatchAgeCategory(3)).toBe('medium');
      expect(getBatchAgeCategory(7)).toBe('medium');
      expect(getBatchAgeCategory(8)).toBe('old');
    });
  });

  describe('getBatchAgeColors (7.3)', () => {
    it('should return green colors for fresh batches (0-2 days)', () => {
      const colors0 = getBatchAgeColors(0);
      const colors1 = getBatchAgeColors(1);
      const colors2 = getBatchAgeColors(2);

      expect(colors0.bg).toBe('bg-green-100');
      expect(colors0.text).toBe('text-green-800');
      expect(colors1.bg).toBe('bg-green-100');
      expect(colors2.bg).toBe('bg-green-100');
      expect(colors0.badge).toBe('bg-green-500');
    });

    it('should return yellow colors for medium batches (3-7 days)', () => {
      const colors3 = getBatchAgeColors(3);
      const colors5 = getBatchAgeColors(5);
      const colors7 = getBatchAgeColors(7);

      expect(colors3.bg).toBe('bg-yellow-100');
      expect(colors3.text).toBe('text-yellow-800');
      expect(colors5.bg).toBe('bg-yellow-100');
      expect(colors7.bg).toBe('bg-yellow-100');
      expect(colors3.badge).toBe('bg-yellow-500');
    });

    it('should return red colors for old batches (8+ days)', () => {
      const colors8 = getBatchAgeColors(8);
      const colors10 = getBatchAgeColors(10);
      const colors20 = getBatchAgeColors(20);

      expect(colors8.bg).toBe('bg-red-100');
      expect(colors8.text).toBe('text-red-800');
      expect(colors10.bg).toBe('bg-red-100');
      expect(colors20.bg).toBe('bg-red-100');
      expect(colors8.badge).toBe('bg-red-500');
    });

    it('should return all color properties', () => {
      const colors = getBatchAgeColors(5);
      
      expect(colors).toHaveProperty('bg');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('badge');
    });
  });

  describe('sortBatchesByAge (7.4)', () => {
    it('should sort batches oldest first for FIFO', () => {
      const batches = [
        { id: 1, date_added: '2025-01-25' },
        { id: 2, date_added: '2025-01-23' }, // Oldest
        { id: 3, date_added: '2025-01-27' }, // Newest
      ];

      const sorted = sortBatchesByAge(batches);

      expect(sorted[0].id).toBe(2); // Oldest first
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(3); // Newest last
    });

    it('should handle single batch', () => {
      const batches = [
        { id: 1, date_added: '2025-01-25' },
      ];

      const sorted = sortBatchesByAge(batches);

      expect(sorted.length).toBe(1);
      expect(sorted[0].id).toBe(1);
    });

    it('should return empty array for empty input', () => {
      const sorted = sortBatchesByAge([]);
      expect(sorted).toEqual([]);
    });

    it('should return empty array for null/undefined input', () => {
      expect(sortBatchesByAge(null)).toEqual([]);
      expect(sortBatchesByAge(undefined)).toEqual([]);
    });

    it('should not mutate original array', () => {
      const batches = [
        { id: 1, date_added: '2025-01-25' },
        { id: 2, date_added: '2025-01-23' },
      ];

      const originalFirst = batches[0].id;
      sortBatchesByAge(batches);

      expect(batches[0].id).toBe(originalFirst);
    });

    it('should handle dates with same date (stable sort)', () => {
      const batches = [
        { id: 1, date_added: '2025-01-25' },
        { id: 2, date_added: '2025-01-25' },
        { id: 3, date_added: '2025-01-25' },
      ];

      const sorted = sortBatchesByAge(batches);

      expect(sorted.length).toBe(3);
      expect(sorted.every(b => b.date_added === '2025-01-25')).toBe(true);
    });

    it('should handle multiple batches with mixed ages', () => {
      const batches = [
        { id: 1, date_added: '2025-01-20' }, // 10 days ago
        { id: 2, date_added: '2025-01-28' }, // 2 days ago
        { id: 3, date_added: '2025-01-15' }, // 15 days ago (oldest)
        { id: 4, date_added: '2025-01-29' }, // 1 day ago
      ];

      const sorted = sortBatchesByAge(batches);

      expect(sorted[0].id).toBe(3); // Oldest
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(2);
      expect(sorted[3].id).toBe(4); // Newest
    });

    it('should handle ISO datetime strings', () => {
      const batches = [
        { id: 1, date_added: '2025-01-25T10:30:00Z' },
        { id: 2, date_added: '2025-01-23T15:45:00Z' },
        { id: 3, date_added: '2025-01-27T08:00:00Z' },
      ];

      const sorted = sortBatchesByAge(batches);

      expect(sorted[0].id).toBe(2);
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(3);
    });
  });

  describe('getTotalStockForProduct', () => {
    it('should sum quantities from multiple batches', () => {
      const batches = [
        { product_id: 1, quantity: 10 },
        { product_id: 1, quantity: 15 },
        { product_id: 1, quantity: 5 },
      ];

      const total = getTotalStockForProduct(batches);
      expect(total).toBe(30);
    });

    it('should handle single batch', () => {
      const batches = [
        { product_id: 1, quantity: 25 },
      ];

      const total = getTotalStockForProduct(batches);
      expect(total).toBe(25);
    });

    it('should return 0 for empty batches', () => {
      expect(getTotalStockForProduct([])).toBe(0);
    });

    it('should handle decimal quantities', () => {
      const batches = [
        { product_id: 1, quantity: 10.5 },
        { product_id: 1, quantity: 7.25 },
      ];

      const total = getTotalStockForProduct(batches);
      expect(total).toBe(17.75);
    });

    it('should ignore batches with zero quantity in sum', () => {
      const batches = [
        { product_id: 1, quantity: 10 },
        { product_id: 1, quantity: 0 },
        { product_id: 1, quantity: 5 },
      ];

      const total = getTotalStockForProduct(batches);
      expect(total).toBe(15);
    });
  });

  describe('isValidBatchQuantity', () => {
    it('should return true for positive numbers', () => {
      expect(isValidBatchQuantity(1)).toBe(true);
      expect(isValidBatchQuantity(10)).toBe(true);
      expect(isValidBatchQuantity(100.5)).toBe(true);
      expect(isValidBatchQuantity(0.1)).toBe(true);
    });

    it('should return true for zero', () => {
      expect(isValidBatchQuantity(0)).toBe(true);
    });

    it('should return false for negative numbers', () => {
      expect(isValidBatchQuantity(-1)).toBe(false);
      expect(isValidBatchQuantity(-10)).toBe(false);
      expect(isValidBatchQuantity(-0.1)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidBatchQuantity(0)).toBe(true);
      expect(isValidBatchQuantity(null)).toBe(false);
      expect(isValidBatchQuantity(undefined)).toBe(false);
      expect(isValidBatchQuantity('invalid')).toBe(false);
    });
  });

  // Task 7.6: Edge cases
  describe('Edge Cases (7.6)', () => {
    it('should handle invalid date formats gracefully', () => {
      const age1 = calculateBatchAge('invalid-date');
      const age2 = calculateBatchAge('2025-13-45'); // Invalid date
      
      // Should not throw errors
      expect(typeof age1).toBe('number');
      expect(typeof age2).toBe('number');
    });

    it('should handle batches with missing or null properties', () => {
      const batches = [
        { id: 1, date_added: '2025-01-25', quantity: 10 },
        { id: 2, quantity: 5 }, // Missing date_added
        null, // Null batch
        undefined, // Undefined batch
      ].filter(Boolean); // Filter null/undefined

      // Should not throw errors
      expect(() => sortBatchesByAge(batches)).not.toThrow();
    });

    it('should handle extreme date values', () => {
      const veryOldDate = new Date('2000-01-01');
      const age = calculateBatchAge(veryOldDate);
      
      expect(age).toBeGreaterThan(0);
      expect(age).toBeLessThan(10000); // Sanity check
    });

    it('should handle batches with extremely large quantities', () => {
      const batches = [
        { product_id: 1, quantity: 999999999 },
        { product_id: 1, quantity: 0.0001 },
      ];

      const total = getTotalStockForProduct(batches);
      expect(total).toBeCloseTo(999999999.0001);
    });

    it('should handle empty strings and whitespace', () => {
      expect(isValidBatchQuantity('')).toBe(false); // NaN
      expect(isValidBatchQuantity('   ')).toBe(false); // NaN
      expect(isValidBatchQuantity('0')).toBe(true); // parseFloat converts to 0
      expect(isValidBatchQuantity('10')).toBe(true); // parseFloat converts to 10
    });
  });
});

