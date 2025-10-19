/**
 * Login Form Component
 * 
 * Main authentication interface for users to log in to the Ayubo Cafe system.
 * Includes rate limiting, "Remember Me" functionality, and error handling.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { checkLockoutStatus, resetFailedLoginAttempts, trackFailedLoginAttempt } from '../../utils/rateLimiter';
import { Loader } from '../icons';

/**
 * LoginForm Component
 * 
 * @param {Object} props
 * @param {Function} props.onForgotPassword - Callback to show forgot password form
 * @param {Function} props.onLoginSuccess - Callback when login is successful
 */
const LoginForm = ({ onForgotPassword, onLoginSuccess }) => {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [error, setError] = useState('');

  /**
   * Check lockout status on component mount and set up interval
   */
  useEffect(() => {
    const checkLockout = () => {
      const lockoutStatus = checkLockoutStatus();
      setIsLocked(lockoutStatus.isLocked);
      setLockoutTimeLeft(lockoutStatus.timeLeft);
    };

    checkLockout();

    // Check lockout status every second if locked
    const interval = setInterval(() => {
      if (isLocked) {
        checkLockout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked]);

  /**
   * Format time left for lockout display
   */
  const formatTimeLeft = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous errors
    setError('');

    // Check if locked out
    const lockoutStatus = checkLockoutStatus();
    if (lockoutStatus.isLocked) {
      setIsLocked(true);
      setLockoutTimeLeft(lockoutStatus.timeLeft);
      return;
    }

    // Validate inputs
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    // Attempt login
    const result = await login(username, password, rememberMe);

    if (result.success) {
      // Login successful - reset failed attempts
      resetFailedLoginAttempts();
      
      // Call success callback
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } else {
      // Login failed - show error
      setError(result.error || 'Login failed. Please try again.');
      
      // Track attempt
      const lockoutResult = trackFailedLoginAttempt();
      
      if (lockoutResult.isLocked) {
        setIsLocked(true);
        setLockoutTimeLeft(lockoutResult.timeLeft);
      }
    }
  };

  /**
   * Handle forgot password click
   */
  const handleForgotPassword = () => {
    if (onForgotPassword) {
      onForgotPassword();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700 mb-2">Ayubo Cafe</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Lockout Message */}
        {isLocked && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <p className="text-red-700 font-semibold mb-1">⚠️ Too Many Failed Attempts</p>
            <p className="text-red-600 text-sm">
              Your account has been temporarily locked due to multiple failed login attempts.
            </p>
            <p className="text-red-700 font-bold mt-2">
              Time remaining: {formatTimeLeft(lockoutTimeLeft)}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && !isLocked && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-base"
              disabled={loading || isLocked}
              autoFocus
              autoComplete="username"
            />
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-base"
                disabled={loading || isLocked}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                disabled={loading || isLocked}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={loading || isLocked}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-base sm:text-sm text-blue-600 hover:text-blue-800 font-semibold underline py-2"
              disabled={loading || isLocked}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || isLocked || !username || !password}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t-2 border-gray-200">
          <div className="text-center text-sm text-gray-600">
            <p>Default credentials:</p>
            <p className="font-mono text-xs mt-1">Username: <strong>owner</strong></p>
            <p className="font-mono text-xs">Password: <strong>Sokian@1997</strong></p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
          <p className="text-xs text-gray-700 text-center">
            <strong>Security:</strong> Maximum 5 login attempts per 15 minutes
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

