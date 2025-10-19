/**
 * Email Verification Form Component
 * 
 * Handles email verification when users click the verification link from their email.
 * Validates the token, marks email as verified, and redirects to login.
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../config/supabase';
import { Loader } from '../icons';

/**
 * VerifyEmailForm Component
 * 
 * @param {Object} props
 * @param {string} props.token - Verification token from URL parameter
 * @param {Function} props.onVerificationComplete - Callback when verification is complete
 */
const VerifyEmailForm = ({ token, onVerificationComplete }) => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  /**
   * Verify the email token on component mount
   */
  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setLoading(false);
      setError('No verification token provided.');
    }
  }, [token]);

  /**
   * Verify email with the provided token
   */
  const verifyEmail = async (verificationToken) => {
    try {
      setLoading(true);
      setError('');

      // Query the verification token from database
      const { data: tokenData, error: tokenError } = await supabaseClient
        .from('email_verification_tokens')
        .select('token_id, user_id, expires_at, used_at')
        .eq('verification_token', verificationToken)
        .single();

      if (tokenError || !tokenData) {
        setError('Invalid verification link. The token may have been deleted or never existed.');
        setLoading(false);
        return;
      }

      // Check if token has already been used
      if (tokenData.used_at) {
        setError('This verification link has already been used. Your email may already be verified.');
        setLoading(false);
        return;
      }

      // Check if token has expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);

      if (now > expiresAt) {
        setError('This verification link has expired. Please request a new verification email from the login page.');
        setLoading(false);
        return;
      }

      // Token is valid - get user details
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('user_id, first_name, last_name, email, email_verified')
        .eq('user_id', tokenData.user_id)
        .single();

      if (userError || !user) {
        setError('User account not found. Please contact support.');
        setLoading(false);
        return;
      }

      // Check if email is already verified
      if (user.email_verified) {
        setUserName(user.first_name);
        setSuccess(true);
        setError('Your email is already verified. You can now log in.');
        setLoading(false);
        return;
      }

      // Update user's email_verified status
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ email_verified: true })
        .eq('user_id', user.user_id);

      if (updateError) {
        console.error('Error updating email_verified:', updateError);
        setError('Failed to verify email. Please try again or contact support.');
        setLoading(false);
        return;
      }

      // Mark token as used
      const { error: markUsedError } = await supabaseClient
        .from('email_verification_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token_id', tokenData.token_id);

      if (markUsedError) {
        console.error('Error marking token as used:', markUsedError);
        // Don't fail the verification if marking as used fails
        // The email is already verified
      }

      // Success!
      setUserName(user.first_name);
      setSuccess(true);
      setLoading(false);

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      }, 3000);

    } catch (error) {
      console.error('Unexpected error verifying email:', error);
      setError('An unexpected error occurred. Please try again or contact support.');
      setLoading(false);
    }
  };

  /**
   * Handle manual redirect to login
   */
  const handleGoToLogin = () => {
    if (onVerificationComplete) {
      onVerificationComplete();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-700 mb-2">Ayubo Cafe</h1>
          <p className="text-gray-600">Email Verification</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <Loader size={48} className="mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600 text-lg">Verifying your email...</p>
            <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
          </div>
        )}

        {/* Success State */}
        {!loading && success && (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-green-700 mb-2">Email Verified!</h2>
              <p className="text-gray-700 mb-1">
                {userName ? `Welcome, ${userName}!` : 'Welcome!'}
              </p>
              <p className="text-gray-600 text-sm">
                Your email has been successfully verified.
              </p>
            </div>

            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                ✓ You can now log in to your account
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Redirecting to login in 3 seconds...
              </p>
            </div>

            <button
              onClick={handleGoToLogin}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Error State */}
        {!loading && !success && error && (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">❌</span>
              </div>
              <h2 className="text-2xl font-bold text-red-700 mb-2">Verification Failed</h2>
            </div>

            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoToLogin}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Go to Login
              </button>
              
              <p className="text-gray-600 text-sm">
                Need help? Try logging in and using the "Resend Verification Email" option.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailForm;

