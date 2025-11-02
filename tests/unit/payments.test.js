/**
 * Payment Utilities Tests
 * 
 * Unit tests for payment processing utilities (Task 7.0)
 * Tests payment record creation, status updates, verification, and calculations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase
vi.mock('../../src/config/supabase', () => ({
  supabaseClient: {
    from: vi.fn(),
  },
}));

vi.mock('../../src/utils/auditLog', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Payment Utilities', () => {
  let supabaseMock;
  let payments;

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('../../src/config/supabase');
    supabaseMock = supabaseModule.supabaseClient;
    payments = await import('../../src/utils/payments');
  });

  describe('Payment Constants', () => {
    it('should export payment methods', () => {
      expect(payments.PAYMENT_METHODS).toBeDefined();
      expect(payments.PAYMENT_METHODS.STRIPE).toBe('stripe');
      expect(payments.PAYMENT_METHODS.BANK_TRANSFER).toBe('bank_transfer');
    });

    it('should export payment status values', () => {
      expect(payments.PAYMENT_STATUS).toBeDefined();
      expect(payments.PAYMENT_STATUS.PENDING).toBe('pending');
      expect(payments.PAYMENT_STATUS.SUCCESS).toBe('success');
      expect(payments.PAYMENT_STATUS.FAILED).toBe('failed');
      expect(payments.PAYMENT_STATUS.PENDING_VERIFICATION).toBe('pending_verification');
    });

    it('should export payment types', () => {
      expect(payments.PAYMENT_TYPES).toBeDefined();
      expect(payments.PAYMENT_TYPES.DEPOSIT).toBe('deposit');
      expect(payments.PAYMENT_TYPES.BALANCE).toBe('balance');
      expect(payments.PAYMENT_TYPES.FULL).toBe('full');
    });
  });

  describe('calculateDepositAmount', () => {
    it('should calculate 40% deposit correctly', () => {
      expect(payments.calculateDepositAmount(1000)).toBe(400);
      expect(payments.calculateDepositAmount(2500)).toBe(1000);
      expect(payments.calculateDepositAmount(5000)).toBe(2000);
    });

    it('should handle decimal amounts', () => {
      expect(payments.calculateDepositAmount(1234.56)).toBeCloseTo(493.824, 2);
    });

    it('should handle string numbers', () => {
      expect(payments.calculateDepositAmount('1000')).toBe(400);
    });

    it('should handle zero', () => {
      expect(payments.calculateDepositAmount(0)).toBe(0);
    });
  });

  describe('calculateBalanceAmount', () => {
    it('should calculate 60% balance correctly', () => {
      expect(payments.calculateBalanceAmount(1000)).toBe(600);
      expect(payments.calculateBalanceAmount(2500)).toBe(1500);
      expect(payments.calculateBalanceAmount(5000)).toBe(3000);
    });

    it('should handle decimal amounts', () => {
      const total = 1234.56;
      const deposit = payments.calculateDepositAmount(total);
      const balance = payments.calculateBalanceAmount(total);
      expect(deposit + balance).toBeCloseTo(total, 2);
    });
  });

  describe('getBankAccountDetails', () => {
    it('should fetch bank details from system configuration', async () => {
      const mockBankDetails = {
        bank_name: 'Bank of Ceylon',
        account_name: 'Ayubo Cafe',
        account_number: '1234567890',
        branch: 'Colombo',
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { config_value: JSON.stringify(mockBankDetails) },
              error: null,
            }),
          }),
        }),
      });

      const result = await payments.getBankAccountDetails();

      expect(result).toEqual(mockBankDetails);
      expect(supabaseMock.from).toHaveBeenCalledWith('system_configuration');
    });

    it('should return default bank details if not configured', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await payments.getBankAccountDetails();

      expect(result).toBeDefined();
      expect(result.bank_name).toBeDefined();
      expect(result.account_number).toBeDefined();
    });

    it('should throw error on database failure', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(payments.getBankAccountDetails()).rejects.toThrow();
    });
  });

  describe('createPaymentRecord', () => {
    it('should create payment record with all required fields', async () => {
      const paymentData = {
        order_id: 'order-123',
        customer_id: 'customer-456',
        amount: 1000,
        payment_method: 'stripe',
        payment_type: 'deposit',
        payment_status: 'pending',
      };

      const mockCreatedPayment = {
        payment_id: 'payment-789',
        ...paymentData,
        payment_date: expect.any(String),
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedPayment,
              error: null,
            }),
          }),
        }),
      });

      const result = await payments.createPaymentRecord(paymentData);

      expect(result).toBeDefined();
      expect(result.payment_id).toBe('payment-789');
      expect(supabaseMock.from).toHaveBeenCalledWith('customer_payments');
    });

    it('should throw error for missing required fields', async () => {
      const incompleteData = {
        order_id: 'order-123',
        // missing customer_id, amount, payment_method, payment_type
      };

      await expect(payments.createPaymentRecord(incompleteData)).rejects.toThrow(
        'Missing required payment fields'
      );
    });

    it('should handle database errors', async () => {
      const paymentData = {
        order_id: 'order-123',
        customer_id: 'customer-456',
        amount: 1000,
        payment_method: 'stripe',
        payment_type: 'deposit',
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(payments.createPaymentRecord(paymentData)).rejects.toThrow();
    });

    it('should include optional fields when provided', async () => {
      const paymentData = {
        order_id: 'order-123',
        customer_id: 'customer-456',
        amount: 1000,
        payment_method: 'bank_transfer',
        payment_type: 'deposit',
        receipt_image_url: 'https://example.com/receipt.jpg',
        transaction_reference: 'TRX-123456',
      };

      let insertedData;
      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data[0];
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data[0], payment_id: 'payment-789' },
                error: null,
              }),
            }),
          };
        }),
      });

      await payments.createPaymentRecord(paymentData);

      expect(insertedData.receipt_image_url).toBe('https://example.com/receipt.jpg');
      expect(insertedData.transaction_reference).toBe('TRX-123456');
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status successfully', async () => {
      const paymentId = 'payment-123';
      const newStatus = 'success';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  payment_id: paymentId,
                  payment_status: newStatus,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await payments.updatePaymentStatus(paymentId, newStatus);

      expect(result.payment_status).toBe(newStatus);
      expect(supabaseMock.from).toHaveBeenCalledWith('customer_payments');
    });

    it('should include additional data in update', async () => {
      const paymentId = 'payment-123';
      const newStatus = 'success';
      const additionalData = {
        verified_by: 'user-456',
        verification_notes: 'Payment verified',
      };

      let updateData;
      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockImplementation((data) => {
          updateData = data;
          return {
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { ...data, payment_id: paymentId },
                  error: null,
                }),
              }),
            }),
          };
        }),
      });

      await payments.updatePaymentStatus(paymentId, newStatus, additionalData);

      expect(updateData.payment_status).toBe(newStatus);
      expect(updateData.verified_by).toBe('user-456');
      expect(updateData.verification_notes).toBe('Payment verified');
    });
  });

  describe('getOrderPayments', () => {
    it('should fetch all payments for an order', async () => {
      const orderId = 'order-123';
      const mockPayments = [
        { payment_id: 'payment-1', payment_type: 'deposit', amount: 400 },
        { payment_id: 'payment-2', payment_type: 'balance', amount: 600 },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockPayments,
              error: null,
            }),
          }),
        }),
      });

      const result = await payments.getOrderPayments(orderId);

      expect(result).toEqual(mockPayments);
      expect(result.length).toBe(2);
    });

    it('should return empty array if no payments found', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      const result = await payments.getOrderPayments('order-123');

      expect(result).toEqual([]);
    });
  });

  describe('hasDepositBeenPaid', () => {
    it('should return true if deposit payment exists', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ payment_id: 'payment-123' }],
            error: null,
          }),
        }),
      });

      const result = await payments.hasDepositBeenPaid('order-123');

      expect(result).toBe(true);
    });

    it('should return false if no deposit payment', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await payments.hasDepositBeenPaid('order-123');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      const result = await payments.hasDepositBeenPaid('order-123');

      expect(result).toBe(false);
    });
  });

  describe('isOrderFullyPaid', () => {
    it('should return true if full payment exists', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ payment_id: 'payment-123', payment_type: 'full' }],
            error: null,
          }),
        }),
      });

      const result = await payments.isOrderFullyPaid('order-123');

      expect(result).toBe(true);
    });

    it('should return true if both deposit and balance paid', async () => {
      let callCount = 0;
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call checks for full payment
                return Promise.resolve({ data: [], error: null });
              } else {
                // Second call checks for deposit + balance
                return Promise.resolve({
                  data: [
                    { payment_type: 'deposit' },
                    { payment_type: 'balance' },
                  ],
                  error: null,
                });
              }
            }),
          }),
        }),
      });

      const result = await payments.isOrderFullyPaid('order-123');

      expect(result).toBe(true);
    });

    it('should return false if only deposit paid', async () => {
      let callCount = 0;
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          limit: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return Promise.resolve({ data: [], error: null });
            } else {
              return Promise.resolve({
                data: [{ payment_type: 'deposit' }],
                error: null,
              });
            }
          }),
        }),
      });

      const result = await payments.isOrderFullyPaid('order-123');

      expect(result).toBe(false);
    });
  });

  describe('verifyBankTransferPayment', () => {
    it('should verify payment and update order status', async () => {
      const paymentId = 'payment-123';
      const verifiedBy = 'user-456';
      const notes = 'Verified payment receipt';

      let paymentUpdateCalled = false;
      let orderUpdateCalled = false;

      supabaseMock.from.mockImplementation((table) => {
        if (table === 'customer_payments') {
          return {
            update: vi.fn().mockImplementation(() => {
              paymentUpdateCalled = true;
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        payment_id: paymentId,
                        order_id: 'order-123',
                        customer_id: 'customer-789',
                        payment_status: 'success',
                      },
                      error: null,
                    }),
                  }),
                }),
              };
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        } else if (table === 'customer_orders') {
          return {
            update: vi.fn().mockImplementation(() => {
              orderUpdateCalled = true;
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { order_id: 'order-123', status: 'payment_verified' },
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        } else if (table === 'customer_notifications') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      const result = await payments.verifyBankTransferPayment(paymentId, verifiedBy, notes);

      expect(result).toBeDefined();
      expect(result.payment).toBeDefined();
      expect(paymentUpdateCalled).toBe(true);
      expect(orderUpdateCalled).toBe(true);
    });
  });

  describe('rejectBankTransferPayment', () => {
    it('should reject payment with reason', async () => {
      const paymentId = 'payment-123';
      const rejectedBy = 'user-456';
      const reason = 'Invalid receipt';

      supabaseMock.from.mockImplementation((table) => {
        if (table === 'customer_payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    payment_id: paymentId,
                    customer_id: 'customer-789',
                    order_id: 'order-123',
                    customer_orders: {
                      order_number: 'ORD-20240101-001',
                    },
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      payment_id: paymentId,
                      payment_status: 'failed',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'customer_notifications') {
          return {
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
      });

      const result = await payments.rejectBankTransferPayment(paymentId, rejectedBy, reason);

      expect(result).toBeDefined();
      expect(result.payment_status).toBe('failed');
    });

    it('should throw error if reason not provided', async () => {
      await expect(
        payments.rejectBankTransferPayment('payment-123', 'user-456', null)
      ).rejects.toThrow('Rejection reason is required');
    });
  });

  describe('Utility Functions', () => {
    describe('formatCurrency', () => {
      it('should format currency correctly', () => {
        expect(payments.formatCurrency(1000)).toBe('Rs. 1,000.00');
        expect(payments.formatCurrency(1234.56)).toBe('Rs. 1,234.56');
        expect(payments.formatCurrency(999999.99)).toBe('Rs. 999,999.99');
      });

      it('should handle zero', () => {
        expect(payments.formatCurrency(0)).toBe('Rs. 0.00');
      });
    });

    describe('getPaymentMethodName', () => {
      it('should return correct display names', () => {
        expect(payments.getPaymentMethodName('stripe')).toBe('Credit/Debit Card');
        expect(payments.getPaymentMethodName('bank_transfer')).toBe('Bank Transfer');
        expect(payments.getPaymentMethodName('unknown')).toBe('unknown');
      });
    });

    describe('getPaymentStatusColor', () => {
      it('should return correct color classes', () => {
        expect(payments.getPaymentStatusColor('success')).toContain('green');
        expect(payments.getPaymentStatusColor('pending')).toContain('yellow');
        expect(payments.getPaymentStatusColor('pending_verification')).toContain('blue');
        expect(payments.getPaymentStatusColor('failed')).toContain('red');
      });
    });
  });
});

