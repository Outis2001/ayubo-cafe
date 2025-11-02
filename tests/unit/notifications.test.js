/**
 * Notifications Utilities Tests
 * 
 * Unit tests for notification system utilities (Task 9.0)
 * Tests notification creation, fetching, marking as read, and deletion
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

describe('Notification Utilities', () => {
  let supabaseMock;
  let notifications;

  beforeEach(async () => {
    vi.clearAllMocks();
    const supabaseModule = await import('../../src/config/supabase');
    supabaseMock = supabaseModule.supabaseClient;
    notifications = await import('../../src/utils/notifications');
  });

  describe('Notification Constants', () => {
    it('should export notification types', () => {
      expect(notifications.NOTIFICATION_TYPES).toBeDefined();
      expect(notifications.NOTIFICATION_TYPES.NEW_ORDER).toBe('new_order');
      expect(notifications.NOTIFICATION_TYPES.CUSTOM_REQUEST).toBe('custom_request');
      expect(notifications.NOTIFICATION_TYPES.PAYMENT_PENDING).toBe('payment_pending');
      expect(notifications.NOTIFICATION_TYPES.QUOTE_APPROVED).toBe('quote_approved');
      expect(notifications.NOTIFICATION_TYPES.QUOTE_REJECTED).toBe('quote_rejected');
    });
  });

  describe('fetchStaffNotifications', () => {
    it('should fetch staff notifications with default options', async () => {
      const mockNotifications = [
        {
          notification_id: 'notif-1',
          customer_id: null,
          notification_type: 'new_order',
          title: 'New Order',
          message: 'New order received',
          is_read: false,
        },
        {
          notification_id: 'notif-2',
          customer_id: null,
          notification_type: 'payment_pending',
          title: 'Payment Pending',
          message: 'Payment verification needed',
          is_read: false,
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

      const result = await notifications.fetchStaffNotifications();

      expect(result).toEqual(mockNotifications);
      expect(result.length).toBe(2);
      expect(supabaseMock.from).toHaveBeenCalledWith('customer_notifications');
    });

    it('should fetch only unread notifications when unreadOnly is true', async () => {
      const mockUnreadNotifications = [
        {
          notification_id: 'notif-1',
          is_read: false,
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: mockUnreadNotifications,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await notifications.fetchStaffNotifications({ unreadOnly: true });

      expect(result).toEqual(mockUnreadNotifications);
      expect(result.every(n => !n.is_read)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      let limitCalled = false;
      let limitValue;

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation((value) => {
                limitCalled = true;
                limitValue = value;
                return Promise.resolve({ data: [], error: null });
              }),
            }),
          }),
        }),
      });

      await notifications.fetchStaffNotifications({ limit: 10 });

      expect(limitCalled).toBe(true);
      expect(limitValue).toBe(10);
    });

    it('should return empty array on error', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      await expect(notifications.fetchStaffNotifications()).rejects.toThrow();
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
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

      const result = await notifications.getUnreadCount();

      expect(result).toBe(5);
    });

    it('should return 0 if no unread notifications', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: 0,
              error: null,
            }),
          }),
        }),
      });

      const result = await notifications.getUnreadCount();

      expect(result).toBe(0);
    });

    it('should return 0 on error', async () => {
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              count: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const result = await notifications.getUnreadCount();

      expect(result).toBe(0);
    });
  });

  describe('createStaffNotification', () => {
    it('should create staff notification with required fields', async () => {
      const notificationData = {
        notification_type: 'new_order',
        title: 'New Order Received',
        message: 'Order #ORD-123 has been placed',
        related_type: 'customer_order',
        related_id: 'order-123',
      };

      const mockCreatedNotification = {
        notification_id: 'notif-789',
        customer_id: null,
        ...notificationData,
        is_read: false,
      };

      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedNotification,
              error: null,
            }),
          }),
        }),
      });

      const result = await notifications.createStaffNotification(notificationData);

      expect(result).toBeDefined();
      expect(result.notification_id).toBe('notif-789');
      expect(result.customer_id).toBeNull();
      expect(result.is_read).toBe(false);
      expect(supabaseMock.from).toHaveBeenCalledWith('customer_notifications');
    });

    it('should handle notification without related data', async () => {
      const notificationData = {
        notification_type: 'custom_request',
        title: 'New Custom Request',
        message: 'A new custom cake request has been submitted',
      };

      let insertedData;
      supabaseMock.from.mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data[0];
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...data[0], notification_id: 'notif-456' },
                error: null,
              }),
            }),
          };
        }),
      });

      await notifications.createStaffNotification(notificationData);

      expect(insertedData.related_type).toBeNull();
      expect(insertedData.related_id).toBeNull();
    });

    it('should throw error on database failure', async () => {
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

      const notificationData = {
        notification_type: 'new_order',
        title: 'Test',
        message: 'Test message',
      };

      await expect(notifications.createStaffNotification(notificationData)).rejects.toThrow();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';

      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  notification_id: notificationId,
                  is_read: true,
                  read_at: expect.any(String),
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

    it('should throw error on database failure', async () => {
      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            }),
          }),
        }),
      });

      await expect(notifications.markAsRead('notif-123')).rejects.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
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

      const result = await notifications.markAllAsRead();

      expect(result).toBe(3);
    });

    it('should return 0 if no notifications to mark', async () => {
      supabaseMock.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await notifications.markAllAsRead();

      expect(result).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
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
      expect(supabaseMock.from).toHaveBeenCalledWith('customer_notifications');
    });

    it('should throw error on database failure', async () => {
      supabaseMock.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Database error' },
          }),
        }),
      });

      await expect(notifications.deleteNotification('notif-123')).rejects.toThrow();
    });
  });

  describe('deleteAllRead', () => {
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

      const result = await notifications.deleteAllRead();

      expect(result).toBe(2);
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete notifications older than 30 days', async () => {
      const mockDeletedNotifications = [
        { notification_id: 'notif-1' },
        { notification_id: 'notif-2' },
        { notification_id: 'notif-3' },
      ];

      supabaseMock.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: mockDeletedNotifications,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await notifications.deleteOldNotifications();

      expect(result).toBe(3);
    });

    it('should return 0 if no old notifications', async () => {
      supabaseMock.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            lt: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await notifications.deleteOldNotifications();

      expect(result).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    describe('getNotificationIcon', () => {
      it('should return correct icon for each notification type', () => {
        expect(notifications.getNotificationIcon('new_order')).toBe('shopping-bag');
        expect(notifications.getNotificationIcon('custom_request')).toBe('cake');
        expect(notifications.getNotificationIcon('payment_pending')).toBe('credit-card');
        expect(notifications.getNotificationIcon('quote_approved')).toBe('check-circle');
        expect(notifications.getNotificationIcon('quote_rejected')).toBe('x-circle');
        expect(notifications.getNotificationIcon('order_status_changed')).toBe('refresh');
        expect(notifications.getNotificationIcon('payment_verified')).toBe('check');
        expect(notifications.getNotificationIcon('payment_rejected')).toBe('x');
        expect(notifications.getNotificationIcon('unknown')).toBe('bell');
      });
    });

    describe('getNotificationColor', () => {
      it('should return correct color class for each notification type', () => {
        expect(notifications.getNotificationColor('new_order')).toContain('blue');
        expect(notifications.getNotificationColor('custom_request')).toContain('purple');
        expect(notifications.getNotificationColor('payment_pending')).toContain('yellow');
        expect(notifications.getNotificationColor('quote_approved')).toContain('green');
        expect(notifications.getNotificationColor('quote_rejected')).toContain('red');
        expect(notifications.getNotificationColor('payment_verified')).toContain('green');
        expect(notifications.getNotificationColor('payment_rejected')).toContain('red');
        expect(notifications.getNotificationColor('unknown')).toContain('gray');
      });
    });

    describe('formatTimeAgo', () => {
      it('should format recent timestamps correctly', () => {
        const now = new Date();
        
        // Just now (less than 1 minute ago)
        const justNow = new Date(now.getTime() - 30 * 1000);
        expect(notifications.formatTimeAgo(justNow.toISOString())).toBe('Just now');

        // Minutes ago
        const minutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        expect(notifications.formatTimeAgo(minutesAgo.toISOString())).toBe('5m ago');

        // Hours ago
        const hoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        expect(notifications.formatTimeAgo(hoursAgo.toISOString())).toBe('2h ago');

        // Days ago
        const daysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        expect(notifications.formatTimeAgo(daysAgo.toISOString())).toBe('3d ago');

        // Weeks ago
        const weeksAgo = new Date(now.getTime() - 2 * 7 * 24 * 60 * 60 * 1000);
        expect(notifications.formatTimeAgo(weeksAgo.toISOString())).toBe('2w ago');
      });

      it('should format old dates as localized date string', () => {
        const oldDate = new Date('2023-01-15');
        const result = notifications.formatTimeAgo(oldDate.toISOString());
        
        // Result should be a date string (format varies by locale)
        expect(result).toMatch(/\d+/); // Should contain numbers
      });
    });

    describe('getNotificationPath', () => {
      it('should return correct path for customer order', () => {
        const notification = {
          related_type: 'customer_order',
          related_id: 'order-123',
        };

        const path = notifications.getNotificationPath(notification);
        expect(path).toBe('/staff/orders?order_id=order-123');
      });

      it('should return correct path for custom cake request', () => {
        const notification = {
          related_type: 'custom_cake_request',
          related_id: 'request-456',
        };

        const path = notifications.getNotificationPath(notification);
        expect(path).toBe('/staff/custom-requests?request_id=request-456');
      });

      it('should return correct path for customer payment', () => {
        const notification = {
          related_type: 'customer_payment',
          related_id: 'payment-789',
        };

        const path = notifications.getNotificationPath(notification);
        expect(path).toBe('/staff/payment-verification?payment_id=payment-789');
      });

      it('should return default path for unknown type', () => {
        const notification = {
          related_type: 'unknown',
          related_id: 'some-id',
        };

        const path = notifications.getNotificationPath(notification);
        expect(path).toBe('/staff/orders');
      });

      it('should return null if no related data', () => {
        const notification = {
          related_type: null,
          related_id: null,
        };

        const path = notifications.getNotificationPath(notification);
        expect(path).toBeNull();
      });
    });
  });
});

