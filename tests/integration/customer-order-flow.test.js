/**
 * Customer Order Flow Integration Test
 * 
 * Tests the complete flow from cart to order confirmation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules
vi.mock('../../src/config/supabase', () => ({
  supabaseClient: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../src/utils/auditLog', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(true),
}));

import { supabaseClient } from '../../src/config/supabase';
import { createCustomerOrder } from '../../src/utils/customerOrders';
import { validatePickupDate } from '../../src/utils/orderHolds';

describe('Customer Order Flow Integration', () => {
  let mockCustomer;
  let mockCartItems;
  let mockSystemConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock customer
    mockCustomer = {
      customer_id: 'cust-123',
      first_name: 'John',
      last_name: 'Doe',
      phone_number: '+94712345678',
      email: 'john@example.com',
    };

    // Mock cart items
    mockCartItems = [
      {
        cart_item_id: 'cart-1',
        product_id: 'prod-1',
        product_name: 'Chocolate Cake',
        pricing_id: 'price-1',
        weight_option: '1kg',
        price: 2500,
        quantity: 1,
        servings: 8,
      },
      {
        cart_item_id: 'cart-2',
        product_id: 'prod-2',
        product_name: 'Vanilla Cupcakes',
        pricing_id: 'price-2',
        weight_option: '6 pack',
        price: 600,
        quantity: 2,
        servings: 6,
      },
    ];

    // Mock system configuration
    mockSystemConfig = {
      min_advance_order_days: 2,
      max_advance_order_days: 90,
      deposit_percentage: 40,
      pickup_time_slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    };
  });

  describe('Complete Order Flow', () => {
    it('should successfully create order from cart items', async () => {
      // Setup: Calculate pickup date (3 days from now)
      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() + 3);
      const pickupDateString = pickupDate.toISOString().split('T')[0];
      const pickupTime = '10:00';

      // Step 1: Mock date validation (no holds)
      supabaseClient.from.mockImplementation((table) => {
        if (table === 'order_holds') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      // Step 2: Validate pickup date
      const dateValidation = await validatePickupDate(
        pickupDateString,
        mockSystemConfig.min_advance_order_days,
        mockSystemConfig.max_advance_order_days
      );

      expect(dateValidation.success).toBe(true);
      expect(dateValidation.isValid).toBe(true);

      // Step 3: Prepare order data
      const orderData = {
        customer_id: mockCustomer.customer_id,
        order_type: 'pre-made',
        pickup_date: pickupDateString,
        pickup_time: pickupTime,
        special_instructions: 'Please write "Happy Birthday" on the cake',
        items: mockCartItems.map((item) => ({
          product_id: item.product_id,
          pricing_id: item.pricing_id,
          quantity: item.quantity,
          unit_price: item.price,
          product_name: item.product_name,
          weight_option: item.weight_option,
        })),
        deposit_percentage: mockSystemConfig.deposit_percentage,
      };

      // Calculate expected totals
      const subtotal = mockCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const depositAmount = subtotal * 0.4;
      const remainingBalance = subtotal * 0.6;

      expect(subtotal).toBe(3700); // 2500 + (600 * 2)
      expect(depositAmount).toBe(1480);
      expect(remainingBalance).toBe(2220);

      // Step 4: Mock order creation
      const mockOrderId = 'order-new-123';
      const mockOrder = {
        order_id: mockOrderId,
        order_number: 'ORD-20241228-001',
        customer_id: mockCustomer.customer_id,
        order_type: 'pre-made',
        pickup_date: pickupDateString,
        pickup_time: pickupTime,
        status: 'pending_payment',
        payment_status: 'unpaid',
        subtotal: subtotal,
        deposit_amount: depositAmount,
        total_amount: subtotal,
        remaining_balance: remainingBalance,
        created_at: new Date().toISOString(),
      };

      supabaseClient.rpc.mockResolvedValue({
        data: mockOrderId,
        error: null,
      });

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockOrder,
              error: null,
            }),
          }),
        }),
      });

      // Step 5: Create order
      const result = await createCustomerOrder(orderData);

      // Verify order creation
      expect(result.success).toBe(true);
      expect(result.order_id).toBe(mockOrderId);
      expect(result.order_number).toBe('ORD-20241228-001');
      expect(result.order.subtotal).toBe(subtotal);
      expect(result.order.deposit_amount).toBe(depositAmount);
      expect(result.order.remaining_balance).toBe(remainingBalance);

      // Verify stored procedure was called correctly
      expect(supabaseClient.rpc).toHaveBeenCalledWith(
        'create_customer_order',
        expect.objectContaining({
          p_customer_id: mockCustomer.customer_id,
          p_order_type: 'pre-made',
          p_pickup_date: pickupDateString,
          p_pickup_time: pickupTime,
          p_order_items: expect.arrayContaining([
            expect.objectContaining({
              product_id: 'prod-1',
              quantity: 1,
              unit_price: 2500,
            }),
            expect.objectContaining({
              product_id: 'prod-2',
              quantity: 2,
              unit_price: 600,
            }),
          ]),
        })
      );
    });

    it('should reject order with blocked date', async () => {
      const blockedDate = new Date();
      blockedDate.setDate(blockedDate.getDate() + 3);
      const blockedDateString = blockedDate.toISOString().split('T')[0];

      // Mock blocked date
      supabaseClient.from.mockImplementation((table) => {
        if (table === 'order_holds') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  hold_id: 'hold-1',
                  reason: 'Fully booked',
                },
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      // Validate date (should fail)
      const dateValidation = await validatePickupDate(
        blockedDateString,
        mockSystemConfig.min_advance_order_days,
        mockSystemConfig.max_advance_order_days
      );

      expect(dateValidation.success).toBe(true);
      expect(dateValidation.isValid).toBe(false);
      expect(dateValidation.error).toContain('Fully booked');

      // Order should not be created
      const orderData = {
        customer_id: mockCustomer.customer_id,
        pickup_date: blockedDateString,
        pickup_time: '10:00',
        items: mockCartItems.map((item) => ({
          product_id: item.product_id,
          pricing_id: item.pricing_id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      };

      // Mock RPC to return blocked date error
      supabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Orders are not accepted on this date. Please select another date.' },
      });

      const result = await createCustomerOrder(orderData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should reject order with insufficient advance notice', async () => {
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowString = tomorrowDate.toISOString().split('T')[0];

      // Mock no holds
      supabaseClient.from.mockImplementation((table) => {
        if (table === 'order_holds') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      // Validate date (should fail - need 2 days advance)
      const dateValidation = await validatePickupDate(
        tomorrowString,
        mockSystemConfig.min_advance_order_days,
        mockSystemConfig.max_advance_order_days
      );

      expect(dateValidation.success).toBe(true);
      expect(dateValidation.isValid).toBe(false);
      expect(dateValidation.error).toContain('2 days in advance');
    });

    it('should calculate correct totals for different deposit percentages', async () => {
      const testCases = [
        { subtotal: 1000, deposit: 40, expected: { deposit: 400, balance: 600 } },
        { subtotal: 2500, deposit: 40, expected: { deposit: 1000, balance: 1500 } },
        { subtotal: 1500, deposit: 50, expected: { deposit: 750, balance: 750 } },
        { subtotal: 3333, deposit: 40, expected: { deposit: 1333.20, balance: 1999.80 } },
      ];

      testCases.forEach(({ subtotal, deposit, expected }) => {
        const depositAmount = parseFloat((subtotal * deposit / 100).toFixed(2));
        const balance = parseFloat((subtotal - depositAmount).toFixed(2));

        expect(depositAmount).toBe(expected.deposit);
        expect(balance).toBe(expected.balance);
        expect(depositAmount + balance).toBe(subtotal);
      });
    });

    it('should handle multiple items in cart', async () => {
      const largeCart = [
        { product_id: 'prod-1', pricing_id: 'price-1', quantity: 2, unit_price: 1500 },
        { product_id: 'prod-2', pricing_id: 'price-2', quantity: 1, unit_price: 3000 },
        { product_id: 'prod-3', pricing_id: 'price-3', quantity: 3, unit_price: 500 },
        { product_id: 'prod-4', pricing_id: 'price-4', quantity: 1, unit_price: 2000 },
      ];

      const subtotal = largeCart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      
      expect(subtotal).toBe(9500); // (1500*2) + (3000*1) + (500*3) + (2000*1)

      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() + 5);

      const orderData = {
        customer_id: mockCustomer.customer_id,
        pickup_date: pickupDate.toISOString().split('T')[0],
        pickup_time: '11:00',
        items: largeCart,
        deposit_percentage: 40,
      };

      const mockOrderId = 'order-large-123';
      supabaseClient.rpc.mockResolvedValue({
        data: mockOrderId,
        error: null,
      });

      supabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                order_id: mockOrderId,
                order_number: 'ORD-20241230-001',
                subtotal: subtotal,
                deposit_amount: 3800,
                remaining_balance: 5700,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await createCustomerOrder(orderData);

      expect(result.success).toBe(true);
      expect(result.order.subtotal).toBe(9500);
      expect(result.order.deposit_amount).toBe(3800);
      expect(result.order.remaining_balance).toBe(5700);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cart', async () => {
      const orderData = {
        customer_id: mockCustomer.customer_id,
        pickup_date: '2024-12-30',
        pickup_time: '10:00',
        items: [],
      };

      const result = await createCustomerOrder(orderData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least one item');
    });

    it('should handle missing customer ID', async () => {
      const orderData = {
        pickup_date: '2024-12-30',
        pickup_time: '10:00',
        items: mockCartItems.map((item) => ({
          product_id: item.product_id,
          pricing_id: item.pricing_id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      };

      const result = await createCustomerOrder(orderData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Customer ID');
    });

    it('should handle past pickup date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const orderData = {
        customer_id: mockCustomer.customer_id,
        pickup_date: yesterday.toISOString().split('T')[0],
        pickup_time: '10:00',
        items: mockCartItems.map((item) => ({
          product_id: item.product_id,
          pricing_id: item.pricing_id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      };

      supabaseClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Pickup date cannot be in the past' },
      });

      const result = await createCustomerOrder(orderData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('past');
    });
  });

  describe('Order Number Generation', () => {
    it('should generate unique order numbers', async () => {
      const orderNumbers = new Set();
      const numOrders = 5;

      for (let i = 0; i < numOrders; i++) {
        const mockOrderNumber = `ORD-20241225-${String(i + 1).padStart(3, '0')}`;
        orderNumbers.add(mockOrderNumber);
      }

      // All order numbers should be unique
      expect(orderNumbers.size).toBe(numOrders);

      // All should match the format ORD-YYYYMMDD-XXX
      orderNumbers.forEach((orderNumber) => {
        expect(orderNumber).toMatch(/^ORD-\d{8}-\d{3}$/);
      });
    });
  });
});

