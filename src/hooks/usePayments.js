/**
 * Payment Processing Hook
 * 
 * Custom React hook for handling payment operations.
 * Supports both Stripe and bank transfer payments.
 */

import { useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  createPaymentRecord,
  updatePaymentStatus,
  updateOrderPaymentStatus,
  getOrderPayments,
  hasDepositBeenPaid,
  isOrderFullyPaid,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  PAYMENT_TYPES,
} from '../utils/payments';
import { uploadImageToSupabase } from '../utils/imageUpload';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

/**
 * usePayments Hook
 * @returns {Object} Payment functions and state
 */
export const usePayments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);

  /**
   * Process Stripe payment
   * @param {Object} paymentData - Payment information
   * @returns {Promise<Object>} Payment result
   */
  const processStripePayment = useCallback(async (paymentData) => {
    setLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      const {
        order_id,
        customer_id,
        amount,
        payment_type,
        order_number,
        customer_email,
      } = paymentData;

      // Validate required fields
      if (!order_id || !customer_id || !amount || !payment_type) {
        throw new Error('Missing required payment information');
      }

      // Create payment record
      const paymentRecord = await createPaymentRecord({
        order_id,
        customer_id,
        amount,
        payment_method: PAYMENT_METHODS.STRIPE,
        payment_type,
        payment_status: PAYMENT_STATUS.PENDING,
      });

      // Call Netlify function to create Stripe checkout session
      const response = await fetch('/.netlify/functions/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id,
          order_number,
          payment_id: paymentRecord.payment_id,
          amount,
          payment_type,
          customer_email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe checkout
      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw stripeError;
      }

      const result = {
        success: true,
        payment_id: paymentRecord.payment_id,
      };

      setPaymentResult(result);
      return result;

    } catch (err) {
      console.error('[usePayments] Stripe payment error:', err);
      const errorMessage = err.message || 'Payment processing failed';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Process bank transfer payment
   * @param {Object} paymentData - Payment information with receipt
   * @returns {Promise<Object>} Payment result
   */
  const processBankTransferPayment = useCallback(async (paymentData) => {
    setLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      const {
        order_id,
        customer_id,
        amount,
        payment_type,
        receipt_image,
        transaction_reference,
      } = paymentData;

      // Validate required fields
      if (!order_id || !customer_id || !amount || !payment_type || !receipt_image) {
        throw new Error('Missing required payment information or receipt image');
      }

      // Upload receipt image
      let receiptUrl = null;
      try {
        receiptUrl = await uploadImageToSupabase(
          receipt_image,
          'payment-receipts',
          `receipt_${order_id}_${Date.now()}`
        );
      } catch (uploadError) {
        console.error('[usePayments] Receipt upload error:', uploadError);
        throw new Error('Failed to upload receipt image');
      }

      // Create payment record
      const paymentRecord = await createPaymentRecord({
        order_id,
        customer_id,
        amount,
        payment_method: PAYMENT_METHODS.BANK_TRANSFER,
        payment_type,
        payment_status: PAYMENT_STATUS.PENDING_VERIFICATION,
        receipt_image_url: receiptUrl,
        transaction_reference,
      });

      // Update order status
      await updateOrderPaymentStatus(order_id, 'payment_pending_verification');

      const result = {
        success: true,
        payment_id: paymentRecord.payment_id,
        message: 'Payment submitted for verification',
      };

      setPaymentResult(result);
      return result;

    } catch (err) {
      console.error('[usePayments] Bank transfer payment error:', err);
      const errorMessage = err.message || 'Payment submission failed';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get payment history for an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Array>} Payment records
   */
  const fetchOrderPayments = useCallback(async (orderId) => {
    setLoading(true);
    setError(null);

    try {
      const payments = await getOrderPayments(orderId);
      return payments;
    } catch (err) {
      console.error('[usePayments] Error fetching payments:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if deposit has been paid
   * @param {string} orderId - Order ID
   * @returns {Promise<boolean>} True if paid
   */
  const checkDepositPaid = useCallback(async (orderId) => {
    try {
      return await hasDepositBeenPaid(orderId);
    } catch (err) {
      console.error('[usePayments] Error checking deposit:', err);
      return false;
    }
  }, []);

  /**
   * Check if order is fully paid
   * @param {string} orderId - Order ID
   * @returns {Promise<boolean>} True if fully paid
   */
  const checkFullyPaid = useCallback(async (orderId) => {
    try {
      return await isOrderFullyPaid(orderId);
    } catch (err) {
      console.error('[usePayments] Error checking payment status:', err);
      return false;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear payment result
   */
  const clearResult = useCallback(() => {
    setPaymentResult(null);
  }, []);

  return {
    // State
    loading,
    error,
    paymentResult,

    // Functions
    processStripePayment,
    processBankTransferPayment,
    fetchOrderPayments,
    checkDepositPaid,
    checkFullyPaid,
    clearError,
    clearResult,
  };
};

export default usePayments;

