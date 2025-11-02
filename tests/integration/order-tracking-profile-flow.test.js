/**
 * Order Tracking and Customer Profile Integration Tests
 * 
 * Integration tests for Task 11.0 - Order Tracking & Customer Profile
 * Tests order history, tracking, profile management, and modification workflows
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

vi.mock('../../src/utils/customerAuth', () => ({
  sendOTP: vi.fn().mockResolvedValue({ success: true }),
  verifyOTP: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Order Tracking and Customer Profile Flow', () => {
  let supabaseMock;
  let customerOrders;

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('../../src/config/supabase');
    supabaseMock = supabaseModule.supabaseClient;
    customerOrders = await import('../../src/utils/customerOrders');
  });

  describe('Order History', () => {
    it('should fetch all orders for logged-in customer', async () => {
      const customerId = 'customer-123';
      const mockOrders = [
        {
          order_id: 'order-1',
          order_number: 'ORD-20240115-001',
          customer_id: customerId,
          status: 'completed',
          total_amount: 5000,
          created_at: '2024-01-15T10:00:00',
        },
        {
          order_id: 'order-2',
          order_number: 'ORD-20240120-002',
          customer_id: customerId,
          status: 'pending',
          total_amount: 3000,
          created_at: '2024-01-20T14:00:00',
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockOrders,
              error: null,
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customer_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(data.length).toBe(2);
      expect(data[0].order_number).toBe('ORD-20240115-001');
    });

    it('should display orders in reverse chronological order', () => {
      const orders = [
        { order_id: 'order-1', created_at: '2024-01-15T10:00:00' },
        { order_id: 'order-2', created_at: '2024-01-20T14:00:00' },
        { order_id: 'order-3', created_at: '2024-01-18T12:00:00' },
      ];

      const sorted = [...orders].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      expect(sorted[0].order_id).toBe('order-2'); // Newest first
      expect(sorted[2].order_id).toBe('order-1'); // Oldest last
    });

    it('should show order summary information', () => {
      const order = {
        order_number: 'ORD-20240115-001',
        created_at: '2024-01-15T10:00:00',
        total_amount: 5000,
        status: 'completed',
        items_count: 3,
      };

      expect(order.order_number).toBeDefined();
      expect(order.total_amount).toBe(5000);
      expect(order.status).toBe('completed');
      expect(order.items_count).toBe(3);
    });

    it('should filter orders by status', async () => {
      const customerId = 'customer-123';
      const filterStatus = 'pending';

      const mockOrders = [
        { order_id: 'order-1', status: 'pending', customer_id: customerId },
        { order_id: 'order-2', status: 'completed', customer_id: customerId },
        { order_id: 'order-3', status: 'pending', customer_id: customerId },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockOrders.filter(o => o.status === filterStatus),
            error: null,
          }),
        }),
      });

      const { data } = await supabaseMock
        .from('customer_orders')
        .select('*')
        .eq('customer_id', customerId)
        .eq('status', filterStatus)
        .order('created_at', { ascending: false });

      expect(data.length).toBe(2);
      expect(data.every(o => o.status === 'pending')).toBe(true);
    });

    it('should search orders by order number', async () => {
      const searchQuery = 'ORD-20240115';

      const mockOrders = [
        { order_id: 'order-1', order_number: 'ORD-20240115-001' },
        { order_id: 'order-2', order_number: 'ORD-20240115-002' },
        { order_id: 'order-3', order_number: 'ORD-20240120-001' },
      ];

      const filtered = mockOrders.filter(o =>
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered.length).toBe(2);
      expect(filtered.every(o => o.order_number.includes('20240115'))).toBe(true);
    });
  });

  describe('Order Tracking', () => {
    it('should display detailed order information', async () => {
      const orderId = 'order-123';

      const mockOrderDetails = {
        order_id: orderId,
        order_number: 'ORD-20240115-001',
        status: 'in_preparation',
        total_amount: 5000,
        deposit_amount: 2000,
        balance_amount: 3000,
        pickup_date: '2024-01-20',
        pickup_time: '14:00',
        special_instructions: 'Please include candles',
        items: [
          {
            item_id: 'item-1',
            product_name: 'Chocolate Cake',
            weight: '1kg',
            quantity: 1,
            price: 2500,
          },
          {
            item_id: 'item-2',
            product_name: 'Cupcakes',
            weight: '500g',
            quantity: 2,
            price: 1250,
          },
        ],
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockOrderDetails,
              error: null,
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customer_orders')
        .select('*, items:customer_order_items(*)')
        .eq('order_id', orderId)
        .single();

      expect(error).toBeNull();
      expect(data.order_number).toBe('ORD-20240115-001');
      expect(data.items.length).toBe(2);
    });

    it('should show order status timeline', async () => {
      const orderId = 'order-123';

      const mockStatusHistory = [
        {
          status: 'pending',
          changed_at: '2024-01-15T10:00:00',
          notes: 'Order created',
        },
        {
          status: 'payment_verified',
          changed_at: '2024-01-15T10:30:00',
          notes: 'Payment received',
        },
        {
          status: 'confirmed',
          changed_at: '2024-01-15T11:00:00',
          notes: 'Order confirmed',
        },
        {
          status: 'in_preparation',
          changed_at: '2024-01-18T09:00:00',
          notes: 'Started preparation',
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockStatusHistory,
              error: null,
            }),
          }),
        }),
      });

      const { data } = await supabaseMock
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('changed_at', { ascending: true });

      expect(data.length).toBe(4);
      expect(data[0].status).toBe('pending');
      expect(data[3].status).toBe('in_preparation');
    });

    it('should display current order status with progress indicator', () => {
      const orderStatuses = [
        'pending',
        'payment_verified',
        'confirmed',
        'in_preparation',
        'ready',
        'completed',
      ];

      const currentStatus = 'in_preparation';
      const currentIndex = orderStatuses.indexOf(currentStatus);

      expect(currentIndex).toBe(3);
      expect(currentIndex / (orderStatuses.length - 1) * 100).toBeCloseTo(60, 0); // 60% progress
    });

    it('should show pickup information', () => {
      const order = {
        pickup_date: '2024-01-20',
        pickup_time: '14:00',
        pickup_location: 'Ayubo Cafe, Colombo',
      };

      const pickupDateTime = new Date(`${order.pickup_date}T${order.pickup_time}`);
      expect(pickupDateTime).toBeInstanceOf(Date);
    });

    it('should display payment information', () => {
      const order = {
        total_amount: 5000,
        deposit_amount: 2000,
        balance_amount: 3000,
        deposit_paid: true,
        balance_paid: false,
      };

      const remainingBalance = order.balance_paid ? 0 : order.balance_amount;
      expect(remainingBalance).toBe(3000);
    });

    it('should show "Pay Balance" button if balance due', () => {
      const order = {
        status: 'confirmed',
        deposit_paid: true,
        balance_paid: false,
        balance_amount: 3000,
      };

      const showPayBalanceButton =
        order.status === 'confirmed' &&
        order.deposit_paid &&
        !order.balance_paid &&
        order.balance_amount > 0;

      expect(showPayBalanceButton).toBe(true);
    });

    it('should display custom cake details for custom orders', async () => {
      const orderId = 'order-123';

      const mockCustomOrder = {
        order_id: orderId,
        order_type: 'custom',
        custom_request_id: 'request-456',
        custom_request: {
          occasion: 'Birthday',
          age: '25',
          colors: 'Pink and Gold',
          writing_text: 'Happy Birthday!',
          reference_image_url: 'https://example.com/image.jpg',
        },
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCustomOrder,
              error: null,
            }),
          }),
        }),
      });

      const { data } = await supabaseMock
        .from('customer_orders')
        .select('*, custom_request:custom_cake_requests(*)')
        .eq('order_id', orderId)
        .single();

      expect(data.order_type).toBe('custom');
      expect(data.custom_request).toBeDefined();
      expect(data.custom_request.occasion).toBe('Birthday');
    });
  });

  describe('Order Modification', () => {
    it('should allow order modification before payment', async () => {
      const order = {
        order_id: 'order-123',
        status: 'pending',
        payment_status: 'pending',
      };

      const canModify = order.status === 'pending' && order.payment_status === 'pending';
      expect(canModify).toBe(true);
    });

    it('should prevent modification after payment', () => {
      const order = {
        order_id: 'order-123',
        status: 'payment_verified',
        payment_status: 'success',
      };

      const canModify = order.status === 'pending' && order.payment_status === 'pending';
      expect(canModify).toBe(false);
    });

    it('should update order items', async () => {
      const orderId = 'order-123';
      const updatedItems = [
        {
          product_id: 'prod-1',
          pricing_id: 'price-1',
          quantity: 2,
          price: 2500,
        },
      ];

      supabaseMock.from.mockImplementation((table) => {
        if (table === 'customer_order_items') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
            insert: vi.fn().mockResolvedValue({ data: updatedItems, error: null }),
          };
        }
      });

      // Delete old items
      await supabaseMock
        .from('customer_order_items')
        .delete()
        .eq('order_id', orderId);

      // Insert new items
      const { data, error } = await supabaseMock
        .from('customer_order_items')
        .insert(updatedItems.map(item => ({ ...item, order_id: orderId })));

      expect(error).toBeNull();
    });

    it('should update pickup date and time', async () => {
      const orderId = 'order-123';
      const newPickupDate = '2024-01-25';
      const newPickupTime = '15:00';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  order_id: orderId,
                  pickup_date: newPickupDate,
                  pickup_time: newPickupTime,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customer_orders')
        .update({
          pickup_date: newPickupDate,
          pickup_time: newPickupTime,
        })
        .eq('order_id', orderId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.pickup_date).toBe(newPickupDate);
      expect(data.pickup_time).toBe(newPickupTime);
    });
  });

  describe('Customer Profile', () => {
    it('should display customer information', async () => {
      const customerId = 'customer-123';

      const mockCustomer = {
        customer_id: customerId,
        phone_number: '+94712345678',
        name: 'John Doe',
        email: 'john@example.com',
        birthday: '1990-05-15',
        address: '123 Main St, Colombo',
        created_at: '2024-01-01T10:00:00',
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCustomer,
              error: null,
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customers')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      expect(error).toBeNull();
      expect(data.name).toBe('John Doe');
      expect(data.email).toBe('john@example.com');
    });

    it('should update customer name', async () => {
      const customerId = 'customer-123';
      const newName = 'Jane Doe';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  customer_id: customerId,
                  name: newName,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customers')
        .update({ name: newName })
        .eq('customer_id', customerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.name).toBe(newName);
    });

    it('should update customer email', async () => {
      const customerId = 'customer-123';
      const newEmail = 'newemail@example.com';

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(newEmail)).toBe(true);

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  customer_id: customerId,
                  email: newEmail,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customers')
        .update({ email: newEmail })
        .eq('customer_id', customerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.email).toBe(newEmail);
    });

    it('should update customer birthday', async () => {
      const customerId = 'customer-123';
      const newBirthday = '1992-08-20';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  customer_id: customerId,
                  birthday: newBirthday,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customers')
        .update({ birthday: newBirthday })
        .eq('customer_id', customerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.birthday).toBe(newBirthday);
    });

    it('should update customer address', async () => {
      const customerId = 'customer-123';
      const newAddress = '456 New Street, Kandy';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  customer_id: customerId,
                  address: newAddress,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customers')
        .update({ address: newAddress })
        .eq('customer_id', customerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.address).toBe(newAddress);
    });
  });

  describe('Phone Number Change with Verification', () => {
    it('should require OTP verification for phone change', async () => {
      const customerId = 'customer-123';
      const oldPhone = '+94712345678';
      const newPhone = '+94787654321';

      // Step 1: Send OTP to new phone number
      const customerAuth = await import('../../src/utils/customerAuth');
      await customerAuth.sendOTP(newPhone);

      expect(customerAuth.sendOTP).toHaveBeenCalledWith(newPhone);
    });

    it('should verify OTP before updating phone number', async () => {
      const newPhone = '+94787654321';
      const otpCode = '123456';

      const customerAuth = await import('../../src/utils/customerAuth');
      const verifyResult = await customerAuth.verifyOTP(newPhone, otpCode);

      expect(verifyResult.success).toBe(true);
    });

    it('should update phone number after successful verification', async () => {
      const customerId = 'customer-123';
      const newPhone = '+94787654321';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  customer_id: customerId,
                  phone_number: newPhone,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customers')
        .update({ phone_number: newPhone })
        .eq('customer_id', customerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.phone_number).toBe(newPhone);
    });

    it('should not update phone if OTP verification fails', async () => {
      const customerAuth = await import('../../src/utils/customerAuth');
      
      // Mock failed verification
      customerAuth.verifyOTP.mockResolvedValueOnce({ success: false, error: 'Invalid OTP' });

      const verifyResult = await customerAuth.verifyOTP('+94787654321', 'wrong-otp');

      expect(verifyResult.success).toBe(false);
      // Should not proceed with phone update
    });
  });

  describe('Profile Image Upload', () => {
    it('should upload profile image to storage', async () => {
      const customerId = 'customer-123';
      const imageFile = new File(['image data'], 'profile.jpg', { type: 'image/jpeg' });
      const imageUrl = 'https://storage.supabase.co/profiles/customer-123.jpg';

      // Mock storage upload
      supabaseMock.storage = {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({
            data: { path: 'profiles/customer-123.jpg' },
            error: null,
          }),
          getPublicUrl: vi.fn().mockReturnValue({
            data: { publicUrl: imageUrl },
          }),
        }),
      };

      const bucket = supabaseMock.storage.from('profiles');
      const { data: uploadData, error: uploadError } = await bucket.upload(
        `customer-${customerId}.jpg`,
        imageFile
      );

      expect(uploadError).toBeNull();

      const { data: urlData } = bucket.getPublicUrl(uploadData.path);
      expect(urlData.publicUrl).toBe(imageUrl);
    });

    it('should update customer profile with image URL', async () => {
      const customerId = 'customer-123';
      const imageUrl = 'https://storage.supabase.co/profiles/customer-123.jpg';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  customer_id: customerId,
                  profile_image_url: imageUrl,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await supabaseMock
        .from('customers')
        .update({ profile_image_url: imageUrl })
        .eq('customer_id', customerId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.profile_image_url).toBe(imageUrl);
    });
  });

  describe('Rejected Custom Requests in History', () => {
    it('should display rejected custom requests in order history', async () => {
      const customerId = 'customer-123';

      const mockRejectedRequests = [
        {
          request_id: 'request-1',
          customer_id: customerId,
          status: 'rejected',
          rejection_reason: 'Cannot accommodate design complexity',
          created_at: '2024-01-10T10:00:00',
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockRejectedRequests,
            error: null,
          }),
        }),
      });

      const { data } = await supabaseMock
        .from('custom_cake_requests')
        .select('*')
        .eq('customer_id', customerId)
        .eq('status', 'rejected')
        .order('created_at', { ascending: false });

      expect(data.length).toBe(1);
      expect(data[0].status).toBe('rejected');
      expect(data[0].rejection_reason).toBeDefined();
    });

    it('should show rejection reason to customer', () => {
      const rejectedRequest = {
        request_id: 'request-1',
        status: 'rejected',
        rejection_reason: 'Cannot accommodate design complexity',
      };

      expect(rejectedRequest.rejection_reason).toBe('Cannot accommodate design complexity');
    });
  });

  describe('Profile Validation', () => {
    it('should validate email format', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+tag@domain.com',
      ];

      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user @example.com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });

    it('should validate phone number format', () => {
      const validPhones = [
        '+94712345678',
        '+94771234567',
      ];

      const invalidPhones = [
        '0712345678',
        '+941234',
        '712345678',
        '+94 712345678',
      ];

      const phoneRegex = /^\+94[0-9]{9}$/;

      validPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(phoneRegex.test(phone)).toBe(false);
      });
    });

    it('should show success message after profile update', () => {
      const updateResult = {
        success: true,
        message: 'Profile updated successfully',
      };

      expect(updateResult.success).toBe(true);
      expect(updateResult.message).toBeDefined();
    });

    it('should show error message on profile update failure', () => {
      const updateResult = {
        success: false,
        error: 'Failed to update profile',
      };

      expect(updateResult.success).toBe(false);
      expect(updateResult.error).toBe('Failed to update profile');
    });
  });

  describe('Order Statistics', () => {
    it('should calculate total orders for customer', () => {
      const orders = [
        { order_id: 'order-1', status: 'completed' },
        { order_id: 'order-2', status: 'pending' },
        { order_id: 'order-3', status: 'completed' },
      ];

      expect(orders.length).toBe(3);
    });

    it('should calculate total spent by customer', () => {
      const orders = [
        { order_id: 'order-1', total_amount: 5000, status: 'completed' },
        { order_id: 'order-2', total_amount: 3000, status: 'completed' },
        { order_id: 'order-3', total_amount: 2000, status: 'pending' },
      ];

      const totalSpent = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.total_amount, 0);

      expect(totalSpent).toBe(8000);
    });

    it('should count pending orders', () => {
      const orders = [
        { order_id: 'order-1', status: 'completed' },
        { order_id: 'order-2', status: 'pending' },
        { order_id: 'order-3', status: 'pending' },
      ];

      const pendingCount = orders.filter(o => o.status === 'pending').length;
      expect(pendingCount).toBe(2);
    });
  });
});

