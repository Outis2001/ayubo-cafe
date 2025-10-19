/**
 * Forgot Password Form Component
 * 
 * Allows users to request a password reset link via email.
 * Accepts either email address or username.
 * 
 * @component
 */

import { useState } from 'react';
import { supabaseClient } from '../../config/supabase';
import { validateEmail } from '../../utils/validation';
import { generateResetToken } from '../../utils/auth';
import { sendPasswordResetEmail } from '../../utils/email';
import { X, Loader } from '../icons';

/**
 * ForgotPasswordForm Component
 * 
 * @param {Object} props
 * @param {Function} props.onClose - Callback to close the form
 * @param {Function} props.onBackToLogin - Callback to return to login screen
 */
const ForgotPasswordForm = ({ onClose, onBackToLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  /**
   * Log audit event for password reset request
   */
  const logAuditEvent = async (userId, usernameAttempted, status, details = {}) => {
    try {
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: userId,
          username_attempted: usernameAttempted,
          action: 'password_reset',
          status,
          details: {
            ...details,
            reset_requested: true
          },
          ip_address: null,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);

    try {
      // Validate input is not empty
      if (!identifier || identifier.trim().length === 0) {
        setError('Please enter your email address or username');
        setLoading(false);
        return;
      }

      const trimmedIdentifier = identifier.trim();

      // Determine if input is email or username
      const emailValidation = validateEmail(trimmedIdentifier);
      const isEmail = emailValidation.isValid;

      // Query user by email or username
      let query = supabaseClient
        .from('users')
        .select('user_id, username, email, first_name, is_active');

      if (isEmail) {
        query = query.eq('email', trimmedIdentifier);
      } else {
        query = query.eq('username', trimmedIdentifier);
      }

      const { data: user, error: userError } = await query.single();

      // For security, always show success message even if user doesn't exist
      // This prevents username/email enumeration attacks
      if (userError || !user) {
        // Log failed attempt (user not found)
        await logAuditEvent(null, trimmedIdentifier, 'failure', {
          reason: 'user_not_found',
          identifier_type: isEmail ? 'email' : 'username'
        });

        // Show generic success message (don't reveal user doesn't exist)
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Check if user account is active
      if (!user.is_active) {
        // Log attempt for inactive account
        await logAuditEvent(user.user_id, user.username, 'failure', {
          reason: 'user_inactive',
          identifier_type: isEmail ? 'email' : 'username'
        });

        // Show generic success message (don't reveal account status)
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Generate password reset token
      const resetToken = generateResetToken();

      // Calculate expiration (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Insert reset token into database
      const { error: tokenError } = await supabaseClient
        .from('password_reset_tokens')
        .insert({
          user_id: user.user_id,
          reset_token: resetToken,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        });

      if (tokenError) {
        console.error('Error creating reset token:', tokenError);
        setError('Failed to process request. Please try again.');
        setLoading(false);
        return;
      }

      // Send password reset email
      const emailSent = await sendPasswordResetEmail(
        user.email,
        resetToken,
        user.first_name
      );
      
      // Log successful reset request
      await logAuditEvent(user.user_id, user.username, 'success', {
        identifier_type: isEmail ? 'email' : 'username',
        email_sent: emailSent,
        expires_at: expiresAt.toISOString()
      });

      // Show success message
      setSuccess(true);

    } catch (error) {
      console.error('Error handling forgot password:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle back to login
   */
  const handleBackToLogin = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else if (onClose) {
      onClose();
    }
  };

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-700">Check Your Email</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-600 hover:text-gray-800"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            )}
          </div>

          <div className="mb-6">
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-semibold mb-2">✓ Request Sent</p>
              <p className="text-gray-700 text-sm">
                If an account exists with that information, a password reset email has been sent.
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>• Check your email for a password reset link</p>
              <p>• The link will expire in 1 hour</p>
              <p>• If you don't receive an email, check your spam folder</p>
            </div>
          </div>

          <button
            onClick={handleBackToLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-700">Forgot Password</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          )}
        </div>

        <p className="text-gray-600 mb-6 text-sm">
          Enter your email address or username and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your email or username"
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader />
                <span>Sending...</span>
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleBackToLogin}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Login
          </button>
        </div>

        <div className="mt-6 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-xs text-gray-700">
            <strong>Note:</strong> For security reasons, we don't reveal whether an account exists. 
            If you don't receive an email, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;

