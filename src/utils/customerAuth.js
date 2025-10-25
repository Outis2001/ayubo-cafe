/**
 * Customer Authentication Utilities
 * 
 * Handles customer authentication using phone number + OTP verification.
 * Completely separate from staff authentication system.
 * 
 * @module utils/customerAuth
 */

import bcrypt from 'bcryptjs';
import { supabaseClient } from '../config/supabase.js';
import { validatePhoneNumber, formatPhoneNumber } from './phoneValidation.js';
import { logAuditEvent } from './auditLog.js';
import { sendOTPSMS } from './sms.js';

// Constants
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10; // OTP expires after 10 minutes
const OTP_MAX_ATTEMPTS = 5; // Max verification attempts per OTP
const OTP_MAX_RESENDS = 5; // Max OTP resends per session
const OTP_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const OTP_RATE_LIMIT_MAX = 3; // Max 3 OTP requests per phone per hour
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Storage key for OTP rate limiting
 */
const OTP_RATE_LIMIT_KEY = 'ayubo_cafe_otp_rate_limit';

/**
 * Generate a 6-digit OTP code
 * 
 * @returns {string} 6-digit OTP code
 * 
 * @example
 * const otp = generateOTPCode();
 * // Returns: "123456"
 */
const generateOTPCode = () => {
  // Generate cryptographically secure random 6-digit number
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  
  // Get 6-digit number (000000 - 999999)
  const otp = (array[0] % 1000000).toString().padStart(6, '0');
  
  return otp;
};

/**
 * Hash OTP code using bcrypt
 * 
 * @param {string} otp - Plain text OTP code
 * @returns {Promise<string>} Hashed OTP code
 */
const hashOTP = async (otp) => {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const hash = await bcrypt.hash(otp, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing OTP:', error);
    throw new Error('Failed to hash OTP');
  }
};

/**
 * Verify OTP code against hash
 * 
 * @param {string} otp - Plain text OTP code to verify
 * @param {string} hash - Stored OTP hash
 * @returns {Promise<boolean>} True if OTP matches hash
 */
