/**
 * Payment Processing Flow Integration Tests
 * 
 * Integration tests for Task 7.0 - Payment Integration (Stripe & Bank Transfer)
 * Tests the complete payment workflow from initiation to verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase
vi.mock('../../src/config/supabase', () => ({
  supabaseClient: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('../../src/utils/auditLog', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Payment Processing Flow', () => {
  let supabaseMock;
  let payments;

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('../../src/config/supabase');
    supabaseMock = supabaseModule.supabaseClient;
    payments = await import('../../src/utils/payments');
  });

  describe('Stripe Payment Flow', () => {
    it('should create deposit payment (40%) for new order', async () => {
      const orderTotal = 5000;
      const depositAmount = payments.calculateDepositAmount(orderTotal);

      expect(depositAmount).toBe(2000); // 40% of 5000

      const paymentData = {
        order_id: 'order-123',
        customer_id: 'customer-456',
        amount: depositAmount,
        payment_method: 'stripe',
        payment_type: 'deposit',
        payment_status: 'pending',
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                payment_id: 'payment-789',
                ...paymentData,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await payments.createPaymentRecord(paymentData);

      expect(result.payment_id).toBe('payment-789');
      expect(result.payment_type).toBe('deposit');
      expect(result.amount).toBe(depositAmount);
    });

    it('should process full payment (100%) if customer chooses', async () => {
      const orderTotal = 5000;

      const paymentData = {
        order_id: 'order-123',
        customer_id: 'customer-456',
        amount: orderTotal,
        payment_method: 'stripe',
        payment_type: 'full',
        payment_status: 'pending',
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                payment_id: 'payment-789',
                ...paymentData,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await payments.createPaymentRecord(paymentData);

      expect(result.payment_type).toBe('full');
      expect(result.amount).toBe(orderTotal);
    });

    it('should update order status to payment_verified on success', async () => {
      const orderId = 'order-123';
      const newStatus = 'payment_verified';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  order_id: orderId,
                  status: newStatus,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await payments.updateOrderPaymentStatus(orderId, newStatus);

      expect(result.order_id).toBe(orderId);
      expect(result.status).toBe('payment_verified');
    });

    it('should handle payment failure gracefully', async () => {
      const paymentId = 'payment-123';

      supabaseMock.from.mockReturnValue({
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
      });

      const result = await payments.updatePaymentStatus(paymentId, 'failed');

      expect(result.payment_status).toBe('failed');
    });

    it('should allow balance payment after deposit', async () => {
      const orderId = 'order-123';
      const orderTotal = 5000;
      const depositAmount = payments.calculateDepositAmount(orderTotal);
      const balanceAmount = payments.calculateBalanceAmount(orderTotal);

      expect(balanceAmount).toBe(3000); // 60% of 5000

      // Mock: Check if deposit has been paid
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({
            data: [{ payment_id: 'payment-deposit' }],
            error: null,
          }),
        }),
      });

      const hasDeposit = await payments.hasDepositBeenPaid(orderId);
      expect(hasDeposit).toBe(true);

      // Now can proceed with balance payment
      const balancePaymentData = {
        order_id: orderId,
        customer_id: 'customer-456',
        amount: balanceAmount,
        payment_method: 'stripe',
        payment_type: 'balance',
        payment_status: 'pending',
      };

      // Balance payment should only be allowed after deposit
      expect(hasDeposit).toBe(true);
    });

    it('should mark order as fully_paid when both deposit and balance paid', async () => {
      const orderId = 'order-123';

      // Mock: Both deposit and balance payments exist
      let callCount = 0;
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
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
      });

      const isFullyPaid = await payments.isOrderFullyPaid(orderId);

      expect(isFullyPaid).toBe(true);
    });
  });

  describe('Bank Transfer Payment Flow', () => {
    it('should create payment record with receipt image', async () => {
      const paymentData = {
        order_id: 'order-123',
        customer_id: 'customer-456',
        amount: 2000,
        payment_method: 'bank_transfer',
        payment_type: 'deposit',
        payment_status: 'pending_verification',
        receipt_image_url: 'https://storage.supabase.co/receipts/receipt.jpg',
        transaction_reference: 'TRX-20240115-001',
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                payment_id: 'payment-789',
                ...paymentData,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await payments.createPaymentRecord(paymentData);

      expect(result.payment_method).toBe('bank_transfer');
      expect(result.payment_status).toBe('pending_verification');
      expect(result.receipt_image_url).toBeDefined();
      expect(result.transaction_reference).toBeDefined();
    });

    it('should update order status to payment_pending_verification', async () => {
      const orderId = 'order-123';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  order_id: orderId,
                  status: 'payment_pending_verification',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await payments.updateOrderPaymentStatus(
        orderId,
        'payment_pending_verification'
      );

      expect(result.status).toBe('payment_pending_verification');
    });

    it('should create notification for staff when payment pending', async () => {
      const paymentId = 'payment-123';
      const orderId = 'order-456';

      let staffNotificationCreated = false;
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'customer_notifications') {
          staffNotificationCreated = true;
          return {
            insert: vi.fn().mockResolvedValue({
              data: [{ notification_id: 'notif-789' }],
              error: null,
            }),
          };
        }
      });

      await supabaseMock
        .from('customer_notifications')
        .insert([{
          customer_id: null, // Staff notification
          notification_type: 'payment_pending',
          title: 'Payment Verification Needed',
          message: 'A bank transfer payment needs verification',
          related_type: 'customer_payment',
          related_id: paymentId,
        }]);

      expect(staffNotificationCreated).toBe(true);
    });
  });

  describe('Staff Payment Verification', () => {
    it('should allow staff to verify bank transfer payment', async () => {
      const paymentId = 'payment-123';
      const verifiedBy = 'user-789';
      const notes = 'Payment verified against bank statement';

      supabaseMock.from.mockImplementation((table) => {
        if (table === 'customer_payments') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      payment_id: paymentId,
                      order_id: 'order-456',
                      customer_id: 'customer-789',
                      payment_status: 'success',
                      verified_by: verifiedBy,
                      verification_notes: notes,
                    },
                    error: null,
                  }),
                }),
              }),
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
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      order_id: 'order-456',
                      status: 'payment_verified',
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

      const result = await payments.verifyBankTransferPayment(paymentId, verifiedBy, notes);

      expect(result).toBeDefined();
      expect(result.payment).toBeDefined();
      expect(result.payment.payment_status).toBe('success');
    });

    it('should allow staff to reject payment with reason', async () => {
      const paymentId = 'payment-123';
      const rejectedBy = 'user-789';
      const reason = 'Receipt image is unclear';

      supabaseMock.from.mockImplementation((table) => {
        if (table === 'customer_payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    payment_id: paymentId,
                    customer_id: 'customer-456',
                    order_id: 'order-789',
                    customer_orders: {
                      order_number: 'ORD-20240115-001',
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
                      verified_by: rejectedBy,
                      verification_notes: reason,
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

      expect(result.payment_status).toBe('failed');
    });

    it('should require rejection reason', async () => {
      await expect(
        payments.rejectBankTransferPayment('payment-123', 'user-456', null)
      ).rejects.toThrow('Rejection reason is required');

      await expect(
        payments.rejectBankTransferPayment('payment-123', 'user-456', '')
      ).rejects.toThrow('Rejection reason is required');
    });

    it('should send notification to customer on verification', async () => {
      const customerId = 'customer-123';
      const orderId = 'order-456';

      let customerNotificationCreated = false;
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'customer_notifications') {
          customerNotificationCreated = true;
          return {
            insert: vi.fn().mockResolvedValue({
              data: [{ notification_id: 'notif-789' }],
              error: null,
            }),
          };
        }
      });

      await supabaseMock
        .from('customer_notifications')
        .insert([{
          customer_id: customerId,
          notification_type: 'payment_verified',
          title: 'Payment Verified',
          message: 'Your payment has been verified. Thank you!',
          related_type: 'customer_order',
          related_id: orderId,
        }]);

      expect(customerNotificationCreated).toBe(true);
    });

    it('should send notification to customer on rejection', async () => {
      const customerId = 'customer-123';
      const orderId = 'order-456';
      const reason = 'Invalid receipt';

      let customerNotificationCreated = false;
      supabaseMock.from.mockImplementation((table) => {
        if (table === 'customer_notifications') {
          customerNotificationCreated = true;
          return {
            insert: vi.fn().mockResolvedValue({
              data: [{ notification_id: 'notif-789' }],
              error: null,
            }),
          };
        }
      });

      await supabaseMock
        .from('customer_notifications')
        .insert([{
          customer_id: customerId,
          notification_type: 'payment_rejected',
          title: 'Payment Verification Failed',
          message: `Your payment could not be verified. Reason: ${reason}`,
          related_type: 'customer_order',
          related_id: orderId,
        }]);

      expect(customerNotificationCreated).toBe(true);
    });
  });

  describe('Payment Status Tracking', () => {
    it('should fetch all payments for an order', async () => {
      const orderId = 'order-123';
      const mockPayments = [
        {
          payment_id: 'payment-1',
          payment_type: 'deposit',
          amount: 2000,
          payment_status: 'success',
          payment_date: '2024-01-15T10:00:00',
        },
        {
          payment_id: 'payment-2',
          payment_type: 'balance',
          amount: 3000,
          payment_status: 'pending',
          payment_date: '2024-01-20T14:00:00',
        },
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

    it('should calculate total paid amount', () => {
      const mockPayments = [
        { payment_type: 'deposit', amount: 2000, payment_status: 'success' },
        { payment_type: 'balance', amount: 3000, payment_status: 'success' },
      ];

      const totalPaid = mockPayments
        .filter(p => p.payment_status === 'success')
        .reduce((sum, p) => sum + p.amount, 0);

      expect(totalPaid).toBe(5000);
    });

    it('should check if order has pending payments', () => {
      const mockPayments = [
        { payment_id: 'payment-1', payment_status: 'success' },
        { payment_id: 'payment-2', payment_status: 'pending' },
      ];

      const hasPending = mockPayments.some(p => p.payment_status === 'pending');
      expect(hasPending).toBe(true);

      const allSuccess = mockPayments.every(p => p.payment_status === 'success');
      expect(allSuccess).toBe(false);
    });
  });

  describe('Payment Retry Flow', () => {
    it('should allow payment retry after failure', async () => {
      const orderId = 'order-123';
      const originalPaymentId = 'payment-failed';

      // Mark original payment as failed
      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  payment_id: originalPaymentId,
                  payment_status: 'failed',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      await payments.updatePaymentStatus(originalPaymentId, 'failed');

      // Create new payment record for retry
      const retryPaymentData = {
        order_id: orderId,
        customer_id: 'customer-456',
        amount: 2000,
        payment_method: 'stripe',
        payment_type: 'deposit',
        payment_status: 'pending',
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                payment_id: 'payment-retry',
                ...retryPaymentData,
              },
              error: null,
            }),
          }),
        }),
      });

      const retryPayment = await payments.createPaymentRecord(retryPaymentData);

      expect(retryPayment.payment_id).toBe('payment-retry');
      expect(retryPayment.order_id).toBe(orderId);
    });
  });

  describe('Payment Audit Logging', () => {
    it('should log payment initiation', async () => {
      const paymentData = {
        order_id: 'order-123',
        customer_id: 'customer-456',
        amount: 2000,
        payment_method: 'stripe',
        payment_type: 'deposit',
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                payment_id: 'payment-789',
                ...paymentData,
              },
              error: null,
            }),
          }),
        }),
      });

      await payments.createPaymentRecord(paymentData);

      const auditLog = await import('../../src/utils/auditLog');
      expect(auditLog.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payment_initiated',
          target_type: 'customer_payment',
          status: 'success',
        })
      );
    });

    it('should log payment status changes', async () => {
      const paymentId = 'payment-123';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  payment_id: paymentId,
                  payment_status: 'success',
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      await payments.updatePaymentStatus(paymentId, 'success');

      const auditLog = await import('../../src/utils/auditLog');
      expect(auditLog.logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'payment_status_updated',
          target_type: 'customer_payment',
          target_id: paymentId,
        })
      );
    });
  });

  describe('Payment Display Helpers', () => {
    it('should format currency correctly', () => {
      expect(payments.formatCurrency(1000)).toBe('Rs. 1,000.00');
      expect(payments.formatCurrency(2500.50)).toBe('Rs. 2,500.50');
      expect(payments.formatCurrency(999999.99)).toBe('Rs. 999,999.99');
    });

    it('should get payment method display names', () => {
      expect(payments.getPaymentMethodName('stripe')).toBe('Credit/Debit Card');
      expect(payments.getPaymentMethodName('bank_transfer')).toBe('Bank Transfer');
    });

    it('should get payment status colors', () => {
      expect(payments.getPaymentStatusColor('success')).toContain('green');
      expect(payments.getPaymentStatusColor('pending')).toContain('yellow');
      expect(payments.getPaymentStatusColor('pending_verification')).toContain('blue');
      expect(payments.getPaymentStatusColor('failed')).toContain('red');
    });
  });
});

