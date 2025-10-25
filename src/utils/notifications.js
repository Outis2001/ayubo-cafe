/**
 * Notification Utilities
 * 
 * Handles staff notification operations for the in-app notification system.
 * 
 * Features:
 * - Fetch notifications for staff
 * - Create notifications
 * - Mark as read
 * - Delete notifications
 * - Notification types and formatting
 */

import { supabaseClient } from '../config/supabase';
import { logAuditEvent } from './auditLog';

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = {
  NEW_ORDER: 'new_order',
  CUSTOM_REQUEST: 'custom_request',
  PAYMENT_PENDING: 'payment_pending',
  QUOTE_APPROVED: 'quote_approved',
  QUOTE_REJECTED: 'quote_rejected',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  PAYMENT_VERIFIED: 'payment_verified',
  PAYMENT_REJECTED: 'payment_rejected',
};

/**
 * Fetch notifications for staff
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Notifications
 */
export const fetchStaffNotifications = async (options = {}) => {
  try {
    const {
      limit = 20,
      unreadOnly = false,
      userId = null,
    } = options;

    let query = supabaseClient
      .from('customer_notifications')
      .select('*')
      .is('customer_id', null) // Staff notifications have null customer_id
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Notifications] Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 * @returns {Promise<number>} Unread count
 */
export const getUnreadCount = async () => {
  try {
    const { count, error } = await supabaseClient
      .from('customer_notifications')
      .select('*', { count: 'exact', head: true })
      .is('customer_id', null)
      .eq('is_read', false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('[Notifications] Error getting unread count:', error);
    return 0;
  }
};

/**
 * Create a staff notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
export const createStaffNotification = async (notificationData) => {
  try {
    const {
      notification_type,
      title,
      message,
      related_type,
      related_id,
    } = notificationData;

    const notification = {
      customer_id: null, // Staff notification
      notification_type,
      title,
      message,
      related_type: related_type || null,
      related_id: related_id || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from('customer_notifications')
      .insert([notification])
      .select()
      .single();

    if (error) throw error;

    console.log('[Notifications] Staff notification created:', data.notification_id);

    return data;
  } catch (error) {
    console.error('[Notifications] Error creating notification:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
export const markAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabaseClient
      .from('customer_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('notification_id', notificationId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[Notifications] Error marking as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @returns {Promise<number>} Number of notifications marked
 */
export const markAllAsRead = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('customer_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .is('customer_id', null)
      .eq('is_read', false)
      .select();

    if (error) throw error;

    const count = data?.length || 0;
    console.log('[Notifications] Marked all as read:', count);

    return count;
  } catch (error) {
    console.error('[Notifications] Error marking all as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {Promise<boolean>} Success
 */
export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabaseClient
      .from('customer_notifications')
      .delete()
      .eq('notification_id', notificationId);

    if (error) throw error;

    console.log('[Notifications] Notification deleted:', notificationId);

    return true;
  } catch (error) {
    console.error('[Notifications] Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete all read notifications
 * @returns {Promise<number>} Number of notifications deleted
 */
export const deleteAllRead = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('customer_notifications')
      .delete()
      .is('customer_id', null)
      .eq('is_read', true)
      .select();

    if (error) throw error;

    const count = data?.length || 0;
    console.log('[Notifications] Deleted read notifications:', count);

    return count;
  } catch (error) {
    console.error('[Notifications] Error deleting notifications:', error);
    throw error;
  }
};

/**
 * Delete old notifications (older than 30 days)
 * @returns {Promise<number>} Number of notifications deleted
 */
export const deleteOldNotifications = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabaseClient
      .from('customer_notifications')
      .delete()
      .is('customer_id', null)
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select();

    if (error) throw error;

    const count = data?.length || 0;
    console.log('[Notifications] Deleted old notifications:', count);

    return count;
  } catch (error) {
    console.error('[Notifications] Error deleting old notifications:', error);
    throw error;
  }
};

/**
 * Get notification icon based on type
 * @param {string} type - Notification type
 * @returns {string} Icon name or component
 */
export const getNotificationIcon = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.NEW_ORDER:
      return 'shopping-bag';
    case NOTIFICATION_TYPES.CUSTOM_REQUEST:
      return 'cake';
    case NOTIFICATION_TYPES.PAYMENT_PENDING:
      return 'credit-card';
    case NOTIFICATION_TYPES.QUOTE_APPROVED:
      return 'check-circle';
    case NOTIFICATION_TYPES.QUOTE_REJECTED:
      return 'x-circle';
    case NOTIFICATION_TYPES.ORDER_STATUS_CHANGED:
      return 'refresh';
    case NOTIFICATION_TYPES.PAYMENT_VERIFIED:
      return 'check';
    case NOTIFICATION_TYPES.PAYMENT_REJECTED:
      return 'x';
    default:
      return 'bell';
  }
};

/**
 * Get notification color based on type
 * @param {string} type - Notification type
 * @returns {string} Tailwind color class
 */
export const getNotificationColor = (type) => {
  switch (type) {
    case NOTIFICATION_TYPES.NEW_ORDER:
      return 'bg-blue-100 text-blue-600';
    case NOTIFICATION_TYPES.CUSTOM_REQUEST:
      return 'bg-purple-100 text-purple-600';
    case NOTIFICATION_TYPES.PAYMENT_PENDING:
      return 'bg-yellow-100 text-yellow-600';
    case NOTIFICATION_TYPES.QUOTE_APPROVED:
      return 'bg-green-100 text-green-600';
    case NOTIFICATION_TYPES.QUOTE_REJECTED:
      return 'bg-red-100 text-red-600';
    case NOTIFICATION_TYPES.ORDER_STATUS_CHANGED:
      return 'bg-blue-100 text-blue-600';
    case NOTIFICATION_TYPES.PAYMENT_VERIFIED:
      return 'bg-green-100 text-green-600';
    case NOTIFICATION_TYPES.PAYMENT_REJECTED:
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

/**
 * Format notification time ago
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time ago
 */
export const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) {
    return 'Just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }

  return date.toLocaleDateString();
};

/**
 * Get navigation path for notification
 * @param {Object} notification - Notification object
 * @returns {string} Navigation path
 */
export const getNotificationPath = (notification) => {
  if (!notification.related_type || !notification.related_id) {
    return null;
  }

  switch (notification.related_type) {
    case 'customer_order':
      return `/staff/orders?order_id=${notification.related_id}`;
    case 'custom_cake_request':
      return `/staff/custom-requests?request_id=${notification.related_id}`;
    case 'customer_payment':
      return `/staff/payment-verification?payment_id=${notification.related_id}`;
    default:
      return '/staff/orders';
  }
};