const verifyOTPHash = async (otp, hash) => {
  try {
    const isMatch = await bcrypt.compare(otp, hash);
    return isMatch;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
};

/**
 * Check OTP rate limit for a phone number
 * 
 * Enforces max 3 OTP requests per phone per hour (client-side)
 * 
 * @param {string} phoneNumber - Phone number to check
 * @returns {Object} Rate limit status
 */
const checkOTPRateLimit = (phoneNumber) => {
  try {
    const data = localStorage.getItem(OTP_RATE_LIMIT_KEY);
    const rateLimits = data ? JSON.parse(data) : {};
    
    const now = Date.now();
    const phoneKey = formatPhoneNumber(phoneNumber);
    
    if (!phoneKey) {
      return { allowed: false, message: 'Invalid phone number' };
    }
    
    // Get or initialize rate limit data for this phone
    if (!rateLimits[phoneKey]) {
      rateLimits[phoneKey] = {
        requests: [],
      };
    }
    
    const phoneData = rateLimits[phoneKey];
    
    // Clean up old requests (older than 1 hour)
    phoneData.requests = phoneData.requests.filter(
      timestamp => now - timestamp < OTP_RATE_LIMIT_WINDOW
    );
    
    // Check if limit exceeded
    if (phoneData.requests.length >= OTP_RATE_LIMIT_MAX) {
      const oldestRequest = Math.min(...phoneData.requests);
      const minutesRemaining = Math.ceil(
        (oldestRequest + OTP_RATE_LIMIT_WINDOW - now) / (60 * 1000)
      );
      
      return {
        allowed: false,
        message: `Too many OTP requests. Please try again in ${minutesRemaining} minutes.`,
        minutesRemaining,
      };
    }
    
    // Allow request and record it
    phoneData.requests.push(now);
    localStorage.setItem(OTP_RATE_LIMIT_KEY, JSON.stringify(rateLimits));
    
    return {
      allowed: true,
      remaining: OTP_RATE_LIMIT_MAX - phoneData.requests.length,
    };
  } catch (error) {
    console.error('Error checking OTP rate limit:', error);
    // Allow on error (fail open for better UX)
    return { allowed: true };
  }
};

/**
 * Reset OTP rate limit for a phone number
 * Called after successful verification
 * 
 * @param {string} phoneNumber - Phone number
 */
const resetOTPRateLimit = (phoneNumber) => {
  try {
    const data = localStorage.getItem(OTP_RATE_LIMIT_KEY);
    const rateLimits = data ? JSON.parse(data) : {};
    const phoneKey = formatPhoneNumber(phoneNumber);
    
    if (phoneKey && rateLimits[phoneKey]) {
      delete rateLimits[phoneKey];
      localStorage.setItem(OTP_RATE_LIMIT_KEY, JSON.stringify(rateLimits));
    }
  } catch (error) {
    console.error('Error resetting OTP rate limit:', error);
  }
};

/**
 * Get client metadata (IP address simulation, user agent)
 * 
 * @returns {Object} Client metadata
 */
const getClientMetadata = () => {
  return {
    user_agent: navigator.userAgent || null,
    // Note: Real IP address requires server-side detection
    // This is a placeholder for client-side tracking
    ip_address: null,
  };
};

/**
 * Request OTP for phone number
 * Generates OTP, stores in database, and returns OTP ID
 * 
 * @param {string} phoneNumber - Phone number to send OTP to
 * @param {boolean} testMode - If true, return OTP in response (for development)
 * @returns {Promise<Object>} Result with otpId and success status
 * 
 * @example
 * const result = await requestOTP('+94771234567');
 * if (result.success) {
 *   console.log('OTP sent! ID:', result.otpId);
 * }
 */
export const requestOTP = async (phoneNumber, testMode = false) => {
  try {
    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.message,
      };
    }
    
    const formattedPhone = validation.formatted;
    
    // Check rate limit
    const rateLimit = checkOTPRateLimit(formattedPhone);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: rateLimit.message,
        rateLimited: true,
      };
    }
    
    // Invalidate any existing active OTP for this phone
    await supabaseClient
      .from('customer_otp_verifications')
      .update({ verified: false })
      .eq('phone_number', formattedPhone)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString());
    
    // Generate OTP
    const otpCode = generateOTPCode();
    const otpHash = await hashOTP(otpCode);
    
    // Calculate expiry time
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Get client metadata
    const metadata = getClientMetadata();
    
    // Store OTP in database
    const { data: otpRecord, error: insertError } = await supabaseClient
      .from('customer_otp_verifications')
      .insert({
        phone_number: formattedPhone,
        otp_code_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
        resend_count: 0,
        ip_address: metadata.ip_address,
        user_agent: metadata.user_agent,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error storing OTP:', insertError);
      return {
        success: false,
        error: 'Failed to generate OTP. Please try again.',
      };
    }
    
    // Send OTP via SMS
    try {
      await sendOTPSMS(formattedPhone, otpCode, OTP_EXPIRY_MINUTES);
      console.log(`[OTP] Sent to ${formattedPhone} (expires in ${OTP_EXPIRY_MINUTES} min)`);
    } catch (smsError) {
      console.error('[OTP] Failed to send SMS:', smsError);
      // Continue anyway - OTP is stored in database
      // In test mode, SMS is logged to console
    }
    
    // Audit log
    await logAuditEvent({
      action: 'customer_otp_requested',
      target_type: 'customer_otp',
      target_id: otpRecord.otp_id,
      details: {
        phone_number: formattedPhone,
        expires_at: expiresAt.toISOString(),
      },
    });
    
    const response = {
      success: true,
      otpId: otpRecord.otp_id,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: OTP_EXPIRY_MINUTES,
      message: `OTP sent to ${formattedPhone}`,
    };
    
    // In test mode, include the OTP (for development only)
    if (testMode) {
      response.otpCode = otpCode; // Only for testing!
    }
    
    return response;
  } catch (error) {
    console.error('Error requesting OTP:', error);
    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
};

/**
 * Resend OTP for existing verification session
 * 
 * @param {string} otpId - Original OTP ID
 * @param {string} phoneNumber - Phone number
 * @param {boolean} testMode - If true, return OTP in response
 * @returns {Promise<Object>} Result with new OTP ID
 */
