/**
 * Change Password Form Component
 * 
 * Allows authenticated users (owner and cashier) to change their own password.
 * Requires current password verification before allowing a new password.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { validatePassword } from '../../utils/validation';
import { hashPassword, comparePassword, getPasswordStrength } from '../../utils/auth';
import { invalidateUserSessions } from '../../utils/session';
import { logPasswordChange } from '../../utils/auditLog';
import { X, Loader } from '../icons';

/**
 * ChangePasswordForm Component
 * 
 * @param {Object} props
 * @param {Function} props.onClose - Callback to close the form
 * @param {Function} props.onSuccess - Callback when password is successfully changed
 */
const ChangePasswordForm = ({ onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const [success, setSuccess] = useState(false);

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
      // Validate all fields are filled
      if (!currentPassword || !newPassword || !confirmPassword) {
        setError('All fields are required.');
        setLoading(false);
        return;
      }

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        setError(passwordValidation.errors.join(' '));
        setLoading(false);
        return;
      }

      // Check if passwords match
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match.');
        setLoading(false);
        return;
      }

      // Check if new password is different from current
      if (currentPassword === newPassword) {
        setError('New password must be different from current password.');
        setLoading(false);
        return;
      }

      // Fetch current user's password hash
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('password_hash')
        .eq('user_id', currentUser.user_id)
        .single();

      if (userError) {
        console.error('Error fetching user:', userError);
        setError('Failed to verify current password. Please try again.');
        setLoading(false);
        return;
      }

      // Verify current password is correct
      const currentPasswordMatch = await comparePassword(currentPassword, user.password_hash);

      if (!currentPasswordMatch) {
        setError('Current password is incorrect.');
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
        .eq('user_id', currentUser.user_id);

      if (updateError) {
        console.error('Error updating password:', updateError);
        setError('Failed to update password. Please try again.');
        setLoading(false);
        return;
      }

      // Get current session token (we want to keep this session active)
      const currentSessionToken = localStorage.getItem('sessionToken');

      // Invalidate all other sessions (except the current one)
      if (currentSessionToken) {
        await invalidateUserSessions(currentUser.user_id, currentSessionToken);
      } else {
        // If no current session token, invalidate all sessions
        await invalidateUserSessions(currentUser.user_id);
      }

      // Log password change (self-initiated)
      await logPasswordChange(
        currentUser.user_id,
        currentUser.username,
        null,
        null,
        'self',
        null
      );

      // Show success message
      setSuccess(true);

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (onClose) {
          onClose();
        }
      }, 2000);

    } catch (error) {
      console.error('Error changing password:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle close form
   */
  const handleClose = () => {
    if (success) {
      // If success, call onSuccess or onClose
      if (onSuccess) {
        onSuccess();
      } else if (onClose) {
        onClose();
      }
    } else {
      // Otherwise, just close
      if (onClose) {
        onClose();
      }
    }
  };

  // Password strength indicator color
  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 'strong': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'weak': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-green-700">Password Changed Successfully</h2>
            <button
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-800"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
              <p className="text-green-800 font-semibold mb-2">✓ Password Updated</p>
              <p className="text-gray-700 text-sm">
                Your password has been successfully changed. Your current session will remain active, but all other sessions have been logged out for security.
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p>• Your current session is still active</p>
              <p>• All other devices have been logged out</p>
              <p>• Keep your password secure and don't share it</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition"
          >
            Close
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
          <h2 className="text-xl font-bold text-blue-700">Change Password</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-600 mb-6 text-sm">
          Hi <strong>{currentUser?.first_name}</strong>, please enter your current password and choose a new one.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Current Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              disabled={loading}
            />
            {passwordStrength && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        passwordStrength === 'strong' ? 'bg-green-500 w-full' :
                        passwordStrength === 'medium' ? 'bg-yellow-500 w-2/3' :
                        'bg-red-500 w-1/3'
                      }`}
                    />
                  </div>
                  <p className={`text-xs font-semibold ${getStrengthColor()}`}>
                    {passwordStrength.toUpperCase()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Confirm New Password
            </label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Show passwords</span>
            </label>
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
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader />
                <span>Changing Password...</span>
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </form>

        <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-xs text-gray-700">
            <strong>Security Note:</strong> Changing your password will log out all other devices. Your current session will remain active.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordForm;

