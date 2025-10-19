/**
 * Audit Log Utility
 * 
 * Provides functions for logging user actions and system events to the audit_logs table.
 * This is critical for security, compliance, and troubleshooting.
 * 
 * Actions logged:
 * - login, logout, failed_login
 * - password_change, password_reset_requested, password_reset_completed
 * - user_created, user_updated, user_deactivated, user_activated
 * - session_expired
 */

import { supabaseClient } from '../config/supabase';

/**
 * Gets the client's IP address (approximate).
 * Note: This is a client-side approximation and should ideally be captured server-side.
 * For now, we use a placeholder or external service.
 * 
 * @returns {Promise<string>} The client's IP address or a placeholder.
 */
export const getClientIP = async () => {
  try {
    // In a real production environment, you would:
    // 1. Use a server-side API to capture the IP address
    // 2. Or use an external service like ipapi.co or ipify.org
    // For now, we'll return a placeholder
    
    // Example using ipify.org (commented out to avoid external API calls during development):
    // const response = await fetch('https://api.ipify.org?format=json');
    // const data = await response.json();
    // return data.ip;
    
    return 'CLIENT_IP_PLACEHOLDER';
  } catch (error) {
    console.error('Error fetching client IP:', error);
    return 'UNKNOWN_IP';
  }
};

/**
 * Gets the client's user agent string.
 * 
 * @returns {string} The user agent string.
 */
export const getUserAgent = () => {
  return navigator.userAgent || 'UNKNOWN_USER_AGENT';
};

/**
 * Logs an audit event to the audit_logs table.
 * 
 * @param {string} action - The action type (e.g., 'login', 'logout', 'password_change').
 * @param {string|null} userId - The UUID of the user (nullable for failed logins or system actions).
 * @param {string|null} usernameAttempted - The username involved in the action (even if user not found).
 * @param {string|null} ipAddress - The IP address from which the action originated.
 * @param {string|null} userAgent - The user agent string of the client.
 * @param {string} status - The outcome of the action ('success' or 'failure').
 * @param {Object} details - Additional context as a JSONB object (e.g., changed fields, error messages, expiration_reason).
 * @returns {Promise<boolean>} True if logging succeeded, false otherwise.
 */
export const logAuditEvent = async (
  action,
  userId = null,
  usernameAttempted = null,
  ipAddress = null,
  userAgent = null,
  status = 'success',
  details = {}
) => {
  try {
    // Validate action is a valid enum value
    const validActions = [
      'login',
      'logout',
      'password_change',
      'password_reset_requested',
      'password_reset_completed',
      'failed_login',
      'user_created',
      'user_updated',
      'user_deactivated',
      'user_activated',
      'session_expired'
    ];

    if (!validActions.includes(action)) {
      console.error(`Invalid audit action: ${action}`);
      return false;
    }

    // Validate status is a valid enum value
    const validStatuses = ['success', 'failure'];
    if (!validStatuses.includes(status)) {
      console.error(`Invalid audit status: ${status}`);
      return false;
    }

    // If ipAddress or userAgent not provided, use defaults
    const finalIpAddress = ipAddress || await getClientIP();
    const finalUserAgent = userAgent || getUserAgent();

    // Insert audit log entry
    const { error } = await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        username_attempted: usernameAttempted,
        action,
        ip_address: finalIpAddress,
        user_agent: finalUserAgent,
        status,
        details: details && Object.keys(details).length > 0 ? details : null,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Error inserting audit log:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error in logAuditEvent:', error);
    return false;
  }
};