export const resendOTP = async (otpId, phoneNumber, testMode = false) => {
  try {
    // Get existing OTP record
    const { data: existingOTP, error: fetchError } = await supabaseClient
      .from('customer_otp_verifications')
      .select('*')
      .eq('otp_id', otpId)
      .single();
    
    if (fetchError || !existingOTP) {
      return {
        success: false,
        error: 'Invalid OTP session. Please request a new OTP.',
      };
    }
    
    // Check resend limit
    if (existingOTP.resend_count >= OTP_MAX_RESENDS) {
      return {
        success: false,
        error: `Maximum resend limit (${OTP_MAX_RESENDS}) reached. Please request a new OTP.`,
        maxResendsReached: true,
      };
    }
    
    // Check rate limit
    const rateLimit = checkOTPRateLimit(phoneNumber);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: rateLimit.message,
        rateLimited: true,
      };
    }
    
    // Generate new OTP
    const otpCode = generateOTPCode();
    const otpHash = await hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Update OTP record
    const { data: updatedOTP, error: updateError } = await supabaseClient
      .from('customer_otp_verifications')
      .update({
        otp_code_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        resend_count: existingOTP.resend_count + 1,
        attempts: 0, // Reset attempts on resend
      })
      .eq('otp_id', otpId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error resending OTP:', updateError);
      return {
        success: false,
        error: 'Failed to resend OTP. Please try again.',
      };
    }
    
    // Send OTP via SMS
    try {
      await sendOTPSMS(phoneNumber, otpCode, OTP_EXPIRY_MINUTES);
      console.log(`[OTP] Resent to ${phoneNumber} (attempt ${updatedOTP.resend_count})`);
    } catch (smsError) {
      console.error('[OTP] Failed to send SMS:', smsError);
      // Continue anyway - OTP is stored in database
    }
    
    // Audit log
    await logAuditEvent({
      action: 'customer_otp_resent',
      target_type: 'customer_otp',
      target_id: otpId,
      details: {
        phone_number: phoneNumber,
        resend_count: updatedOTP.resend_count,
      },
    });
    
    const response = {
      success: true,
      otpId: updatedOTP.otp_id,
      expiresAt: expiresAt.toISOString(),
      expiresInMinutes: OTP_EXPIRY_MINUTES,
      resendsRemaining: OTP_MAX_RESENDS - updatedOTP.resend_count,
      message: 'OTP resent successfully',
    };
    
    if (testMode) {
      response.otpCode = otpCode;
    }
    
    return response;
  } catch (error) {
    console.error('Error resending OTP:', error);
    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
};

/**
 * Verify OTP code
 * 
 * @param {string} otpId - OTP verification ID
 * @param {string} otpCode - OTP code entered by user
 * @param {string} phoneNumber - Phone number (for validation)
 * @returns {Promise<Object>} Verification result
 * 
 * @example
 * const result = await verifyOTP(otpId, '123456', '+94771234567');
 * if (result.success) {
 *   console.log('OTP verified!');
 * }
 */
