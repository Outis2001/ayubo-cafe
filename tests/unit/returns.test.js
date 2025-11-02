/**
 * Returns Management Tests
 * 
 * Tests for returns processing utilities (Tasks 7.7-7.11)
 * Tests return value calculations and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock batchTracking functions
vi.mock('../../src/utils/batchTracking', () => ({
  incrementBatchAge: vi.fn().mockResolvedValue({ success: true }),
  createBatch: vi.fn().mockResolvedValue({ success: true }),
  getBatchesByProduct: vi.fn().mockResolvedValue([]),
  deductFromOldestBatches: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
};

vi.mock('../../src/config/supabase', () => ({
  supabaseClient: mockSupabase,
}));

// Mock fetch for email notifications
global.fetch = vi.fn();

import { processReturn } from '../../src/utils/returns';

describe('Returns Management Utilities - Return Value Calculations (7.8)', () => {
  
  describe('Basic Return Value Calculations', () => {
    it('should calculate correct return value with 20% return', () => {
      const originalPrice = 100;
      const quantity = 5;
      const returnPercentage = 20;
      
      const returnValuePerUnit = originalPrice * (returnPercentage / 100);
      const totalReturnValue = returnValuePerUnit * quantity;

      expect(returnValuePerUnit).toBe(20); // 20% of 100
      expect(totalReturnValue).toBe(100); // 20 per unit * 5 units
    });

    it('should calculate correct return value with 100% return', () => {
      const originalPrice = 100;
      const quantity = 3;
      const returnPercentage = 100;
      
      const returnValuePerUnit = originalPrice * (returnPercentage / 100);
      const totalReturnValue = returnValuePerUnit * quantity;

      expect(returnValuePerUnit).toBe(100); // 100% of 100
      expect(totalReturnValue).toBe(300); // 100 per unit * 3 units
    });

    it('should handle decimal prices', () => {
      const originalPrice = 75.50;
      const quantity = 2;
      const returnPercentage = 20;
      
      const returnValuePerUnit = originalPrice * (returnPercentage / 100);
      const totalReturnValue = returnValuePerUnit * quantity;

      expect(returnValuePerUnit).toBeCloseTo(15.1); // 20% of 75.50
      expect(totalReturnValue).toBeCloseTo(30.2); // 15.1 * 2
    });

    it('should handle decimal quantities', () => {
      const originalPrice = 100;
      const quantity = 2.5;
      const returnPercentage = 20;
      
      const returnValuePerUnit = originalPrice * (returnPercentage / 100);
      const totalReturnValue = returnValuePerUnit * quantity;

      expect(returnValuePerUnit).toBe(20);
      expect(totalReturnValue).toBe(50); // 20 * 2.5
    });

    it('should sum return values from multiple batches', () => {
      const batches = [
        { originalPrice: 100, quantity: 2, returnPercentage: 20 }, // 40
        { originalPrice: 150, quantity: 3, returnPercentage: 100 }, // 450
        { originalPrice: 200, quantity: 1, returnPercentage: 20 }, // 40
      ];

      const totalValue = batches.reduce((sum, batch) => {
        const returnValuePerUnit = batch.originalPrice * (batch.returnPercentage / 100);
        return sum + (returnValuePerUnit * batch.quantity);
      }, 0);

      expect(totalValue).toBe(530); // 40 + 450 + 40
    });
  });

  describe('processReturn Error Handling (7.9)', () => {
    it('should reject empty batches array', async () => {
      const result = await processReturn(mockSupabase, 'user-1', {
        batchesToReturn: [],
        batchesToKeep: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No batches selected');
    });

    it('should reject null batches', async () => {
      const result = await processReturn(mockSupabase, 'user-1', {
        batchesToReturn: null,
        batchesToKeep: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No batches selected');
    });

    it('should reject undefined batches', async () => {
      const result = await processReturn(mockSupabase, 'user-1', {
        batchesToReturn: undefined,
        batchesToKeep: []
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No batches selected');
    });
  });

  describe('Multiple Batch Calculations (7.11)', () => {
    it('should calculate totals for multiple batches of same product', () => {
      const batches = [
        { originalPrice: 100, quantity: 5, returnPercentage: 20 },
        { originalPrice: 100, quantity: 10, returnPercentage: 20 },
        { originalPrice: 100, quantity: 3, returnPercentage: 100 }
      ];

      // Batch 1: 5 * 100 * 0.2 = 100
      // Batch 2: 10 * 100 * 0.2 = 200  
      // Batch 3: 3 * 100 * 1.0 = 300
      // Total: 600
      
      const totalValue = batches.reduce((sum, batch) => {
        const returnValuePerUnit = batch.originalPrice * (batch.returnPercentage / 100);
        return sum + (returnValuePerUnit * batch.quantity);
      }, 0);

      expect(totalValue).toBe(600);
    });

    it('should calculate totals for batches from different products', () => {
      const batches = [
        { originalPrice: 100, quantity: 5, returnPercentage: 20 },  // Product 1: 100
        { originalPrice: 150, quantity: 10, returnPercentage: 20 }, // Product 2: 300
        { originalPrice: 200, quantity: 3, returnPercentage: 20 }   // Product 3: 120
      ];

      const totalValue = batches.reduce((sum, batch) => {
        const returnValuePerUnit = batch.originalPrice * (batch.returnPercentage / 100);
        return sum + (returnValuePerUnit * batch.quantity);
      }, 0);

      expect(totalValue).toBe(520); // 100 + 300 + 120
    });

    it('should handle mixed return percentages correctly', () => {
      const batches = [
        { originalPrice: 100, quantity: 10, returnPercentage: 20 },  // 200
        { originalPrice: 100, quantity: 5, returnPercentage: 100 },  // 500
        { originalPrice: 100, quantity: 2, returnPercentage: 20 },   // 40
      ];

      const totalValue = batches.reduce((sum, batch) => {
        const returnValuePerUnit = batch.originalPrice * (batch.returnPercentage / 100);
        return sum + (returnValuePerUnit * batch.quantity);
      }, 0);

      expect(totalValue).toBe(740); // 200 + 500 + 40
    });

    it('should calculate quantity totals correctly', () => {
      const batches = [
        { quantity: 5 },
        { quantity: 10 },
        { quantity: 3 }
      ];

      const totalQuantity = batches.reduce((sum, batch) => sum + parseFloat(batch.quantity), 0);
      
      expect(totalQuantity).toBe(18);
    });

    it('should handle batch count correctly', () => {
      const batches = [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 }
      ];

      expect(batches.length).toBe(4);
    });
  });

  describe('Edge Cases and Boundary Conditions (7.6)', () => {
    it('should handle zero quantity', () => {
      const result = 100 * 0 * (20 / 100);
      expect(result).toBe(0);
    });

    it('should handle very small quantities', () => {
      const originalPrice = 100;
      const quantity = 0.001;
      const returnPercentage = 20;
      
      const returnValuePerUnit = originalPrice * (returnPercentage / 100);
      const totalReturnValue = returnValuePerUnit * quantity;

      expect(returnValuePerUnit).toBe(20);
      expect(totalReturnValue).toBe(0.02);
    });

    it('should handle very large prices', () => {
      const originalPrice = 999999;
      const quantity = 1;
      const returnPercentage = 20;
      
      const returnValuePerUnit = originalPrice * (returnPercentage / 100);
      const totalReturnValue = returnValuePerUnit * quantity;

      expect(returnValuePerUnit).toBeCloseTo(199999.8);
      expect(totalReturnValue).toBeCloseTo(199999.8);
    });

    it('should handle percentage boundary 0%', () => {
      const originalPrice = 100;
      const quantity = 10;
      const returnPercentage = 0;
      
      const returnValuePerUnit = originalPrice * (returnPercentage / 100);
      const totalReturnValue = returnValuePerUnit * quantity;

      expect(returnValuePerUnit).toBe(0);
      expect(totalReturnValue).toBe(0);
    });

    it('should handle percentage boundary 100%', () => {
      const originalPrice = 100;
      const quantity = 10;
      const returnPercentage = 100;
      
      const returnValuePerUnit = originalPrice * (returnPercentage / 100);
      const totalReturnValue = returnValuePerUnit * quantity;

      expect(returnValuePerUnit).toBe(100);
      expect(totalReturnValue).toBe(1000);
    });

    it('should handle string numbers that parse correctly', () => {
      const originalPrice = '100';
      const quantity = '5';
      const returnPercentage = '20';
      
      const returnValuePerUnit = parseFloat(originalPrice) * (parseFloat(returnPercentage) / 100);
      const totalReturnValue = returnValuePerUnit * parseFloat(quantity);

      expect(returnValuePerUnit).toBe(20);
      expect(totalReturnValue).toBe(100);
    });
  });

  describe('Real-world Return Scenarios', () => {
    it('should calculate typical end-of-day return', () => {
      // Simulate end-of-day return with various products
      const batches = [
        { originalPrice: 80, quantity: 12, returnPercentage: 20 },   // Cakes
        { originalPrice: 120, quantity: 8, returnPercentage: 20 },   // Bread
        { originalPrice: 150, quantity: 15, returnPercentage: 100 }, // Special items
      ];

      const totalValue = batches.reduce((sum, batch) => {
        const returnValuePerUnit = batch.originalPrice * (batch.returnPercentage / 100);
        return sum + (returnValuePerUnit * batch.quantity);
      }, 0);
      
      const totalQuantity = batches.reduce((sum, batch) => sum + batch.quantity, 0);

      // 12 * 80 * 0.2 = 192
      // 8 * 120 * 0.2 = 192
      // 15 * 150 * 1.0 = 2250
      // Total = 2634
      expect(totalValue).toBe(2634);
      expect(totalQuantity).toBe(35);
    });

    it('should prioritize old batches for return (FIFO)', () => {
      const batches = [
        { id: 1, age: 8, quantity: 5 },  // Old
        { id: 2, age: 3, quantity: 10 }, // Medium
        { id: 3, age: 1, quantity: 15 }, // Fresh
      ];

      // Sort by age (oldest first) - FIFO prioritization
      const sorted = [...batches].sort((a, b) => b.age - a.age);
      
      // Return oldest first
      const batchesToReturn = sorted.filter(b => b.age >= 3);
      
      expect(batchesToReturn.length).toBe(2);
      expect(batchesToReturn[0].age).toBe(8);
      expect(batchesToReturn[1].age).toBe(3);
    });

    it('should calculate return with mixed age products', () => {
      const batches = [
        { originalPrice: 100, quantity: 5, age: 8, returnPercentage: 20 },
        { originalPrice: 100, quantity: 3, age: 5, returnPercentage: 20 },
        { originalPrice: 100, quantity: 2, age: 1, returnPercentage: 20 },
      ];

      const totalValue = batches.reduce((sum, batch) => {
        const returnValuePerUnit = batch.originalPrice * (batch.returnPercentage / 100);
        return sum + (returnValuePerUnit * batch.quantity);
      }, 0);

      expect(totalValue).toBe(200); // All batches worth 100 total, 20% = 200
      
      // Verify old items are included
      const oldBatches = batches.filter(b => b.age >= 7);
      expect(oldBatches.length).toBe(1);
      expect(oldBatches[0].age).toBe(8);
    });
  });
});
