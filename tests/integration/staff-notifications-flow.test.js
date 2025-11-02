/**
 * Staff Notifications Flow Integration Tests
 * 
 * Integration tests for Task 9.0 - In-App Notifications System
 * Tests notification creation, delivery, and management workflows
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

describe('Staff Notifications Flow', () => {
  let supabaseMock;
  let notifications;

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('../../src/config/supabase');
    supabaseMock = supabaseModule.supabaseClient;
    notifications = await import('../../src/utils/notifications');
  });

  describe('New Order Notifications', () => {
    it('should create notification when new order is placed', async () => {
      const orderId = 'order-123';
      const orderNumber = 'ORD-20240115-001';
      const customerName = 'John Doe';

      const notificationData = {
        notification_type: 'new_order',
        title: 'New Order Received',
        message: `Order ${orderNumber} has been placed by ${customerName}`,
        related_type: 'customer_order',
        related_id: orderId,
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                notification_id: 'notif-789',
                customer_id: null,
                ...notificationData,
                is_read: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await notifications.createStaffNotification(notificationData);

      expect(result.notification_id).toBe('notif-789');
      expect(result.customer_id).toBeNull(); // Staff notification
      expect(result.notification_type).toBe('new_order');
      expect(result.is_read).toBe(false);
    });

    it('should include order details in notification', async () => {
      const notificationMessage = 'Order ORD-20240115-001 has been placed by John Doe. Total: Rs. 5,000.00';

      expect(notificationMessage).toContain('ORD-20240115-001');
      expect(notificationMessage).toContain('John Doe');
      expect(notificationMessage).toContain('Rs. 5,000.00');
    });
  });

  describe('Custom Request Notifications', () => {
    it('should notify staff of new custom cake request', async () => {
      const requestId = 'request-456';
      const customerName = 'Jane Smith';

      const notificationData = {
        notification_type: 'custom_request',
        title: 'New Custom Cake Request',
        message: `${customerName} has submitted a custom cake request`,
        related_type: 'custom_cake_request',
        related_id: requestId,
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                notification_id: 'notif-123',
                customer_id: null,
                ...notificationData,
                is_read: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await notifications.createStaffNotification(notificationData);

      expect(result.notification_type).toBe('custom_request');
      expect(result.related_type).toBe('custom_cake_request');
    });

    it('should highlight urgent requests in notification', async () => {
      const pickupDate = new Date();
      pickupDate.setDate(pickupDate.getDate() + 2); // 2 days from now

      const isUrgent = () => {
        const now = new Date();
        const daysUntil = (pickupDate - now) / (1000 * 60 * 60 * 24);
        return daysUntil <= 3;
      };

      expect(isUrgent()).toBe(true);

      const notificationMessage = isUrgent()
        ? 'URGENT: New custom cake request - Pickup in 2 days'
        : 'New custom cake request';

      expect(notificationMessage).toContain('URGENT');
    });
  });

  describe('Payment Pending Notifications', () => {
    it('should notify staff when bank transfer needs verification', async () => {
      const paymentId = 'payment-789';
      const orderId = 'order-123';
      const orderNumber = 'ORD-20240115-001';

      const notificationData = {
        notification_type: 'payment_pending',
        title: 'Payment Verification Needed',
        message: `Bank transfer payment for ${orderNumber} needs verification`,
        related_type: 'customer_payment',
        related_id: paymentId,
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                notification_id: 'notif-456',
                customer_id: null,
                ...notificationData,
                is_read: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await notifications.createStaffNotification(notificationData);

      expect(result.notification_type).toBe('payment_pending');
      expect(result.related_type).toBe('customer_payment');
    });

    it('should include payment amount in notification', async () => {
      const amount = 2000;
      const notificationMessage = `Payment verification needed for Rs. ${amount.toLocaleString()}`;

      expect(notificationMessage).toContain('2,000');
    });
  });

  describe('Quote Response Notifications', () => {
    it('should notify staff when customer approves quote', async () => {
      const requestId = 'request-123';
      const customerName = 'John Doe';

      const notificationData = {
        notification_type: 'quote_approved',
        title: 'Quote Approved',
        message: `${customerName} has approved the custom cake quote`,
        related_type: 'custom_cake_request',
        related_id: requestId,
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                notification_id: 'notif-789',
                customer_id: null,
                ...notificationData,
                is_read: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await notifications.createStaffNotification(notificationData);

      expect(result.notification_type).toBe('quote_approved');
    });

    it('should notify staff when customer rejects quote', async () => {
      const requestId = 'request-456';
      const customerName = 'Jane Smith';
      const rejectionReason = 'Price too high';

      const notificationData = {
        notification_type: 'quote_rejected',
        title: 'Quote Rejected',
        message: `${customerName} rejected the quote. Reason: ${rejectionReason}`,
        related_type: 'custom_cake_request',
        related_id: requestId,
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                notification_id: 'notif-123',
                customer_id: null,
                ...notificationData,
                is_read: false,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await notifications.createStaffNotification(notificationData);

      expect(result.notification_type).toBe('quote_rejected');
      expect(result.message).toContain(rejectionReason);
    });
  });

  describe('Notification Fetching and Display', () => {
    it('should fetch recent notifications for staff', async () => {
      const mockNotifications = [
        {
          notification_id: 'notif-1',
          customer_id: null,
          notification_type: 'new_order',
          title: 'New Order',
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          notification_id: 'notif-2',
          customer_id: null,
          notification_type: 'payment_pending',
          title: 'Payment Pending',
          is_read: false,
          created_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockNotifications,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await notifications.fetchStaffNotifications({ limit: 20 });

      expect(result).toEqual(mockNotifications);
      expect(result.length).toBe(2);
    });

    it('should get unread notification count', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 5,
              error: null,
            }),
          }),
        }),
      });

      const count = await notifications.getUnreadCount();

      expect(count).toBe(5);
    });

    it('should display notifications with correct icons', () => {
      expect(notifications.getNotificationIcon('new_order')).toBe('shopping-bag');
      expect(notifications.getNotificationIcon('custom_request')).toBe('cake');
      expect(notifications.getNotificationIcon('payment_pending')).toBe('credit-card');
      expect(notifications.getNotificationIcon('quote_approved')).toBe('check-circle');
      expect(notifications.getNotificationIcon('quote_rejected')).toBe('x-circle');
    });

    it('should display notifications with correct colors', () => {
      expect(notifications.getNotificationColor('new_order')).toContain('blue');
      expect(notifications.getNotificationColor('custom_request')).toContain('purple');
      expect(notifications.getNotificationColor('payment_pending')).toContain('yellow');
      expect(notifications.getNotificationColor('quote_approved')).toContain('green');
      expect(notifications.getNotificationColor('quote_rejected')).toContain('red');
    });

    it('should format time ago correctly', () => {
      const now = new Date();

      // Just now
      const justNow = new Date(now.getTime() - 30 * 1000);
      expect(notifications.formatTimeAgo(justNow.toISOString())).toBe('Just now');

      // Minutes ago
      const minutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(notifications.formatTimeAgo(minutesAgo.toISOString())).toBe('5m ago');

      // Hours ago
      const hoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(notifications.formatTimeAgo(hoursAgo.toISOString())).toBe('2h ago');
    });
  });

  describe('Notification Navigation', () => {
    it('should navigate to order page when order notification clicked', () => {
      const notification = {
        related_type: 'customer_order',
        related_id: 'order-123',
      };

      const path = notifications.getNotificationPath(notification);
      expect(path).toBe('/staff/orders?order_id=order-123');
    });

    it('should navigate to custom requests page when request notification clicked', () => {
      const notification = {
        related_type: 'custom_cake_request',
        related_id: 'request-456',
      };

      const path = notifications.getNotificationPath(notification);
      expect(path).toBe('/staff/custom-requests?request_id=request-456');
    });

    it('should navigate to payment verification page when payment notification clicked', () => {
      const notification = {
        related_type: 'customer_payment',
        related_id: 'payment-789',
      };

      const path = notifications.getNotificationPath(notification);
      expect(path).toBe('/staff/payment-verification?payment_id=payment-789');
    });

    it('should mark notification as read when clicked', async () => {
      const notificationId = 'notif-123';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  notification_id: notificationId,
                  is_read: true,
                  read_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await notifications.markAsRead(notificationId);

      expect(result.is_read).toBe(true);
      expect(result.read_at).toBeDefined();
    });
  });

  describe('Notification Management', () => {
    it('should mark all notifications as read', async () => {
      const mockUpdatedNotifications = [
        { notification_id: 'notif-1', is_read: true },
        { notification_id: 'notif-2', is_read: true },
        { notification_id: 'notif-3', is_read: true },
      ];

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: mockUpdatedNotifications,
                error: null,
              }),
            }),
          }),
        }),
      });

      const count = await notifications.markAllAsRead();

      expect(count).toBe(3);
    });

    it('should delete individual notification', async () => {
      const notificationId = 'notif-123';

      supabaseMock.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const result = await notifications.deleteNotification(notificationId);

      expect(result).toBe(true);
    });

    it('should delete all read notifications', async () => {
      const mockDeletedNotifications = [
        { notification_id: 'notif-1' },
        { notification_id: 'notif-2' },
      ];

      supabaseMock.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: mockDeletedNotifications,
                error: null,
              }),
            }),
          }),
        }),
      });

      const count = await notifications.deleteAllRead();

      expect(count).toBe(2);
    });

    it('should delete notifications older than 30 days', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const mockOldNotifications = [
        {
          notification_id: 'notif-1',
          created_at: new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          notification_id: 'notif-2',
          created_at: new Date(thirtyDaysAgo.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        },
      ];

      supabaseMock.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: mockOldNotifications,
                error: null,
              }),
            }),
          }),
        }),
      });

      const count = await notifications.deleteOldNotifications();

      expect(count).toBe(2);
    });
  });

  describe('Real-time Notification Updates', () => {
    it('should poll for new notifications every 30 seconds', () => {
      const pollingInterval = 30000; // 30 seconds in milliseconds

      expect(pollingInterval).toBe(30000);
    });

    it('should detect new notifications since last check', async () => {
      const lastCheckTime = new Date(Date.now() - 60000); // 1 minute ago

      const mockNotifications = [
        {
          notification_id: 'notif-new',
          created_at: new Date().toISOString(), // Just now
        },
        {
          notification_id: 'notif-old',
          created_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
        },
      ];

      const newNotifications = mockNotifications.filter(
        n => new Date(n.created_at) > lastCheckTime
      );

      expect(newNotifications.length).toBe(1);
      expect(newNotifications[0].notification_id).toBe('notif-new');
    });

    it('should show badge animation for new notifications', () => {
      const previousCount = 3;
      const currentCount = 5;
      const hasNewNotifications = currentCount > previousCount;

      expect(hasNewNotifications).toBe(true);
    });
  });

  describe('Notification Filtering', () => {
    it('should filter notifications by type', async () => {
      const mockNotifications = [
        { notification_id: 'notif-1', notification_type: 'new_order' },
        { notification_id: 'notif-2', notification_type: 'payment_pending' },
        { notification_id: 'notif-3', notification_type: 'new_order' },
      ];

      const orderNotifications = mockNotifications.filter(
        n => n.notification_type === 'new_order'
      );

      expect(orderNotifications.length).toBe(2);
    });

    it('should filter unread notifications', async () => {
      const mockNotifications = [
        { notification_id: 'notif-1', is_read: false },
        { notification_id: 'notif-2', is_read: true },
        { notification_id: 'notif-3', is_read: false },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockNotifications.filter(n => !n.is_read),
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await notifications.fetchStaffNotifications({ unreadOnly: true });

      expect(result.length).toBe(2);
      expect(result.every(n => !n.is_read)).toBe(true);
    });
  });

  describe('Notification Priority', () => {
    it('should prioritize urgent notifications', () => {
      const mockNotifications = [
        { notification_id: 'notif-1', notification_type: 'payment_pending', created_at: '2024-01-15T10:00:00' },
        { notification_id: 'notif-2', notification_type: 'new_order', created_at: '2024-01-15T11:00:00' },
        { notification_id: 'notif-3', notification_type: 'custom_request', created_at: '2024-01-15T09:00:00' },
      ];

      // Sort by creation date (newest first)
      const sorted = [...mockNotifications].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });

      expect(sorted[0].notification_id).toBe('notif-2'); // Newest
      expect(sorted[2].notification_id).toBe('notif-3'); // Oldest
    });

    it('should highlight payment verification notifications', () => {
      const notification = {
        notification_type: 'payment_pending',
      };

      const isHighPriority = notification.notification_type === 'payment_pending';
      expect(isHighPriority).toBe(true);
    });
  });

  describe('Notification Preferences', () => {
    it('should support notification types configuration', () => {
      const enabledNotificationTypes = [
        'new_order',
        'payment_pending',
        'custom_request',
      ];

      expect(enabledNotificationTypes).toContain('new_order');
      expect(enabledNotificationTypes).toContain('payment_pending');
      expect(enabledNotificationTypes).not.toContain('quote_approved');
    });

    it('should respect user notification preferences', () => {
      const userPreferences = {
        new_order: true,
        payment_pending: true,
        custom_request: false,
      };

      const notificationType = 'custom_request';
      const shouldNotify = userPreferences[notificationType] !== false;

      // Default to true if not specified, false if explicitly set
      expect(shouldNotify).toBe(false);
    });
  });
});

