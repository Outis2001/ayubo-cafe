/**
 * Customer Signup Component
 * 
 * Multi-step signup form for customer registration via phone OTP.
 * Steps: 1) Phone number entry, 2) OTP verification, 3) Customer details
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { validatePhoneNumber, formatPhoneNumberForDisplay } from '../../utils/phoneValidation';
import { Loader } from '../icons';

/**
 * CustomerSignup Component
 * 
 * @param {Object} props
 * @param {Function} props.onSignupSuccess - Callback when signup is successful
 * @param {Function} props.onSwitchToLogin - Callback to switch to login form
 */
const CustomerSignup = ({ onSignupSuccess, onSwitchToLogin }) => {
  const {
    initiateOTP,
    resendOTPCode,
    verifyOTPAndLogin,
    checkCustomerExists,
    loading,
  } = useCustomerAuth();

  // Step tracking (1: phone, 2: OTP, 3: details)
  const [step, setStep] = useState(1);

  // Step 1: Phone number
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Step 2: OTP
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(null);

  // Step 3: Customer details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [detailsError, setDetailsError] = useState('');

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

    // Check if customer already exists
    setSubmitting(true);
    try {
      const existsResult = await checkCustomerExists(validation.formatted);
      
      if (existsResult.success && existsResult.customerExists) {
        setPhoneError('An account with this phone number already exists. Please log in instead.');
        setSubmitting(false);
        return;
      }

      // Request OTP
      const result = await initiateOTP(
        validation.formatted,
        import.meta.env.DEV // Test mode in development
      );

      if (result.success) {
        setOtpExpiry(result.expiresAt);
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
      const nextInput = document.getElementById(`otp-${index + 1}`);
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
      const prevInput = document.getElementById(`otp-${index - 1}`);
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
      const lastInput = document.getElementById('otp-5');
      if (lastInput) {
        lastInput.focus();
      }
      
      // Auto-submit
      handleOtpSubmit(pastedData);
    }
  };

  /**
   * Handle OTP verification
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
      // For signup, we'll verify OTP then move to details step
      // We don't have customer data yet, so we just verify the OTP
      // The actual account creation happens in step 3
      setStep(3);
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
        const firstInput = document.getElementById('otp-0');
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
   * Handle customer details submission (final step)
   */
  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setDetailsError('');

    // Validate required fields
    if (!firstName.trim() || !lastName.trim()) {
      setDetailsError('First name and last name are required');
      return;
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setDetailsError('Please enter a valid email address');
      return;
    }

    setSubmitting(true);

    try {
      const customerData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        birthday: birthday || null,
        defaultAddress: address.trim() || null,
      };

      // Verify OTP and create customer account
      const result = await verifyOTPAndLogin(
        otpCode.join(''),
        customerData,
        rememberMe
      );

      if (result.success) {
        if (onSignupSuccess) {
          onSignupSuccess(result.customer);
        }
      } else {
        setDetailsError(result.error || 'Signup failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during signup:', error);
      setDetailsError('An error occurred. Please try again.');
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
    } else if (step === 3) {
      setStep(2);
      setDetailsError('');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Create Account
        </h2>
        <p className="text-gray-600">
          {step === 1 && 'Enter your phone number to get started'}
          {step === 2 && 'Verify your phone number'}
          {step === 3 && 'Complete your profile'}
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-300'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            3
          </div>
        </div>
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
              Enter your Sri Lankan mobile number
            </p>
            {phoneError && (
              <p className="mt-2 text-sm text-red-600">{phoneError}</p>
            )}
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

          {onSwitchToLogin && (
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Log in
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
                  id={`otp-${index}`}
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

          <div className="text-center space-y-2">
            {resendCountdown > 0 ? (
              <p className="text-sm text-gray-600">
                Resend OTP in {resendCountdown}s
              </p>
            ) : resendCount >= 5 ? (
              <p className="text-sm text-red-600">
                Maximum resend limit reached. Please request a new OTP.
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
            <p className="text-xs text-gray-500">
              Resends remaining: {5 - resendCount}
            </p>
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

      {/* Step 3: Customer Details */}
      {step === 3 && (
        <form onSubmit={handleDetailsSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={submitting}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 mb-2">
              Birthday (Optional)
            </label>
            <input
              id="birthday"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Address (Optional)
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows="3"
              placeholder="Your delivery address"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={submitting}
            />
          </div>

          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              disabled={submitting}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              Keep me logged in (7 days)
            </label>
          </div>

          {detailsError && (
            <p className="text-sm text-red-600">{detailsError}</p>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Creating Account...
                </>
              ) : (
                'Complete Signup'
              )}
            </button>

            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CustomerSignup;

