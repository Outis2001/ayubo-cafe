/**
 * Reset Password Form Component
 * 
 * Allows users to reset their password using a token from the password reset email.
 * Validates the token and allows the user to set a new password.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../config/supabase';
import { validatePassword } from '../../utils/validation';
import { hashPassword, getPasswordStrength } from '../../utils/auth';
import { invalidateUserSessions } from '../../utils/session';
import { X, Loader } from '../icons';

/**
 * ResetPasswordForm Component
 * 
 * @param {Object} props
 * @param {string} props.token - The reset token from the URL
 * @param {Function} props.onClose - Callback to close the form
 * @param {Function} props.onSuccess - Callback when password is successfully reset
 */
const ResetPasswordForm = ({ token, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  /**
   * Log audit event for password reset
   */
  const logAuditEvent = async (userId, username, status, details = {}) => {
    try {
      await supabaseClient
        .from('audit_logs')
        .insert({
          user_id: userId,
          username_attempted: username,
          action: 'password_reset_completed',
          status,
          details: {
            ...details,
            reset_via: 'email_token'
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
   * Validate the reset token on component mount
   */
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError('No reset token provided.');
        setTokenValid(false);
        setValidatingToken(false);
        return;
      }

      try {
        // Query the password_reset_tokens table
        const { data: tokenData, error: tokenError } = await supabaseClient
          .from('password_reset_tokens')
          .select(`
            token_id,
            user_id,
            expires_at,
            used_at,
            users (user_id, username, email, first_name, is_active)
          `)
          .eq('reset_token', token)
          .single();

        if (tokenError && tokenError.code !== 'PGRST116') {
          console.error('Database error validating token:', tokenError);
          setTokenError('An error occurred. Please try again.');
          setTokenValid(false);
          setValidatingToken(false);
          return;
        }

        if (!tokenData) {
          setTokenError('Invalid reset link. Please request a new password reset.');
          setTokenValid(false);
          setValidatingToken(false);
          return;
        }

        // Check if token has already been used
        if (tokenData.used_at) {
          setTokenError('This reset link has already been used. Please request a new password reset.');
          setTokenValid(false);
          setValidatingToken(false);
          return;
        }

        // Check if token has expired
        const now = new Date();
        const expiresAt = new Date(tokenData.expires_at);
        if (now > expiresAt) {
          setTokenError('This reset link has expired. Please request a new password reset.');
          setTokenValid(false);
          setValidatingToken(false);
          return;
        }

        // Check if user account is active
        if (!tokenData.users || !tokenData.users.is_active) {
          setTokenError('Your account has been deactivated. Please contact support.');
          setTokenValid(false);
          setValidatingToken(false);
          return;
        }

        // Token is valid
        setUserInfo(tokenData.users);
        setTokenValid(true);
        setValidatingToken(false);

      } catch (error) {
        console.error('Error validating reset token:', error);
        setTokenError('An unexpected error occurred. Please try again.');
        setTokenValid(false);
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  /**
   * Update password strength indicator as user types
   */
  useEffect(() => {
    if (newPassword) {
      const strength = getPasswordStrength(newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength('');
    }
  }, [newPassword]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError('');
    setLoading(true);

    try {
      // Validate new password
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors.join(' '));
        setLoading(false);
        return;
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      // Hash the new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update the user's password in the database
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userInfo.user_id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        setError('Failed to update password. Please try again.');
        setLoading(false);
        return;
      }

      // Mark the reset token as used
      const { error: tokenUpdateError } = await supabaseClient
        .from('password_reset_tokens')
        .update({
          used_at: new Date().toISOString()
        })
        .eq('reset_token', token);

      if (tokenUpdateError) {
        console.error('Error marking token as used:', tokenUpdateError);
        // Don't show error to user, password was already updated
      }

      // Invalidate all user sessions (force re-login)
      try {
        await invalidateUserSessions(userInfo.user_id);
      } catch (sessionError) {
        console.error('Error invalidating sessions:', sessionError);
        // Don't show error to user, password was already updated
      }

      // Log successful password reset
      await logAuditEvent(
        userInfo.user_id,
        userInfo.username,
        'success',
        {
          token_used: true,
          sessions_invalidated: true
        }
      );

      // Show success message
      setSuccess(true);

    } catch (error) {
      console.error('Error resetting password:', error);
      setError('An unexpected error occurred. Please try again.');
      
      // Log failed password reset
      await logAuditEvent(
        userInfo?.user_id,
        userInfo?.username,
        'failure',
        {
          reason: 'unexpected_error',
          error: error.message
        }
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle navigating to request new reset
   */
  const handleRequestNewReset = () => {
    if (onClose) {
      onClose();
    }
    // Navigate to forgot password form
    window.location.href = '/forgot-password';
  };

  /**
   * Handle navigating to login
   */
  const handleGoToLogin = () => {
    if (onSuccess) {
      onSuccess();
    } else if (onClose) {
      onClose();
    }
    window.location.href = '/';
  };

  // Token validation loading state
  if (validatingToken) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader size={48} />
            <p className="mt-4 text-gray-600">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Token invalid state
  if (!tokenValid) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-red-700">Invalid Reset Link</h2>
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
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
              <p className="text-red-800 font-semibold mb-2">✗ {tokenError}</p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Possible reasons:</strong></p>
              <ul className="list-disc list-inside ml-2">
                <li>The link has expired (links are valid for 1 hour)</li>
                <li>The link has already been used</li>
                <li>The link is invalid or incomplete</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleRequestNewReset}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition mb-3"
          >
            Request New Reset Link
          </button>

          <button
            onClick={handleGoToLogin}
            className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-bold hover:bg-blue-50 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-green-700">Password Reset Successful</h2>
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
              <p className="text-green-800 font-semibold mb-2">✓ Password Updated</p>
              <p className="text-gray-700 text-sm">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>• All your active sessions have been logged out</p>
              <p>• Please log in again with your new password</p>
              <p>• Keep your password secure and don't share it</p>
            </div>
          </div>

          <button
            onClick={handleGoToLogin}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Password strength indicator color
  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'strong': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'weak': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Form state
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-blue-700">Reset Password</h2>
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
          Hi <strong>{userInfo?.first_name}</strong>, please enter your new password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-base"
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 text-sm"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {passwordStrength && (
              <p className={`text-xs mt-1 ${getStrengthColor()}`}>
                Strength: <strong>{passwordStrength.toUpperCase()}</strong>
              </p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              disabled={loading}
            />
          </div>

          <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
            <p className="text-xs text-gray-700">
              <strong>Password requirements:</strong>
            </p>
            <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
              <li>• At least 8 characters long</li>
              <li>• At least one uppercase letter</li>
              <li>• At least one lowercase letter</li>
              <li>• At least one number</li>
              <li>• At least one special character (!@#$%^&*)</li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader />
                <span>Resetting...</span>
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleGoToLogin}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;

