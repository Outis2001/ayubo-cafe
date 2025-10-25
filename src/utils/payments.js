/**
 * Payment Utilities
 * 
 * Handles payment processing for both Stripe (online) and bank transfers.
 * 
 * Features:
 * - Stripe payment intent creation
 * - Bank transfer payment record creation
 * - Payment verification
 * - Balance payment processing
 * - Payment status updates
 */

import { supabaseClient } from '../config/supabase';
import { logAuditEvent } from './auditLog';

/**
 * Payment methods
 */
export const PAYMENT_METHODS = {
  STRIPE: 'stripe',
  BANK_TRANSFER: 'bank_transfer',
};

/**
 * Payment status values
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING_VERIFICATION: 'pending_verification',
};

/**
 * Payment types
 */
export const PAYMENT_TYPES = {
  DEPOSIT: 'deposit',
  BALANCE: 'balance',
  FULL: 'full',
};

/**
 * Calculate deposit amount (40% of total)
 * @param {number} totalAmount - Total order amount
 * @returns {number} Deposit amount
 */
export const calculateDepositAmount = (totalAmount) => {
  const depositPercentage = 40;
  return (parseFloat(totalAmount) * depositPercentage) / 100;
};

/**
 * Calculate balance amount (60% of total)
 * @param {number} totalAmount - Total order amount
 * @returns {number} Balance amount
 */
export const calculateBalanceAmount = (totalAmount) => {
  const depositAmount = calculateDepositAmount(totalAmount);
  return parseFloat(totalAmount) - depositAmount;
};

/**
 * Get bank account details from system configuration
 * @returns {Promise<Object>} Bank account details
 */
export const getBankAccountDetails = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('system_configuration')
      .select('config_value')
      .eq('config_key', 'bank_account_details')
      .single();

    if (error) throw error;

    if (!data) {
      // Return default bank details if not configured
      return {
        bank_name: 'Bank of Ceylon',
        account_name: 'Ayubo Cafe',
        account_number: '1234567890',
        branch: 'Colombo',
      };
    }

    return JSON.parse(data.config_value);
  } catch (error) {
    console.error('[Payments] Error fetching bank details:', error);
    throw new Error('Failed to fetch bank account details');
  }
};

/**
 * Create payment record in database
 * @param {Object} paymentData - Payment information
 * @returns {Promise<Object>} Created payment record
 */
export const createPaymentRecord = async (paymentData) => {
  try {
    const {
      order_id,
      customer_id,
      amount,
      payment_method,
      payment_type,
      payment_status,
      stripe_payment_intent_id = null,
      receipt_image_url = null,
      transaction_reference = null,
    } = paymentData;

    // Validate required fields
    if (!order_id || !customer_id || !amount || !payment_method || !payment_type) {
      throw new Error('Missing required payment fields');
    }

    // Create payment record
    const paymentRecord = {
      order_id,
      customer_id,
      amount: parseFloat(amount),
      payment_method,
      payment_type,
      payment_status: payment_status || PAYMENT_STATUS.PENDING,
      stripe_payment_intent_id,
      receipt_image_url,
      transaction_reference,
      payment_date: new Date().toISOString(),
    };

    const { data, error } = await supabaseClient
      .from('customer_payments')
      .insert([paymentRecord])
      .select()
      .single();

    if (error) throw error;

    console.log('[Payments] Payment record created:', data.payment_id);

    // Log audit event
    await logAuditEvent({
      action: 'payment_initiated',
      target_type: 'customer_payment',
      target_id: data.payment_id,
      details: {
        order_id,
        customer_id,
        amount,
        payment_method,
        payment_type,
      },
      status: 'success',
    });

    return data;
  } catch (error) {
    console.error('[Payments] Error creating payment record:', error);

    await logAuditEvent({
      action: 'payment_creation_failed',
      target_type: 'customer_payment',
      target_id: null,
      details: {
        error: error.message,
        payment_data: paymentData,
      },
      status: 'failure',
    });

    throw error;
  }
};

/**
 * Update payment status
 * @param {string} paymentId - Payment ID
 * @param {string} status - New payment status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object>} Updated payment record
 */