export const verifyOTP = async (otpId, otpCode, phoneNumber) => {
  try {
    // Validate inputs
    if (!otpId || !otpCode || !phoneNumber) {
      return {
        success: false,
        error: 'Missing required fields',
      };
    }
    
    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      return {
        success: false,
        error: 'OTP must be 6 digits',
      };
    }
    
    // Get OTP record
    const { data: otpRecord, error: fetchError } = await supabaseClient
      .from('customer_otp_verifications')
      .select('*')
      .eq('otp_id', otpId)
      .single();
    
    if (fetchError || !otpRecord) {
      return {
        success: false,
        error: 'Invalid OTP session',
      };
    }
    
    // Check if already verified
    if (otpRecord.verified) {
      return {
        success: false,
        error: 'OTP already used',
      };
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);
    if (now > expiresAt) {
      return {
        success: false,
        error: 'OTP has expired. Please request a new one.',
        expired: true,
      };
    }
    
    // Check attempts limit
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      return {
        success: false,
        error: `Maximum verification attempts (${OTP_MAX_ATTEMPTS}) exceeded. Please request a new OTP.`,
        maxAttemptsReached: true,
      };
    }
    
    // Check phone number matches
    if (otpRecord.phone_number !== formatPhoneNumber(phoneNumber)) {
      return {
        success: false,
        error: 'Phone number mismatch',
      };
    }
    
    // Verify OTP code
    const isValid = await verifyOTPHash(otpCode, otpRecord.otp_code_hash);
    
    if (!isValid) {
      // Increment failed attempts
      await supabaseClient
        .from('customer_otp_verifications')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('otp_id', otpId);
      
      const attemptsRemaining = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
      
      // Audit log failed attempt
      await logAuditEvent({
        action: 'customer_otp_verification_failed',
        target_type: 'customer_otp',
        target_id: otpId,
        details: {
          phone_number: phoneNumber,
          attempts: otpRecord.attempts + 1,
        },
      });
      
      return {
        success: false,
        error: `Invalid OTP code. ${attemptsRemaining} attempts remaining.`,
        attemptsRemaining,
      };
    }
    
    // OTP is valid - mark as verified
    const { error: updateError } = await supabaseClient
      .from('customer_otp_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('otp_id', otpId);
    
    if (updateError) {
      console.error('Error updating OTP verification:', updateError);
      return {
        success: false,
        error: 'Verification failed. Please try again.',
      };
    }
    
    // Reset rate limit on successful verification
    resetOTPRateLimit(phoneNumber);
    
    // Audit log successful verification
    await logAuditEvent({
      action: 'customer_otp_verified',
      target_type: 'customer_otp',
      target_id: otpId,
      details: {
        phone_number: phoneNumber,
      },
    });
    
    return {
      success: true,
      message: 'OTP verified successfully',
      phoneNumber: otpRecord.phone_number,
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return {
      success: false,
      error: 'An error occurred during verification. Please try again.',
    };
  }
};

/**
 * Create a new customer account
 * Called after successful OTP verification
 * 
 * @param {Object} customerData - Customer information
 * @param {string} customerData.phoneNumber - Verified phone number
 * @param {string} customerData.firstName - First name
 * @param {string} customerData.lastName - Last name
 * @param {string} [customerData.email] - Email (optional)
 * @param {string} [customerData.birthday] - Birthday (YYYY-MM-DD, optional)
 * @param {string} [customerData.defaultAddress] - Default address (optional)
 * @returns {Promise<Object>} Created customer record
 * 
 * @example
 * const result = await createCustomer({
 *   phoneNumber: '+94771234567',
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   email: 'john@example.com'
 * });
 */
