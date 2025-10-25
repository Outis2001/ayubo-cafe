/**
 * Customer Authentication Context
 * 
 * Provides global authentication state and functions for customer portal.
 * Manages customer login via OTP, session persistence, and authentication checks.
 * Completely separate from staff authentication system.
 * 
 * @module context/CustomerAuthContext
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import {
  requestOTP,
  resendOTP,
  verifyOTP,
  createCustomer,
  customerLogin,
  getCustomerByPhone,
  updateCustomerProfile,
} from '../utils/customerAuth';
import { logAuditEvent } from '../utils/auditLog';

// Create the customer authentication context
const CustomerAuthContext = createContext(null);

// Storage keys
const CUSTOMER_SESSION_KEY = 'ayubo_customer_session';
const CUSTOMER_REMEMBER_KEY = 'ayubo_customer_remember';

/**
 * CustomerAuthProvider Component
 * 
 * Wraps the customer portal to provide authentication state and functions
 * to all child components via React Context.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const CustomerAuthProvider = ({ children }) => {
  // Authentication state
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // OTP flow state
  const [otpSession, setOtpSession] = useState(null); // { otpId, phoneNumber, expiresAt }

  /**
   * Check for existing customer session on component mount
   * Validates session and restores customer state if valid
   */
  useEffect(() => {
    checkCustomerSession();
  }, []);

  /**
   * Check if customer has a valid session
   * 
   * Retrieves customer data from localStorage and validates it
   * against the database. Restores customer state if session is valid.
   */
  const checkCustomerSession = async () => {
    try {
      setLoading(true);

      // Try to get customer session from storage
      const sessionData = localStorage.getItem(CUSTOMER_SESSION_KEY) || 
                         sessionStorage.getItem(CUSTOMER_SESSION_KEY);

      if (!sessionData) {
        setLoading(false);
        return;
      }

      const session = JSON.parse(sessionData);
      const { customer_id, phone_number, timestamp } = session;

      if (!customer_id || !phone_number) {
        // Invalid session data
        clearCustomerSession();
        setLoading(false);
        return;
      }

      // Check if session is expired (7 days for remember me, 24 hours otherwise)
      const now = Date.now();
      const sessionAge = now - timestamp;
      const rememberMe = localStorage.getItem(CUSTOMER_REMEMBER_KEY) === 'true';
      const maxAge = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 days or 24 hours

      if (sessionAge > maxAge) {
        // Session expired
        console.log('[Customer Auth] Session expired');
        clearCustomerSession();
        setLoading(false);
        return;
      }

      // Validate customer still exists and is active
      const { data: customer, error } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('is_active', true)
        .single();

      if (error || !customer) {
        // Customer not found or inactive
        console.log('[Customer Auth] Customer not found or inactive');
        clearCustomerSession();
        setLoading(false);
        return;
      }

      // Restore customer state
      setCurrentCustomer(customer);
      setIsAuthenticated(true);

      console.log('[Customer Auth] Session restored for customer:', customer.phone_number);

    } catch (error) {
      console.error('[Customer Auth] Error checking session:', error);
      clearCustomerSession();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear customer session from storage
   */
  const clearCustomerSession = () => {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    sessionStorage.removeItem(CUSTOMER_SESSION_KEY);
    localStorage.removeItem(CUSTOMER_REMEMBER_KEY);
    setCurrentCustomer(null);
    setIsAuthenticated(false);
  };

  /**
   * Save customer session to storage
   * 
   * @param {Object} customer - Customer data
   * @param {boolean} rememberMe - Whether to use persistent storage
   */
  const saveCustomerSession = (customer, rememberMe = false) => {
    const sessionData = {
      customer_id: customer.customer_id,
      phone_number: customer.phone_number,
      timestamp: Date.now(),
    };

    if (rememberMe) {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(sessionData));
      localStorage.setItem(CUSTOMER_REMEMBER_KEY, 'true');
    } else {
      sessionStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(sessionData));
      localStorage.setItem(CUSTOMER_REMEMBER_KEY, 'false');
    }
  };

  /**
   * Step 1: Request OTP for phone number
   * 
   * @param {string} phoneNumber - Customer phone number
   * @param {boolean} testMode - If true, return OTP for testing
   * @returns {Promise<Object>} Result with otpId if successful
   */
  const initiateOTP = async (phoneNumber, testMode = false) => {
    try {
      const result = await requestOTP(phoneNumber, testMode);
      
      if (result.success) {
        // Store OTP session for verification step
        setOtpSession({
          otpId: result.otpId,
          phoneNumber: phoneNumber,
          expiresAt: result.expiresAt,
        });
      }

      return result;
    } catch (error) {
      console.error('[Customer Auth] Error requesting OTP:', error);
      return {
        success: false,
        error: 'Failed to send OTP. Please try again.',
      };
    }
  };

  /**
   * Step 2: Resend OTP
   * 
   * @param {boolean} testMode - If true, return OTP for testing
   * @returns {Promise<Object>} Result with new otpId
   */
  const resendOTPCode = async (testMode = false) => {
    try {
      if (!otpSession) {
        return {
          success: false,
          error: 'No active OTP session. Please request a new OTP.',
        };
      }

      const result = await resendOTP(
        otpSession.otpId,
        otpSession.phoneNumber,
        testMode
      );

      if (result.success) {
        // Update OTP session with new expiry
        setOtpSession({
          ...otpSession,
          otpId: result.otpId,
          expiresAt: result.expiresAt,
        });
      }

      return result;
    } catch (error) {
      console.error('[Customer Auth] Error resending OTP:', error);
      return {
        success: false,
        error: 'Failed to resend OTP. Please try again.',
      };
    }
  };

  /**
   * Step 3: Verify OTP and complete login/signup
   * 
   * @param {string} otpCode - 6-digit OTP code
   * @param {Object} customerData - Customer data for signup (optional)
   * @param {boolean} rememberMe - Whether to persist session
   * @returns {Promise<Object>} Result with customer data if successful
   */
  const verifyOTPAndLogin = async (otpCode, customerData = null, rememberMe = false) => {
    try {
      if (!otpSession) {
        return {
          success: false,
          error: 'No active OTP session. Please request a new OTP.',
        };
      }

      // Verify OTP
      const verifyResult = await verifyOTP(
        otpSession.otpId,
        otpCode,
        otpSession.phoneNumber
      );

      if (!verifyResult.success) {
        return verifyResult;
      }

      // OTP verified successfully
      // Check if customer exists or needs to be created
      const loginResult = await customerLogin(otpSession.phoneNumber);

      let customer;

      if (loginResult.customerExists) {
        // Existing customer - fetch full details
        const fetchResult = await getCustomerByPhone(otpSession.phoneNumber);
        if (!fetchResult.success) {
          return {
            success: false,
            error: 'Failed to fetch customer details. Please try again.',
          };
        }
        customer = fetchResult.customer;

        // Audit log
        await logAuditEvent({
          action: 'customer_login',
          target_type: 'customer',
          target_id: customer.customer_id,
          details: {
            phone_number: customer.phone_number,
          },
        });

      } else {
        // New customer - create account
        if (!customerData || !customerData.firstName || !customerData.lastName) {
          return {
            success: false,
            error: 'Customer information required for signup',
            requiresSignup: true,
          };
        }

        const signupResult = await createCustomer({
          phoneNumber: otpSession.phoneNumber,
          ...customerData,
        });

        if (!signupResult.success) {
          return signupResult;
        }

        customer = signupResult.customer;
      }

      // Save session and update state
      saveCustomerSession(customer, rememberMe);
      setCurrentCustomer(customer);
      setIsAuthenticated(true);
      setOtpSession(null); // Clear OTP session

      return {
        success: true,
        customer,
        isNewCustomer: !loginResult.customerExists,
      };

    } catch (error) {
      console.error('[Customer Auth] Error verifying OTP:', error);
      return {
        success: false,
        error: 'An error occurred. Please try again.',
      };
    }
  };

  /**
   * Complete customer signup flow
   * Combines OTP verification and account creation
   * 
   * @param {string} phoneNumber - Customer phone number
   * @param {string} otpCode - Verified OTP code
   * @param {Object} customerInfo - Customer details (firstName, lastName, email, etc.)
   * @param {boolean} rememberMe - Whether to persist session
   * @returns {Promise<Object>} Result with customer data
   */
  const signup = async (phoneNumber, otpCode, customerInfo, rememberMe = false) => {
    return verifyOTPAndLogin(otpCode, customerInfo, rememberMe);
  };

  /**
   * Complete customer login flow
   * For returning customers
   * 
   * @param {string} phoneNumber - Customer phone number  
   * @param {string} otpCode - Verified OTP code
   * @param {boolean} rememberMe - Whether to persist session
   * @returns {Promise<Object>} Result with customer data
   */
  const login = async (phoneNumber, otpCode, rememberMe = false) => {
    return verifyOTPAndLogin(otpCode, null, rememberMe);
  };

  /**
   * Logout current customer
   * 
   * Clears session storage and resets authentication state
   */
  const logout = async () => {
    try {
      if (currentCustomer) {
        // Audit log
        await logAuditEvent({
          action: 'customer_logout',
          target_type: 'customer',
          target_id: currentCustomer.customer_id,
          details: {
            phone_number: currentCustomer.phone_number,
          },
        });
      }

      // Clear state and storage
      clearCustomerSession();
      setOtpSession(null);

      console.log('[Customer Auth] Customer logged out');

    } catch (error) {
      console.error('[Customer Auth] Error during logout:', error);
      // Still clear local state even if audit log fails
      clearCustomerSession();
      setOtpSession(null);
    }
  };

  /**
   * Update customer profile
   * 
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Result with updated customer
   */
  const updateProfile = async (updates) => {
    try {
      if (!currentCustomer) {
        return {
          success: false,
          error: 'Not authenticated',
        };
      }

      const result = await updateCustomerProfile(currentCustomer.customer_id, updates);

      if (result.success) {
        // Update local state
        setCurrentCustomer(result.customer);
        
        // Update session storage
        const rememberMe = localStorage.getItem(CUSTOMER_REMEMBER_KEY) === 'true';
        saveCustomerSession(result.customer, rememberMe);
      }

      return result;
    } catch (error) {
      console.error('[Customer Auth] Error updating profile:', error);
      return {
        success: false,
        error: 'Failed to update profile. Please try again.',
      };
    }
  };

  /**
   * Check if a phone number has an existing account
   * 
   * @param {string} phoneNumber - Phone number to check
   * @returns {Promise<Object>} Result with customerExists boolean
   */
  const checkCustomerExists = async (phoneNumber) => {
    try {
      const result = await customerLogin(phoneNumber);
      return {
        success: true,
        customerExists: result.customerExists || false,
      };
    } catch (error) {
      console.error('[Customer Auth] Error checking customer:', error);
      return {
        success: false,
        error: 'Failed to check customer status',
      };
    }
  };

  /**
   * Clear OTP session (for cancelling OTP flow)
   */
  const clearOTPSession = () => {
    setOtpSession(null);
  };

  // Context value
  const value = {
    // State
    currentCustomer,
    loading,
    isAuthenticated,
    otpSession,

    // Auth functions
    initiateOTP,
    resendOTPCode,
    verifyOTPAndLogin,
    signup,
    login,
    logout,
    
    // Profile functions
    updateProfile,
    
    // Utility functions
    checkCustomerExists,
    clearOTPSession,
    checkCustomerSession,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

/**
 * useCustomerAuth Hook
 * 
 * Custom hook to access customer authentication context.
 * Must be used within CustomerAuthProvider.
 * 
 * @returns {Object} Customer authentication context
 * @throws {Error} If used outside of CustomerAuthProvider
 * 
 * @example
 * const { currentCustomer, initiateOTP, verifyOTPAndLogin, logout } = useCustomerAuth();
 * 
 * if (currentCustomer) {
 *   console.log('Logged in as:', currentCustomer.phone_number);
 * }
 */
export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);

  if (context === null) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }

  return context;
};

export default CustomerAuthContext;

