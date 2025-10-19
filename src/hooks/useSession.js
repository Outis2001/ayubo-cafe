/**
 * useSession Hook
 * 
 * Custom React hook for automatic session management including:
 * - Automatic session refresh every 5 minutes
 * - Session expiration detection and handling
 * - Redirect to login on session expiry
 * 
 * @module hooks/useSession
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { refreshSession, validateSession } from '../utils/session';
import { supabaseClient } from '../config/supabase';

/**
 * useSession Hook
 * 
 * Manages automatic session refresh and expiration handling.
 * Should be used in components that require authentication.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.refreshInterval - Interval for auto-refresh in milliseconds (default: 5 minutes)
 * @param {Function} options.onSessionExpired - Callback when session expires
 * 
 * @example
 * function Dashboard() {
 *   useSession({
 *     onSessionExpired: () => {
 *       alert('Your session has expired. Please login again.');
 *     }
 *   });
 *   
 *   return <div>Dashboard Content</div>;
 * }
 */
const useSession = (options = {}) => {
  const {
    refreshInterval = 5 * 60 * 1000, // 5 minutes in milliseconds
    onSessionExpired = null
  } = options;

  const { currentUser, logout, isAuthenticated } = useAuth();
  const intervalRef = useRef(null);
  const isRefreshingRef = useRef(false);

  /**
   * Get session token from storage
   */
  const getSessionToken = () => {
    return localStorage.getItem('session_token') || sessionStorage.getItem('session_token');
  };

  /**
   * Log session expiration to audit logs
   */
  const logSessionExpiration = async (userId, expirationReason, details = {}) => {
    try {
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: userId,
          username_attempted: null,
          action: 'session_expired',
          status: 'success',
          details: {
            expiration_reason: expirationReason,
            ...details
          },
          ip_address: null,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging session expiration:', error);
    }
  };

  /**
   * Handle session expiration
   */
  const handleSessionExpired = async (reason, details = {}) => {
    // Only handle if user is currently authenticated
    if (!currentUser || !isAuthenticated) {
      return;
    }

    console.log(`Session expired: ${reason}`, details);

    // Log the expiration event
    await logSessionExpiration(currentUser.user_id, reason, details);

    // Clear the refresh interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Call custom callback if provided
    if (onSessionExpired && typeof onSessionExpired === 'function') {
      onSessionExpired(reason, details);
    }

    // Logout the user (this will clear storage and reset state)
    await logout();

    // Show user-friendly message
    const messages = {
      expired_timeout: 'Your session has expired. Please login again.',
      expired_inactivity: 'Your session expired due to inactivity. Please login again.',
      invalid: 'Your session is no longer valid. Please login again.'
    };

    const message = messages[reason] || 'Your session has expired. Please login again.';
    
    // Use a slight delay to ensure state is updated
    setTimeout(() => {
      alert(message);
    }, 100);
  };

  /**
   * Refresh the current session
   */
  const performSessionRefresh = async () => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      return;
    }

    // Only refresh if user is authenticated
    if (!currentUser || !isAuthenticated) {
      return;
    }

    try {
      isRefreshingRef.current = true;

      const sessionToken = getSessionToken();

      if (!sessionToken) {
        console.warn('No session token found, skipping refresh');
        await handleSessionExpired('invalid', { reason: 'no_token' });
        return;
      }

      // First validate the session
      const validation = await validateSession(sessionToken);

      if (!validation.isValid) {
        // Session is invalid, handle expiration
        const reason = validation.reason || 'invalid';
        const expirationReason = validation.expiration_reason || 'unknown';
        
        await handleSessionExpired(
          expirationReason === 'inactivity' ? 'expired_inactivity' : 
          expirationReason === 'timeout' ? 'expired_timeout' : 
          'invalid',
          {
            validation_reason: reason,
            ...validation
          }
        );
        return;
      }

      // Session is valid, refresh it
      const result = await refreshSession(sessionToken);

      if (!result.success) {
        console.error('Failed to refresh session:', result.error);
        // Don't logout on refresh failure, just log the error
        // The session will be validated on next refresh
      } else {
        console.log('Session refreshed successfully');
      }

    } catch (error) {
      console.error('Error during session refresh:', error);
      // Don't logout on error, just log it
    } finally {
      isRefreshingRef.current = false;
    }
  };

  /**
   * Setup automatic session refresh
   */
  useEffect(() => {
    // Only setup if user is authenticated
    if (!currentUser || !isAuthenticated) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Perform initial refresh
    performSessionRefresh();

    // Setup interval for periodic refresh
    intervalRef.current = setInterval(() => {
      performSessionRefresh();
    }, refreshInterval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentUser, isAuthenticated, refreshInterval]);

  /**
   * Setup visibility change listener
   * Refresh session when user returns to the tab
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser && isAuthenticated) {
        console.log('Tab became visible, refreshing session');
        performSessionRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, isAuthenticated]);

  /**
   * Setup user activity listener
   * Refresh session on user interaction (optional optimization)
   */
  useEffect(() => {
    let activityTimer = null;

    const handleUserActivity = () => {
      // Debounce: only refresh after 1 minute of activity
      if (activityTimer) {
        clearTimeout(activityTimer);
      }

      activityTimer = setTimeout(() => {
        if (currentUser && isAuthenticated) {
          performSessionRefresh();
        }
      }, 60000); // 1 minute
    };

    // Listen for user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      if (activityTimer) {
        clearTimeout(activityTimer);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [currentUser, isAuthenticated]);

  // Return utility functions if needed
  return {
    refreshSession: performSessionRefresh,
    isRefreshing: isRefreshingRef.current
  };
};

export { useSession };
export default useSession;