/**
 * Logs a successful login event.
 * 
 * @param {string} userId - The UUID of the user.
 * @param {string} username - The username.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {boolean} rememberMe - Whether "Remember Me" was checked.
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logLogin = async (userId, username, ipAddress = null, userAgent = null, rememberMe = false) => {
  return await logAuditEvent(
    'login',
    userId,
    username,
    ipAddress,
    userAgent,
    'success',
    { remember_me: rememberMe }
  );
};

/**
 * Logs a failed login attempt.
 * 
 * @param {string|null} userId - The UUID of the user (null if user not found).
 * @param {string} usernameAttempted - The username that was attempted.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {string} reason - The reason for failure (e.g., 'user_not_found', 'incorrect_password', 'account_deactivated').
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logFailedLogin = async (userId, usernameAttempted, ipAddress = null, userAgent = null, reason = '') => {
  return await logAuditEvent(
    'failed_login',
    userId,
    usernameAttempted,
    ipAddress,
    userAgent,
    'failure',
    { reason }
  );
};

/**
 * Logs a logout event.
 * 
 * @param {string} userId - The UUID of the user.
 * @param {string} username - The username.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {string} reason - The reason for logout (e.g., 'user_initiated', 'session_expired').
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logLogout = async (userId, username, ipAddress = null, userAgent = null, reason = 'user_initiated') => {
  return await logAuditEvent(
    'logout',
    userId,
    username,
    ipAddress,
    userAgent,
    'success',
    { reason }
  );
};

/**
 * Logs a password change event.
 * 
 * @param {string} userId - The UUID of the user.
 * @param {string} username - The username.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {string} changedBy - Who changed the password ('self', 'owner_override').
 * @param {string|null} ownerUserId - The UUID of the owner if changed by owner.
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logPasswordChange = async (
  userId,
  username,
  ipAddress = null,
  userAgent = null,
  changedBy = 'self',
  ownerUserId = null
) => {
  return await logAuditEvent(
    'password_change',
    userId,
    username,
    ipAddress,
    userAgent,
    'success',
    { changed_by: changedBy, owner_user_id: ownerUserId }
  );
};

/**
 * Logs a password reset request event.
 * 
 * @param {string|null} userId - The UUID of the user (null if user not found).
 * @param {string} usernameAttempted - The username or email attempted.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {string} status - 'success' or 'failure'.
 * @param {string} reason - The reason (e.g., 'user_not_found', 'user_inactive', 'email_sent').
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logPasswordResetRequested = async (
  userId,
  usernameAttempted,
  ipAddress = null,
  userAgent = null,
  status = 'success',
  reason = ''
) => {
  return await logAuditEvent(
    'password_reset_requested',
    userId,
    usernameAttempted,
    ipAddress,
    userAgent,
    status,
    { reason }
  );
};

/**
 * Logs a password reset completion event.
 * 
 * @param {string} userId - The UUID of the user.
 * @param {string} username - The username.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {string} status - 'success' or 'failure'.
 * @param {Object} details - Additional details (e.g., token_used, sessions_invalidated).
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logPasswordResetCompleted = async (
  userId,
  username,
  ipAddress = null,
  userAgent = null,
  status = 'success',
  details = {}
) => {
  return await logAuditEvent(
    'password_reset_completed',
    userId,
    username,
    ipAddress,
    userAgent,
    status,
    details
  );
};

/**
 * Logs a session expiration event.
 * 
 * @param {string} userId - The UUID of the user.
 * @param {string} username - The username.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {string} expirationReason - The reason for expiration ('inactivity', 'timeout', 'manual').
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logSessionExpired = async (
  userId,
  username,
  ipAddress = null,
  userAgent = null,
  expirationReason = 'manual'
) => {
  return await logAuditEvent(
    'session_expired',
    userId,
    username,
    ipAddress,
    userAgent,
    'success',
    { expiration_reason: expirationReason }
  );
};

/**
 * Logs a user creation event.
 * 
 * @param {string} newUserId - The UUID of the newly created user.
 * @param {string} newUsername - The username of the new user.
 * @param {string} creatorUserId - The UUID of the user who created the account (owner).
 * @param {string} creatorUsername - The username of the creator.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {Object} details - Additional details (e.g., role, email).
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logUserCreated = async (
  newUserId,
  newUsername,
  creatorUserId,
  creatorUsername,
  ipAddress = null,
  userAgent = null,
  details = {}
) => {
  return await logAuditEvent(
    'user_created',
    creatorUserId,
    creatorUsername,
    ipAddress,
    userAgent,
    'success',
    { new_user_id: newUserId, new_username: newUsername, ...details }
  );
};

/**
 * Logs a user update event.
 * 
 * @param {string} targetUserId - The UUID of the user being updated.
 * @param {string} targetUsername - The username of the user being updated.
 * @param {string} updaterUserId - The UUID of the user performing the update (owner or self).
 * @param {string} updaterUsername - The username of the updater.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {Object} changedFields - An object showing what fields were changed.
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logUserUpdated = async (
  targetUserId,
  targetUsername,
  updaterUserId,
  updaterUsername,
  ipAddress = null,
  userAgent = null,
  changedFields = {}
) => {
  return await logAuditEvent(
    'user_updated',
    updaterUserId,
    updaterUsername,
    ipAddress,
    userAgent,
    'success',
    { target_user_id: targetUserId, target_username: targetUsername, changed_fields: changedFields }
  );
};

/**
 * Logs a user deactivation event.
 * 
 * @param {string} targetUserId - The UUID of the user being deactivated.
 * @param {string} targetUsername - The username of the user being deactivated.
 * @param {string} deactivatorUserId - The UUID of the owner performing the deactivation.
 * @param {string} deactivatorUsername - The username of the deactivator.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @param {string} reason - The reason for deactivation (optional).
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logUserDeactivated = async (
  targetUserId,
  targetUsername,
  deactivatorUserId,
  deactivatorUsername,
  ipAddress = null,
  userAgent = null,
  reason = ''
) => {
  return await logAuditEvent(
    'user_deactivated',
    deactivatorUserId,
    deactivatorUsername,
    ipAddress,
    userAgent,
    'success',
    { target_user_id: targetUserId, target_username: targetUsername, reason }
  );
};

/**
 * Logs a user activation event.
 * 
 * @param {string} targetUserId - The UUID of the user being activated.
 * @param {string} targetUsername - The username of the user being activated.
 * @param {string} activatorUserId - The UUID of the owner performing the activation.
 * @param {string} activatorUsername - The username of the activator.
 * @param {string|null} ipAddress - The IP address.
 * @param {string|null} userAgent - The user agent.
 * @returns {Promise<boolean>} True if logging succeeded.
 */
export const logUserActivated = async (
  targetUserId,
  targetUsername,
  activatorUserId,
  activatorUsername,
  ipAddress = null,
  userAgent = null
) => {
  return await logAuditEvent(
    'user_activated',
    activatorUserId,
    activatorUsername,
    ipAddress,
    userAgent,
    'success',
    { target_user_id: targetUserId, target_username: targetUsername }
  );
};

