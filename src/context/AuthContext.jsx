/**
 * Authentication Context
 * 
 * Provides global authentication state and functions for the entire application.
 * Manages user login, logout, session persistence, and authentication checks.
 * 
 * @module context/AuthContext
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import { comparePassword } from '../utils/auth';
import { generateSessionToken } from '../utils/auth';

// Create the authentication context
const AuthContext = createContext(null);

/**
 * AuthProvider Component
 * 
 * Wraps the application to provide authentication state and functions
 * to all child components via React Context.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Check for existing session on component mount
   * Validates session token and restores user state if valid
   */
  useEffect(() => {
    checkSession();
  }, []);

  /**
   * Check if user has a valid session
   * 
   * Verifies session token from localStorage/sessionStorage and validates it
   * against the database. Restores user state if session is valid.
   */
  const checkSession = async () => {
    try {
      setLoading(true);

      // Try to get session token from storage (check both localStorage and sessionStorage)
      const sessionToken = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');

      if (!sessionToken) {
        setLoading(false);
        return;
      }

      // Validate session token with database
      const { data: session, error: sessionError } = await supabaseClient
        .from('user_sessions')
        .select('user_id, expires_at, remember_me, last_activity_at')
        .eq('session_token', sessionToken)
        .single();

      if (sessionError || !session) {
        // Invalid session, clear storage
        localStorage.removeItem('session_token');
        sessionStorage.removeItem('session_token');
        setLoading(false);
        return;
      }

      // Check if session is expired
      const now = new Date();
      const expiresAt = new Date(session.expires_at);

      if (now > expiresAt) {
        // Session expired - log to audit_logs
        await logAuditEvent(
          'session_expired',
          session.user_id,
          null,
          'success',
          { expiration_reason: 'timeout' }
        );

        // Delete expired session
        await supabaseClient
          .from('user_sessions')
          .delete()
          .eq('session_token', sessionToken);

        localStorage.removeItem('session_token');
        sessionStorage.removeItem('session_token');
        setLoading(false);
        return;
      }

      // Check for inactivity timeout (30 minutes for non-remember_me sessions)
      if (!session.remember_me) {
        const lastActivity = new Date(session.last_activity_at);
        const inactivityMinutes = (now - lastActivity) / (1000 * 60);

        if (inactivityMinutes > 30) {
          // Session expired due to inactivity - log to audit_logs
          await logAuditEvent(
            'session_expired',
            session.user_id,
            null,
            'success',
            { expiration_reason: 'inactivity', minutes_inactive: Math.floor(inactivityMinutes) }
          );

          // Delete expired session
          await supabaseClient
            .from('user_sessions')
            .delete()
            .eq('session_token', sessionToken);

          localStorage.removeItem('session_token');
          sessionStorage.removeItem('session_token');
          setLoading(false);
          return;
        }
      }

      // Session is valid, fetch user details
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('user_id, username, email, first_name, last_name, role, is_active')
        .eq('user_id', session.user_id)
        .single();

      if (userError || !user || !user.is_active) {
        // User not found or inactive
        localStorage.removeItem('session_token');
        sessionStorage.removeItem('session_token');
        setLoading(false);
        return;
      }

      // Update last activity timestamp
      await supabaseClient
        .from('user_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('session_token', sessionToken);

      // Restore user state
      setCurrentUser(user);
      setIsAuthenticated(true);

    } catch (error) {
      console.error('Error checking session:', error);
      localStorage.removeItem('session_token');
      sessionStorage.removeItem('session_token');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user with username and password
   * 
   * @param {string} username - User's username
   * @param {string} password - User's plain text password
   * @param {boolean} rememberMe - Whether to create a long-term session (7 days vs 8 hours)
   * @returns {Promise<Object>} Login result with success boolean and error message
   */
  const login = async (username, password, rememberMe = false) => {
    try {
      setLoading(true);

      // Query users table for matching username
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('user_id, username, email, first_name, last_name, role, is_active, password_hash')
        .eq('username', username)
        .single();

      if (userError || !user) {
        // Log failed login attempt
        await logAuditEvent(
          'failed_login',
          null,
          username,
          'failure',
          { reason: 'user_not_found' }
        );

        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Check if user is active
      if (!user.is_active) {
        await logAuditEvent(
          'failed_login',
          user.user_id,
          username,
          'failure',
          { reason: 'user_inactive' }
        );

        return {
          success: false,
          error: 'Account is deactivated. Please contact administrator.'
        };
      }

      // Compare password with stored hash
      const isPasswordValid = await comparePassword(password, user.password_hash);

      if (!isPasswordValid) {
        // Log failed login attempt
        await logAuditEvent(
          'failed_login',
          user.user_id,
          username,
          'failure',
          { reason: 'invalid_password' }
        );

        return {
          success: false,
          error: 'Invalid username or password'
        };
      }

      // Generate session token
      const sessionToken = generateSessionToken();

      // Calculate expiration time (8 hours or 7 days)
      const expiresAt = new Date();
      if (rememberMe) {
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
      } else {
        expiresAt.setHours(expiresAt.getHours() + 8); // 8 hours
      }

      // Create session in database
      const { error: sessionError } = await supabaseClient
        .from('user_sessions')
        .insert({
          user_id: user.user_id,
          session_token: sessionToken,
          remember_me: rememberMe,
          expires_at: expiresAt.toISOString(),
          last_activity_at: new Date().toISOString()
        });

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        return {
          success: false,
          error: 'Failed to create session. Please try again.'
        };
      }

      // Update last login timestamp
      await supabaseClient
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.user_id);

      // Store session token in appropriate storage
      if (rememberMe) {
        localStorage.setItem('session_token', sessionToken);
      } else {
        sessionStorage.setItem('session_token', sessionToken);
      }

      // Remove password_hash from user object before setting state
      const { password_hash, ...userWithoutPassword } = user;

      // Update state
      setCurrentUser(userWithoutPassword);
      setIsAuthenticated(true);

      // Log successful login
      await logAuditEvent(
        'login',
        user.user_id,
        username,
        'success',
        { remember_me: rememberMe }
      );

      return {
        success: true,
        user: userWithoutPassword
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout current user
   * 
   * Invalidates session in database and clears local storage
   */
  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token') || sessionStorage.getItem('session_token');

      if (sessionToken && currentUser) {
        // Log logout event
        await logAuditEvent(
          'logout',
          currentUser.user_id,
          currentUser.username,
          'success',
          { manual_logout: true }
        );

        // Invalidate session in database
        await supabaseClient
          .from('user_sessions')
          .delete()
          .eq('session_token', sessionToken);
      }

      // Clear storage
      localStorage.removeItem('session_token');
      sessionStorage.removeItem('session_token');

      // Reset state
      setCurrentUser(null);
      setIsAuthenticated(false);

    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if database operation fails
      localStorage.removeItem('session_token');
      sessionStorage.removeItem('session_token');
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  /**
   * Log audit event to database
   * 
   * @param {string} action - Action type (login, logout, etc.)
   * @param {string} userId - User ID (null for failed logins)
   * @param {string} usernameAttempted - Username attempted (for failed logins)
   * @param {string} status - 'success' or 'failure'
   * @param {Object} details - Additional details as JSON
   */
  const logAuditEvent = async (action, userId, usernameAttempted, status, details = {}) => {
    try {
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: userId,
          username_attempted: usernameAttempted,
          action,
          status,
          details,
          ip_address: null, // Will be populated by server-side if needed
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error, just log it - audit failures shouldn't break the app
    }
  };

  // Context value
  const value = {
    currentUser,
    loading,
    isAuthenticated,
    login,
    logout,
    checkSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * 
 * Custom hook to access authentication context.
 * Must be used within AuthProvider.
 * 
 * @returns {Object} Authentication context with currentUser, loading, isAuthenticated, login, logout, checkSession
 * @throws {Error} If used outside of AuthProvider
 * 
 * @example
 * const { currentUser, login, logout } = useAuth();
 * 
 * if (currentUser) {
 *   console.log('Logged in as:', currentUser.username);
 * }
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;

