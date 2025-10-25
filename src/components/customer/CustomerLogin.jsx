/**
 * Customer Login Component
 * 
 * Login form for returning customers via phone OTP.
 * Steps: 1) Phone number entry, 2) OTP verification
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { validatePhoneNumber, formatPhoneNumberForDisplay } from '../../utils/phoneValidation';
import { Loader } from '../icons';

/**
 * CustomerLogin Component
 * 
 * @param {Object} props
 * @param {Function} props.onLoginSuccess - Callback when login is successful
 * @param {Function} props.onSwitchToSignup - Callback to switch to signup form
 */
const CustomerLogin = ({ onLoginSuccess, onSwitchToSignup }) => {
  const {
    initiateOTP,
    resendOTPCode,
    verifyOTPAndLogin,
    checkCustomerExists,
    loading,
  } = useCustomerAuth();

  // Step tracking (1: phone, 2: OTP)
  const [step, setStep] = useState(1);

  // Step 1: Phone number
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Step 2: OTP
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);

  // Loading states
  const [submitting, setSubmitting] = useState(false);

  /**
   * Countdown timer for OTP resend
   */
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  /**
   * Format phone number as user types
   */
  const handlePhoneChange = (value) => {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '');
    
    // Auto-add +94 if user starts typing a number
    if (cleaned.length > 0 && !cleaned.startsWith('+')) {
      if (cleaned.startsWith('94')) {
        cleaned = '+' + cleaned;
      } else if (cleaned.startsWith('0')) {
        cleaned = '+94' + cleaned.substring(1);
      } else if (cleaned.length <= 9) {
        cleaned = '+94' + cleaned;
      }
    }
    
    setPhoneNumber(cleaned);
    setPhoneError('');
  };

  /**
   * Handle phone number submission
   */
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setPhoneError('');

    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setPhoneError(validation.message);
      return;
    }

    // Check if customer exists
    setSubmitting(true);
    try {
      const existsResult = await checkCustomerExists(validation.formatted);
      
      if (existsResult.success && !existsResult.customerExists) {
        setPhoneError('No account found with this phone number. Please sign up first.');
        setSubmitting(false);
        return;
      }

      // Request OTP
      const result = await initiateOTP(
        validation.formatted,
        import.meta.env.DEV // Test mode in development
      );

      if (result.success) {
        setStep(2);
        setResendCountdown(60); // 60 seconds before allowing resend
        
        // In dev mode, show OTP in console
        if (result.otpCode) {
          console.log('🔐 DEV MODE - OTP Code:', result.otpCode);
        }
      } else {
        setPhoneError(result.error || 'Failed to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error requesting OTP:', error);
      setPhoneError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle OTP input change
   */
  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otpCode];
    newOtp[index] = value;
    setOtpCode(newOtp);
    setOtpError('');

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-login-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value && newOtp.every(digit => digit !== '')) {
      handleOtpSubmit(newOtp.join(''));
    }
  };

  /**
   * Handle OTP input keydown (backspace navigation)
   */
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-login-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  /**
   * Handle OTP paste
   */
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Check if pasted data is 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtpCode(newOtp);
      setOtpError('');
      
      // Focus last input
      const lastInput = document.getElementById('otp-login-5');
      if (lastInput) {
        lastInput.focus();
      }
      
      // Auto-submit
      handleOtpSubmit(pastedData);
    }
  };

  /**
   * Handle OTP verification and login
   */
  const handleOtpSubmit = async (code = null) => {
    const otpString = code || otpCode.join('');
    
    if (otpString.length !== 6) {
      setOtpError('Please enter all 6 digits');
      return;
    }

    setSubmitting(true);
    setOtpError('');

    try {
      // Verify OTP and login (no customer data needed for login)
      const result = await verifyOTPAndLogin(
        otpString,
        null, // No customer data for login
        rememberMe
      );

      if (result.success) {
        if (onLoginSuccess) {
          onLoginSuccess(result.customer);
        }
      } else {
        setOtpError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setOtpError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle OTP resend
   */
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || resendCount >= 5) {
      return;
    }

    setSubmitting(true);
    setOtpError('');

    try {
      const result = await resendOTPCode(import.meta.env.DEV);

      if (result.success) {
        setResendCount(resendCount + 1);
        setResendCountdown(60);
        setOtpCode(['', '', '', '', '', '']);
        
        // Focus first input
        const firstInput = document.getElementById('otp-login-0');
        if (firstInput) {
          firstInput.focus();
        }
        
        // In dev mode, show OTP
        if (result.otpCode) {
          console.log('🔐 DEV MODE - Resent OTP Code:', result.otpCode);
        }
      } else {
        setOtpError(result.error || 'Failed to resend OTP.');
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      setOtpError('Failed to resend OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle back button
   */
  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setOtpCode(['', '', '', '', '', '']);
      setOtpError('');
      setResendCount(0);
      setResendCountdown(0);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome Back
        </h2>
        <p className="text-gray-600">
          {step === 1 ? 'Enter your phone number to log in' : 'Verify your phone number'}
        </p>
      </div>

      {/* Step 1: Phone Number */}
      {step === 1 && (
        <form onSubmit={handlePhoneSubmit} className="space-y-6">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting || loading}
              required
            />
            <p className="mt-2 text-sm text-gray-500">
              Enter the phone number you signed up with
            </p>
            {phoneError && (
              <p className="mt-2 text-sm text-red-600">{phoneError}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              disabled={submitting || loading}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              Keep me logged in (7 days)
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {submitting || loading ? (
              <>
                <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                Sending OTP...
              </>
            ) : (
              'Send OTP'
            )}
          </button>

          {onSwitchToSignup && (
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Sign up
              </button>
            </p>
          )}
        </form>
      )}

      {/* Step 2: OTP Verification */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-700 mb-2">
              We sent a 6-digit code to
            </p>
            <p className="font-semibold text-gray-900 mb-4">
              {formatPhoneNumberForDisplay(phoneNumber)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Enter OTP Code
            </label>
            <div className="flex gap-2 justify-center">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-login-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  className="w-12 h-14 text-center text-xl font-semibold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={submitting}
                />
              ))}
            </div>
            {otpError && (
              <p className="mt-3 text-sm text-red-600 text-center">{otpError}</p>
            )}
          </div>

          <div className="flex items-center justify-center">
            <input
              id="rememberMeOtp"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              disabled={submitting}
            />
            <label htmlFor="rememberMeOtp" className="ml-2 block text-sm text-gray-700">
              Keep me logged in (7 days)
            </label>
          </div>

          <div className="text-center space-y-2">
            {resendCountdown > 0 ? (
              <p className="text-sm text-gray-600">
                Resend OTP in {resendCountdown}s
              </p>
            ) : resendCount >= 5 ? (
              <p className="text-sm text-red-600">
                Maximum resend limit reached. Please start over.
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={submitting}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
              >
                Didn't receive code? Resend OTP
              </button>
            )}
            {resendCount > 0 && resendCount < 5 && (
              <p className="text-xs text-gray-500">
                Resends remaining: {5 - resendCount}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerLogin;

