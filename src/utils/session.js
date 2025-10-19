/**
 * Session Management Utilities
 * 
 * Provides session management functionality including:
 * - Session creation and validation
 * - Session expiration and refresh
 * - Session invalidation (single and batch)
 * 
 * @module utils/session
 */

import { supabaseClient } from '../config/supabase';
import { generateSessionToken } from './auth';

/**
 * Create a new user session
 * 
 * Creates a session record in the database with appropriate expiration time
 * based on the remember_me flag.
 * 
 * @param {string} userId - User ID to create session for
 * @param {boolean} rememberMe - Whether to create long-term session (7 days vs 8 hours)
 * @returns {Promise<Object>} Result with success boolean, sessionToken, and error
 * 
 * @example
 * const result = await createSession(userId, true);
 * if (result.success) {
 *   localStorage.setItem('session_token', result.sessionToken);
 * }
 */
export const createSession = async (userId, rememberMe = false) => {
  try {
    // Generate unique session token
    const sessionToken = generateSessionToken();

    // Calculate expiration time
    const expiresAt = new Date();
    if (rememberMe) {
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days for remember me
    } else {
      expiresAt.setHours(expiresAt.getHours() + 8); // 8 hours for standard session
    }

    // Insert session into database
    const { data, error } = await supabaseClient
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        remember_me: rememberMe,
        expires_at: expiresAt.toISOString(),
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return {
        success: false,
        error: 'Failed to create session'
      };
    }

    return {
      success: true,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      rememberMe
    };

  } catch (error) {
    console.error('Unexpected error creating session:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Validate a session token
 * 
 * Checks if session token exists, hasn't expired, and checks inactivity timeout
 * for short sessions (non-remember_me).
 * 
 * @param {string} sessionToken - Session token to validate
 * @returns {Promise<Object>} Validation result with isValid, session data, and reason for invalidity
 * 
 * @example
 * const result = await validateSession(token);
 * if (result.isValid) {
 *   console.log('Session valid for user:', result.session.user_id);
 * } else {
 *   console.log('Session invalid:', result.reason);
 * }
 */
export const validateSession = async (sessionToken) => {
  try {
    if (!sessionToken) {
      return {
        isValid: false,
        reason: 'no_token',
        message: 'No session token provided'
      };
    }

    // Query session from database
    const { data: session, error } = await supabaseClient
      .from('user_sessions')
      .select('session_id, user_id, expires_at, remember_me, last_activity_at, created_at')
      .eq('session_token', sessionToken)
      .single();

    if (error || !session) {
      return {
        isValid: false,
        reason: 'not_found',
        message: 'Session not found'
      };
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const lastActivity = new Date(session.last_activity_at);

    // Check if session has expired (absolute expiration)
    if (now > expiresAt) {
      return {
        isValid: false,
        reason: 'expired_timeout',
        message: 'Session has expired',
        session,
        expiration_reason: 'timeout'
      };
    }

    // Check inactivity timeout for short sessions (30 minutes)
    if (!session.remember_me) {
      const inactivityMinutes = (now - lastActivity) / (1000 * 60);

      if (inactivityMinutes > 30) {
        return {
          isValid: false,
          reason: 'expired_inactivity',
          message: 'Session expired due to inactivity',
          session,
          expiration_reason: 'inactivity',
          minutes_inactive: Math.floor(inactivityMinutes)
        };
      }
    }

    // Session is valid
    return {
      isValid: true,
      session,
      message: 'Session is valid'
    };

  } catch (error) {
    console.error('Error validating session:', error);
    return {
      isValid: false,
      reason: 'error',
      message: 'Error validating session'
    };
  }
};

/**
 * Refresh a session's last activity timestamp
 * 
 * Updates the last_activity_at field to extend the inactivity timeout.
 * Should be called on each user interaction or API request.
 * 
 * @param {string} sessionToken - Session token to refresh
 * @returns {Promise<Object>} Result with success boolean and error
 * 
 * @example
 * await refreshSession(sessionToken);
 */
export const refreshSession = async (sessionToken) => {
  try {
    if (!sessionToken) {
      return {
        success: false,
        error: 'No session token provided'
      };
    }

    // Update last activity timestamp
    const { error } = await supabaseClient
      .from('user_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Error refreshing session:', error);
      return {
        success: false,
        error: 'Failed to refresh session'
      };
    }

    return {
      success: true,
      message: 'Session refreshed'
    };

  } catch (error) {
    console.error('Unexpected error refreshing session:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Invalidate a single session
 * 
 * Deletes a session from the database by session token.
 * Used for logout functionality.
 * 
 * @param {string} sessionToken - Session token to invalidate
 * @returns {Promise<Object>} Result with success boolean and error
 * 
 * @example
 * await invalidateSession(sessionToken);
 */
export const invalidateSession = async (sessionToken) => {
  try {
    if (!sessionToken) {
      return {
        success: false,
        error: 'No session token provided'
      };
    }

    // Delete session from database
    const { error } = await supabaseClient
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Error invalidating session:', error);
      return {
        success: false,
        error: 'Failed to invalidate session'
      };
    }

    return {
      success: true,
      message: 'Session invalidated'
    };

  } catch (error) {
    console.error('Unexpected error invalidating session:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Invalidate all sessions for a user
 * 
 * Deletes all session records for a given user ID.
 * Used when user changes password or is deactivated.
 * 
 * @param {string} userId - User ID to invalidate all sessions for
 * @param {string} exceptSessionToken - Optional session token to keep active (e.g., current session)
 * @returns {Promise<Object>} Result with success boolean, count of invalidated sessions, and error
 * 
 * @example
 * // Invalidate all sessions
 * await invalidateUserSessions(userId);
 * 
 * // Invalidate all sessions except current
 * await invalidateUserSessions(userId, currentSessionToken);
 */
export const invalidateUserSessions = async (userId, exceptSessionToken = null) => {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'No user ID provided'
      };
    }

    // Build query to delete sessions
    let query = supabaseClient
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);

    // If exceptSessionToken is provided, exclude it from deletion
    if (exceptSessionToken) {
      query = query.neq('session_token', exceptSessionToken);
    }

    const { data, error, count } = await query.select();

    if (error) {
      console.error('Error invalidating user sessions:', error);
      return {
        success: false,
        error: 'Failed to invalidate sessions'
      };
    }

    return {
      success: true,
      count: data ? data.length : 0,
      message: `Invalidated ${data ? data.length : 0} session(s)`
    };

  } catch (error) {
    console.error('Unexpected error invalidating user sessions:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Get all active sessions for a user
 * 
 * Retrieves all non-expired sessions for a user.
 * Useful for displaying active sessions to the user.
 * 
 * @param {string} userId - User ID to get sessions for
 * @returns {Promise<Object>} Result with success boolean, sessions array, and error
 * 
 * @example
 * const result = await getUserSessions(userId);
 * console.log('Active sessions:', result.sessions.length);
 */
export const getUserSessions = async (userId) => {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'No user ID provided'
      };
    }

    const now = new Date().toISOString();

    // Query all non-expired sessions for user
    const { data: sessions, error } = await supabaseClient
      .from('user_sessions')
      .select('session_id, remember_me, expires_at, created_at, last_activity_at')
      .eq('user_id', userId)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user sessions:', error);
      return {
        success: false,
        error: 'Failed to get sessions'
      };
    }

    return {
      success: true,
      sessions: sessions || [],
      count: sessions ? sessions.length : 0
    };

  } catch (error) {
    console.error('Unexpected error getting user sessions:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

/**
 * Clean up expired sessions
 * 
 * Deletes all expired sessions from the database.
 * Should be called periodically (e.g., daily cron job).
 * 
 * @returns {Promise<Object>} Result with success boolean, count of deleted sessions, and error
 * 
 * @example
 * const result = await cleanupExpiredSessions();
 * console.log('Cleaned up', result.count, 'expired sessions');
 */
export const cleanupExpiredSessions = async () => {
  try {
    const now = new Date().toISOString();

    // Delete all sessions where expires_at is in the past
    const { data, error } = await supabaseClient
      .from('user_sessions')
      .delete()
      .lt('expires_at', now)
      .select();

    if (error) {
      console.error('Error cleaning up expired sessions:', error);
      return {
        success: false,
        error: 'Failed to cleanup sessions'
      };
    }

    return {
      success: true,
      count: data ? data.length : 0,
      message: `Cleaned up ${data ? data.length : 0} expired session(s)`
    };

  } catch (error) {
    console.error('Unexpected error cleaning up sessions:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
};