export const updatePaymentStatus = async (paymentId, status, additionalData = {}) => {
  try {
    const updateData = {
      payment_status: status,
      updated_at: new Date().toISOString(),
      ...additionalData,
    };

    const { data, error } = await supabaseClient
      .from('customer_payments')
      .update(updateData)
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (error) throw error;

    console.log('[Payments] Payment status updated:', paymentId, status);

    // Log audit event
    await logAuditEvent({
      action: 'payment_status_updated',
      target_type: 'customer_payment',
      target_id: paymentId,
      details: {
        new_status: status,
        ...additionalData,
      },
      status: 'success',
    });

    return data;
  } catch (error) {
    console.error('[Payments] Error updating payment status:', error);
    throw error;
  }
};

/**
 * Update order payment status
 * @param {string} orderId - Order ID
 * @param {string} status - New order status
 * @returns {Promise<Object>} Updated order
 */
export const updateOrderPaymentStatus = async (orderId, status) => {
  try {
    const { data, error } = await supabaseClient
      .from('customer_orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) throw error;

    console.log('[Payments] Order status updated:', orderId, status);

    // Log audit event
    await logAuditEvent({
      action: 'order_status_updated',
      target_type: 'customer_order',
      target_id: orderId,
      details: {
        new_status: status,
        reason: 'payment_status_change',
      },
      status: 'success',
    });

    return data;
  } catch (error) {
    console.error('[Payments] Error updating order status:', error);
    throw error;
  }
};

/**
 * Get payment records for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Payment records
 */
export const getOrderPayments = async (orderId) => {
  try {
    const { data, error } = await supabaseClient
      .from('customer_payments')
      .select('*')
      .eq('order_id', orderId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[Payments] Error fetching order payments:', error);
    throw error;
  }
};

/**
 * Check if deposit has been paid for an order
 * @param {string} orderId - Order ID
 * @returns {Promise<boolean>} True if deposit paid
 */
export const hasDepositBeenPaid = async (orderId) => {
  try {
    const { data, error } = await supabaseClient
      .from('customer_payments')
      .select('payment_id')
      .eq('order_id', orderId)
      .eq('payment_type', PAYMENT_TYPES.DEPOSIT)
      .eq('payment_status', PAYMENT_STATUS.SUCCESS)
      .limit(1);

    if (error) throw error;

    return data && data.length > 0;
  } catch (error) {
    console.error('[Payments] Error checking deposit status:', error);
    return false;
  }
};

/**
 * Check if order is fully paid
 * @param {string} orderId - Order ID
 * @returns {Promise<boolean>} True if fully paid
 */
export const isOrderFullyPaid = async (orderId) => {
  try {
    // Check for full payment
    const { data: fullPayment, error: fullError } = await supabaseClient
      .from('customer_payments')
      .select('payment_id')
      .eq('order_id', orderId)
      .eq('payment_type', PAYMENT_TYPES.FULL)
      .eq('payment_status', PAYMENT_STATUS.SUCCESS)
      .limit(1);

    if (fullError) throw fullError;

    if (fullPayment && fullPayment.length > 0) {
      return true;
    }

    // Check for both deposit and balance payments
    const { data: payments, error: paymentsError } = await supabaseClient
      .from('customer_payments')
      .select('payment_type')
      .eq('order_id', orderId)
      .eq('payment_status', PAYMENT_STATUS.SUCCESS)
      .in('payment_type', [PAYMENT_TYPES.DEPOSIT, PAYMENT_TYPES.BALANCE]);

    if (paymentsError) throw paymentsError;

    const paymentTypes = payments.map(p => p.payment_type);
    const hasDeposit = paymentTypes.includes(PAYMENT_TYPES.DEPOSIT);
    const hasBalance = paymentTypes.includes(PAYMENT_TYPES.BALANCE);

    return hasDeposit && hasBalance;
  } catch (error) {
    console.error('[Payments] Error checking payment status:', error);
    return false;
  }
};

/**
 * Verify bank transfer payment (staff action)
 * @param {string} paymentId - Payment ID
 * @param {string} verifiedBy - Staff member ID who verified
 * @param {string} notes - Verification notes
 * @returns {Promise<Object>} Updated payment and order
 */
export const verifyBankTransferPayment = async (paymentId, verifiedBy, notes = null) => {
  try {
    // Update payment status
    const payment = await updatePaymentStatus(paymentId, PAYMENT_STATUS.SUCCESS, {
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      verification_notes: notes,
    });

    // Update order status to payment_verified
    await updateOrderPaymentStatus(payment.order_id, 'payment_verified');

    // Check if order is now fully paid
    const fullyPaid = await isOrderFullyPaid(payment.order_id);
    if (fullyPaid) {
      await updateOrderPaymentStatus(payment.order_id, 'confirmed');
    }

    // Send notification to customer
    try {
      await supabaseClient
        .from('customer_notifications')
        .insert([{
          customer_id: payment.customer_id,
          notification_type: 'payment_verified',
          title: 'Payment Verified',
          message: 'Your payment has been verified. Thank you!',
          related_type: 'customer_order',
          related_id: payment.order_id,
          is_read: false,
        }]);
    } catch (notifError) {
      console.error('[Payments] Error creating notification:', notifError);
    }

    console.log('[Payments] Bank transfer verified:', paymentId);

    return { payment, fullyPaid };
  } catch (error) {
    console.error('[Payments] Error verifying bank transfer:', error);
    throw error;
  }
};

/**
 * Reject bank transfer payment (staff action)
 * @param {string} paymentId - Payment ID
 * @param {string} rejectedBy - Staff member ID who rejected
 * @param {string} reason - Rejection reason
 * @returns {Promise<Object>} Updated payment
 */
export const rejectBankTransferPayment = async (paymentId, rejectedBy, reason) => {
  try {
    if (!reason) {
      throw new Error('Rejection reason is required');
    }

    // Get payment details
    const { data: payment, error: fetchError } = await supabaseClient
      .from('customer_payments')
      .select('*, customer_orders!inner(order_number)')
      .eq('payment_id', paymentId)
      .single();

    if (fetchError) throw fetchError;

    // Update payment status
    const updatedPayment = await updatePaymentStatus(paymentId, PAYMENT_STATUS.FAILED, {
      verified_by: rejectedBy,
      verified_at: new Date().toISOString(),
      verification_notes: reason,
    });

    // Send notification to customer
    try {
      await supabaseClient
        .from('customer_notifications')
        .insert([{
          customer_id: payment.customer_id,
          notification_type: 'payment_rejected',
          title: 'Payment Verification Failed',
          message: `Your payment for order ${payment.customer_orders.order_number} could not be verified. Reason: ${reason}. Please submit a correct receipt or contact us.`,
          related_type: 'customer_order',
          related_id: payment.order_id,
          is_read: false,
        }]);
    } catch (notifError) {
      console.error('[Payments] Error creating notification:', notifError);
    }

    console.log('[Payments] Bank transfer rejected:', paymentId);

    return updatedPayment;
  } catch (error) {
    console.error('[Payments] Error rejecting bank transfer:', error);
    throw error;
  }
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `Rs. ${parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Get payment method display name
 * @param {string} method - Payment method
 * @returns {string} Display name
 */
export const getPaymentMethodName = (method) => {
  switch (method) {
    case PAYMENT_METHODS.STRIPE:
      return 'Credit/Debit Card';
    case PAYMENT_METHODS.BANK_TRANSFER:
      return 'Bank Transfer';
    default:
      return method;
  }
};

/**
 * Get payment status color
 * @param {string} status - Payment status
 * @returns {string} Tailwind color class
 */
export const getPaymentStatusColor = (status) => {
  switch (status) {
    case PAYMENT_STATUS.SUCCESS:
      return 'text-green-600 bg-green-100';
    case PAYMENT_STATUS.PENDING:
      return 'text-yellow-600 bg-yellow-100';
    case PAYMENT_STATUS.PENDING_VERIFICATION:
      return 'text-blue-600 bg-blue-100';
    case PAYMENT_STATUS.FAILED:
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

