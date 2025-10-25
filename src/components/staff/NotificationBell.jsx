/**
 * Notification Bell Component (Staff)
 * 
 * Bell icon with unread count badge and animation for new notifications.
 * 
 * Features:
 * - Display bell icon
 * - Show unread count badge
 * - Animate when new notification arrives
 * - Toggle notification panel
 */

import { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';

const NotificationBell = () => {
  const { unreadCount, hasNewNotification } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);

  const handleTogglePanel = () => {
    setShowPanel(!showPanel);
  };

  const handleClosePanel = () => {
    setShowPanel(false);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleTogglePanel}
        className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all ${
          hasNewNotification ? 'animate-bounce' : ''
        }`}
        title="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className={`w-6 h-6 ${hasNewNotification ? 'animate-shake' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* New Notification Indicator */}
        {hasNewNotification && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-blue-600 rounded-full animate-ping"></span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <NotificationPanel onClose={handleClosePanel} />
      )}
    </div>
  );
};

export default NotificationBell;

// Add custom animation CSS (add to your global CSS or tailwind config)
/*
@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
  20%, 40%, 60%, 80% { transform: rotate(10deg); }
}

.animate-shake {
  animation: shake 0.5s;
}
*/

