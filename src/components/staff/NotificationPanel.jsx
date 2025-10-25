/**
 * Notification Panel Component (Staff)
 * 
 * Dropdown panel displaying recent notifications with actions.
 * 
 * Features:
 * - Display recent notifications (last 20)
 * - Show notification type, title, message, timestamp
 * - Visual distinction between read/unread
 * - Click to navigate to related item
 * - Mark as read on click
 * - Mark all as read button
 * - Clear all read button
 * - Loading and empty states
 */

import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import {
  getNotificationColor,
  formatTimeAgo,
  getNotificationPath,
} from '../../utils/notifications';
import { Loader } from '../icons';

const NotificationPanel = ({ onClose }) => {
  const navigate = useNavigate();
  const {
    notifications,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteAllRead,
  } = useNotifications();

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await markAsRead(notification.notification_id);
      }

      // Navigate to related item
      const path = getNotificationPath(notification);
      if (path) {
        navigate(path);
      }

      // Close panel
      if (onClose) onClose();
    } catch (err) {
      console.error('[Notification Panel] Error handling click:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      console.error('[Notification Panel] Error marking all as read:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await deleteAllRead();
    } catch (err) {
      console.error('[Notification Panel] Error clearing notifications:', err);
    }
  };

  // Get icon component based on notification type
  const getNotificationIcon = (type) => {
    const colorClass = getNotificationColor(type);
    
    return (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
        {type === 'new_order' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        )}
        {type === 'custom_request' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
          </svg>
        )}
        {type === 'payment_pending' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )}
        {type === 'quote_approved' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {type === 'quote_rejected' && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {(type === 'order_status_changed' || !['new_order', 'custom_request', 'payment_pending', 'quote_approved', 'quote_rejected'].includes(type)) && (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )}
      </div>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({unreadCount} unread)
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all as read
              </button>
            )}
            {notifications.some(n => n.is_read) && (
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Clear read
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-4 text-center text-red-600 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-gray-600 font-medium mb-1">No notifications</p>
              <p className="text-gray-500 text-sm">You're all caught up!</p>
            </div>
          )}

          {!loading && !error && notifications.length > 0 && (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    {getNotificationIcon(notification.notification_type)}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium text-gray-900 ${
                          !notification.is_read ? 'font-semibold' : ''
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 text-center">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationPanel;