export const createCustomer = async (customerData) => {
  try {
    const {
      phoneNumber,
      firstName,
      lastName,
      email = null,
      birthday = null,
      defaultAddress = null,
    } = customerData;
    
    // Validate required fields
    if (!phoneNumber || !firstName || !lastName) {
      return {
        success: false,
        error: 'Phone number, first name, and last name are required',
      };
    }
    
    // Validate phone number
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.isValid) {
      return {
        success: false,
        error: phoneValidation.message,
      };
    }
    
    const formattedPhone = phoneValidation.formatted;
    
    // Check if customer already exists
    const { data: existingCustomer } = await supabaseClient
      .from('customers')
      .select('customer_id, is_active')
      .eq('phone_number', formattedPhone)
      .single();
    
    if (existingCustomer) {
      if (!existingCustomer.is_active) {
        // Reactivate inactive customer
        const { data: reactivated, error: updateError } = await supabaseClient
          .from('customers')
          .update({
            is_active: true,
            first_name: firstName,
            last_name: lastName,
            email: email,
            birthday: birthday,
            default_address: defaultAddress,
            phone_verified: true,
          })
          .eq('customer_id', existingCustomer.customer_id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error reactivating customer:', updateError);
          return {
            success: false,
            error: 'Failed to reactivate account. Please contact support.',
          };
        }
        
        await logAuditEvent({
          action: 'customer_reactivated',
          target_type: 'customer',
          target_id: reactivated.customer_id,
          details: { phone_number: formattedPhone },
        });
        
        return {
          success: true,
          customer: reactivated,
          message: 'Account reactivated successfully',
        };
      }
      
      return {
        success: false,
        error: 'An account with this phone number already exists',
        existingCustomer: true,
      };
    }
    
    // Create new customer
    const { data: newCustomer, error: insertError } = await supabaseClient
      .from('customers')
      .insert({
        phone_number: formattedPhone,
        phone_verified: true,
        first_name: firstName,
        last_name: lastName,
        email: email,
        birthday: birthday,
        default_address: defaultAddress,
        is_active: true,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating customer:', insertError);
      return {
        success: false,
        error: 'Failed to create account. Please try again.',
      };
    }
    
    // Audit log
    await logAuditEvent({
      action: 'customer_created',
      target_type: 'customer',
      target_id: newCustomer.customer_id,
      details: {
        phone_number: formattedPhone,
        email: email,
      },
    });
    
    return {
      success: true,
      customer: newCustomer,
      message: 'Account created successfully',
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
};

/**
 * Customer login (returns existing customer or initiates OTP)
 * For returning customers, we can fetch their profile after OTP verification
 * 
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Object>} Login status
 */
export const customerLogin = async (phoneNumber) => {
  try {
    // Validate phone number
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.message,
      };
    }
    
    const formattedPhone = validation.formatted;
    
    // Check if customer exists
    const { data: customer, error: fetchError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('is_active', true)
      .single();
    
    if (fetchError || !customer) {
      return {
        success: false,
        error: 'No account found with this phone number. Please sign up first.',
        customerNotFound: true,
      };
    }
    
    // Customer exists - they need to verify OTP
    // Return customer info (without sensitive data)
    return {
      success: true,
      customerExists: true,
      customer: {
        customer_id: customer.customer_id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone_number: customer.phone_number,
      },
      message: 'Customer found. Please verify OTP to continue.',
      requiresOTP: true,
    };
  } catch (error) {
    console.error('Error during customer login:', error);
    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
};

/**
 * Get customer by phone number (after OTP verification)
 * 
 * @param {string} phoneNumber - Verified phone number
 * @returns {Promise<Object>} Customer data
 */
export const getCustomerByPhone = async (phoneNumber) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      return {
        success: false,
        error: 'Invalid phone number',
      };
    }
    
    const { data: customer, error } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('phone_number', formattedPhone)
      .eq('is_active', true)
      .single();
    
    if (error || !customer) {
      return {
        success: false,
        error: 'Customer not found',
      };
    }
    
    return {
      success: true,
      customer,
    };
  } catch (error) {
    console.error('Error fetching customer:', error);
    return {
      success: false,
      error: 'An error occurred',
    };
  }
};

/**
 * Update customer profile
 * 
 * @param {string} customerId - Customer ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated customer
 */
export const updateCustomerProfile = async (customerId, updates) => {
  try {
    // Don't allow updating phone_number or customer_id
    const allowedFields = [
      'first_name',
      'last_name',
      'email',
      'birthday',
      'default_address',
      'profile_image_url',
    ];
    
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});
    
    if (Object.keys(filteredUpdates).length === 0) {
      return {
        success: false,
        error: 'No valid fields to update',
      };
    }
    
    const { data: updated, error } = await supabaseClient
      .from('customers')
      .update(filteredUpdates)
      .eq('customer_id', customerId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating customer profile:', error);
      return {
        success: false,
        error: 'Failed to update profile',
      };
    }
    
    // Audit log
    await logAuditEvent({
      action: 'customer_profile_updated',
      target_type: 'customer',
      target_id: customerId,
      details: {
        updated_fields: Object.keys(filteredUpdates),
      },
    });
    
    return {
      success: true,
      customer: updated,
      message: 'Profile updated successfully',
    };
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return {
      success: false,
      error: 'An error occurred',
    };
  }
};

/**
 * Export constants for use in components
 */
export const OTP_CONFIG = {
  LENGTH: OTP_LENGTH,
  EXPIRY_MINUTES: OTP_EXPIRY_MINUTES,
  MAX_ATTEMPTS: OTP_MAX_ATTEMPTS,
  MAX_RESENDS: OTP_MAX_RESENDS,
  RATE_LIMIT_MAX: OTP_RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_HOURS: OTP_RATE_LIMIT_WINDOW / (60 * 60 * 1000),
};

