/**
 * useNotifications Hook
 * 
 * Custom React hook for managing staff notifications.
 * 
 * Features:
 * - Fetch notifications
 * - Real-time polling (every 30 seconds)
 * - Unread count tracking
 * - Mark as read functionality
 * - Delete notifications
 * - Notification state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient } from '../config/supabase';
import {
  fetchStaffNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} from '../utils/notifications';

/**
 * useNotifications Hook
 * @param {Object} options - Hook options
 * @returns {Object} Notification state and functions
 */
export const useNotifications = (options = {}) => {
  const {
    pollingInterval = 30000, // 30 seconds
    limit = 20,
    autoFetch = true,
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasNewNotification, setHasNewNotification] = useState(false);

  const pollingIntervalRef = useRef(null);
  const previousCountRef = useRef(0);

  /**
   * Fetch notifications
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchStaffNotifications({ limit });
      setNotifications(data);

      // Check for new notifications
      const currentCount = data.filter(n => !n.is_read).length;
      if (currentCount > previousCountRef.current && previousCountRef.current > 0) {
        setHasNewNotification(true);
        // Reset after 3 seconds
        setTimeout(() => setHasNewNotification(false), 3000);
      }
      previousCountRef.current = currentCount;
    } catch (err) {
      console.error('[useNotifications] Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  /**
   * Fetch unread count
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('[useNotifications] Error fetching unread count:', err);
    }
  }, []);

  /**
   * Refresh notifications
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchNotifications(),
      fetchUnreadCount(),
    ]);
  }, [fetchNotifications, fetchUnreadCount]);

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[useNotifications] Error marking as read:', err);
      throw err;
    }
  }, []);

  /**
   * Mark all as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      
      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('[useNotifications] Error marking all as read:', err);
      throw err;
    }
  }, []);

  /**
   * Delete notification
   */
  const handleDelete = useCallback(async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      
      // Update local state
      const notification = notifications.find(n => n.notification_id === notificationId);
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
      
      // Update unread count if it was unread
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[useNotifications] Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  /**
   * Delete all read notifications
   */
  const handleDeleteAllRead = useCallback(async () => {
    try {
      await deleteAllRead();
      
      // Update local state - keep only unread
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (err) {
      console.error('[useNotifications] Error deleting all read:', err);
      throw err;
    }
  }, []);

  /**
   * Setup polling
   */
  useEffect(() => {
    if (autoFetch) {
      // Initial fetch
      refresh();

      // Setup polling
      pollingIntervalRef.current = setInterval(() => {
        fetchNotifications();
        fetchUnreadCount();
      }, pollingInterval);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [autoFetch, pollingInterval, refresh, fetchNotifications, fetchUnreadCount]);

  /**
   * Setup real-time subscription
   */
  useEffect(() => {
    const channel = supabaseClient
      .channel('staff-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_notifications',
          filter: 'customer_id=is.null',
        },
        () => {
          console.log('[useNotifications] New notification received');
          fetchNotifications();
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_notifications',
          filter: 'customer_id=is.null',
        },
        () => {
          console.log('[useNotifications] Notification updated');
          fetchNotifications();
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    hasNewNotification,

    // Functions
    refresh,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDelete,
    deleteAllRead: handleDeleteAllRead,
  };
};

export default useNotifications;

