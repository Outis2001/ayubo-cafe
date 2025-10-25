/**
 * Customer Orders Utility
 * 
 * Functions for managing customer orders:
 * - Creating orders using stored procedures
 * - Fetching order history
 * - Updating order status
 * - Managing order lifecycle
 * 
 * @module utils/customerOrders
 */

import { supabaseClient } from '../config/supabase';
import { logAuditEvent } from './auditLog';

/**
 * Create a new customer order
 * Uses the create_customer_order() stored procedure for transaction safety
 * 
 * @param {Object} orderData - Order data
 * @param {string} orderData.customer_id - Customer UUID
 * @param {string} orderData.order_type - 'pre-made' or 'custom'
 * @param {string} orderData.pickup_date - Pickup date (YYYY-MM-DD)
 * @param {string} orderData.pickup_time - Pickup time (HH:MM)
 * @param {string} orderData.special_instructions - Special instructions (optional)
 * @param {Array} orderData.items - Array of order items
 * @param {number} orderData.deposit_percentage - Deposit percentage (default 40)
 * @returns {Promise<Object>} Result with order ID and order number
 */
export const createCustomerOrder = async (orderData) => {
  try {
    const {
      customer_id,
      order_type = 'pre-made',
      pickup_date,
      pickup_time,
      special_instructions = null,
      items = [],
      deposit_percentage = 40,
    } = orderData;

    // Validate required fields
    if (!customer_id) {
      return {
        success: false,
        error: 'Customer ID is required',
      };
    }

    if (!pickup_date) {
      return {
        success: false,
        error: 'Pickup date is required',
      };
    }

    if (!pickup_time) {
      return {
        success: false,
        error: 'Pickup time is required',
      };
    }

    if (!items || items.length === 0) {
      return {
        success: false,
        error: 'Order must contain at least one item',
      };
    }

    // Validate order type
    if (!['pre-made', 'custom'].includes(order_type)) {
      return {
        success: false,
        error: 'Invalid order type',
      };
    }

    // Prepare items for stored procedure (JSONB format)
    const orderItems = items.map((item) => ({
      product_id: item.product_id,
      pricing_id: item.pricing_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      product_name: item.product_name || null,
      weight: item.weight_option || null,
    }));

    console.log('[Customer Orders] Creating order:', {
      customer_id,
      order_type,
      pickup_date,
      pickup_time,
      items: orderItems.length,
    });

    // Call stored procedure using RPC
    const { data, error } = await supabaseClient.rpc('create_customer_order', {
      p_customer_id: customer_id,
      p_order_type: order_type,
      p_pickup_date: pickup_date,
      p_pickup_time: pickup_time,
      p_special_instructions: special_instructions,
      p_order_items: orderItems,
      p_deposit_percentage: deposit_percentage,
    });

    if (error) {
      console.error('[Customer Orders] Error creating order:', error);
      
      // Handle specific error cases
      if (error.message.includes('not accepted on this date')) {
        return {
          success: false,
          error: 'The selected pickup date is not available. Please choose another date.',
        };
      }

      if (error.message.includes('past')) {
        return {
          success: false,
          error: 'Pickup date cannot be in the past',
        };
      }

      if (error.message.includes('advance')) {
        return {
          success: false,
          error: 'Please check the minimum advance order requirements',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to create order',
      };
    }

    // The stored procedure returns the order_id
    const orderId = data;

    // Fetch the complete order details including order number
    const { data: orderDetails, error: fetchError } = await supabaseClient
      .from('customer_orders')
      .select(`
        order_id,
        order_number,
        customer_id,
        order_type,
        pickup_date,
        pickup_time,
        status,
        payment_status,
        subtotal,
        deposit_amount,
        total_amount,
        remaining_balance,
        created_at
      `)
      .eq('order_id', orderId)
      .single();

    if (fetchError) {
      console.error('[Customer Orders] Error fetching order details:', fetchError);
      // Order was created but we couldn't fetch details
      return {
        success: true,
        order_id: orderId,
        error: 'Order created but failed to fetch details',
      };
    }

    // Log audit event
    await logAuditEvent({
      action: 'customer_order_created',
      target_type: 'customer_order',
      target_id: orderId,
      details: {
        order_number: orderDetails.order_number,
        customer_id: customer_id,
        order_type: order_type,
        pickup_date: pickup_date,
        total_amount: orderDetails.total_amount,
        items_count: items.length,
      },
    });

    console.log('[Customer Orders] Order created successfully:', orderDetails.order_number);

    return {
      success: true,
      order_id: orderId,
      order_number: orderDetails.order_number,
      order: orderDetails,
    };

  } catch (error) {
    console.error('[Customer Orders] Unexpected error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while creating your order',
    };
  }
};

/**
 * Get order by ID with full details
 * 
 * @param {string} orderId - Order UUID
 * @returns {Promise<Object>} Result with order details
 */
export const getOrderById = async (orderId) => {
  try {
    const { data, error } = await supabaseClient
      .from('customer_orders')
      .select(`
        *,
        customer:customers (
          customer_id,
          first_name,
          last_name,
          phone_number,
          email
        ),
        items:customer_order_items (
          item_id,
          product_id,
          pricing_id,
          product_name,
          weight,
          quantity,
          unit_price,
          total_price,
          item_type,
          custom_specifications
        ),
        payments:customer_payments (
          payment_id,
          payment_method,
          payment_type,
          amount,
          status,
          transaction_id,
          created_at
        )
      `)
      .eq('order_id', orderId)
      .single();

    if (error) {
      console.error('[Customer Orders] Error fetching order:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      order: data,
    };

  } catch (error) {
    console.error('[Customer Orders] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to fetch order details',
    };
  }
};

/**
 * Get orders for a specific customer
 * 
 * @param {string} customerId - Customer UUID
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of orders to fetch
 * @param {number} options.offset - Offset for pagination
 * @param {string} options.status - Filter by status
 * @returns {Promise<Object>} Result with orders array
 */
export const getCustomerOrders = async (customerId, options = {}) => {
  try {
    const {
      limit = 50,
      offset = 0,
      status = null,
    } = options;

    let query = supabaseClient
      .from('customer_orders')
      .select(`
        order_id,
        order_number,
        order_type,
        pickup_date,
        pickup_time,
        status,
        payment_status,
        total_amount,
        deposit_amount,
        remaining_balance,
        created_at,
        items:customer_order_items (
          item_id,
          product_name,
          weight,
          quantity,
          unit_price
        )
      `, { count: 'exact' })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Customer Orders] Error fetching orders:', error);
      return {
        success: false,
        error: error.message,
        orders: [],
      };
    }

    return {
      success: true,
      orders: data || [],
      total: count || 0,
    };

  } catch (error) {
    console.error('[Customer Orders] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to fetch orders',
      orders: [],
    };
  }
};

/**
 * Update order status
 * Uses the update_order_status() stored procedure to maintain status history
 * 
 * @param {string} orderId - Order UUID
 * @param {string} newStatus - New status value
 * @param {string} notes - Optional notes about status change
 * @param {string} updatedBy - User ID making the change (for staff)
 * @returns {Promise<Object>} Result
 */
export const updateOrderStatus = async (orderId, newStatus, notes = null, updatedBy = null) => {
  try {
    // Validate status
    const validStatuses = [
      'pending_payment',
      'payment_pending_verification',
      'payment_verified',
      'confirmed',
      'in_preparation',
      'ready_for_pickup',
      'completed',
      'cancelled',
    ];

    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        error: 'Invalid order status',
      };
    }

    // Call stored procedure
    const { error } = await supabaseClient.rpc('update_order_status', {
      p_order_id: orderId,
      p_new_status: newStatus,
      p_notes: notes,
      p_updated_by: updatedBy,
    });

    if (error) {
      console.error('[Customer Orders] Error updating status:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Log audit event
    await logAuditEvent({
      action: 'order_status_updated',
      target_type: 'customer_order',
      target_id: orderId,
      details: {
        new_status: newStatus,
        notes: notes,
        updated_by: updatedBy,
      },
    });

    console.log('[Customer Orders] Status updated:', orderId, newStatus);

    return {
      success: true,
    };

  } catch (error) {
    console.error('[Customer Orders] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to update order status',
    };
  }
};

/**
 * Get order status history
 * 
 * @param {string} orderId - Order UUID
 * @returns {Promise<Object>} Result with status history
 */
export const getOrderStatusHistory = async (orderId) => {
  try {
    const { data, error } = await supabaseClient
      .from('order_status_history')
      .select(`
        history_id,
        old_status,
        new_status,
        changed_at,
        changed_by,
        notes,
        user:users (
          first_name,
          last_name,
          role
        )
      `)
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true });

    if (error) {
      console.error('[Customer Orders] Error fetching history:', error);
      return {
        success: false,
        error: error.message,
        history: [],
      };
    }

    return {
      success: true,
      history: data || [],
    };

  } catch (error) {
    console.error('[Customer Orders] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to fetch order history',
      history: [],
    };
  }
};

/**
 * Cancel order
 * 
 * @param {string} orderId - Order UUID
 * @param {string} reason - Cancellation reason
 * @param {string} cancelledBy - User ID (staff only)
 * @returns {Promise<Object>} Result
 */
export const cancelOrder = async (orderId, reason, cancelledBy = null) => {
  try {
    // Update order status to cancelled
    const result = await updateOrderStatus(
      orderId,
      'cancelled',
      `Cancelled: ${reason}`,
      cancelledBy
    );

    if (!result.success) {
      return result;
    }

    // Log audit event
    await logAuditEvent({
      action: 'order_cancelled',
      target_type: 'customer_order',
      target_id: orderId,
      details: {
        reason: reason,
        cancelled_by: cancelledBy,
      },
    });

    console.log('[Customer Orders] Order cancelled:', orderId);

    return {
      success: true,
    };

  } catch (error) {
    console.error('[Customer Orders] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to cancel order',
    };
  }
};

/**
 * Get all orders (staff view)
 * 
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status
 * @param {string} filters.payment_status - Filter by payment status
 * @param {string} filters.order_type - Filter by order type
 * @param {string} filters.date_from - Filter by date from
 * @param {string} filters.date_to - Filter by date to
 * @param {string} filters.search - Search by order number or customer name
 * @param {number} filters.limit - Limit results
 * @param {number} filters.offset - Offset for pagination
 * @returns {Promise<Object>} Result with orders array
 */
export const getAllOrders = async (filters = {}) => {
  try {
    const {
      status = null,
      payment_status = null,
      order_type = null,
      date_from = null,
      date_to = null,
      search = null,
      limit = 50,
      offset = 0,
    } = filters;

    let query = supabaseClient
      .from('customer_orders')
      .select(`
        order_id,
        order_number,
        order_type,
        pickup_date,
        pickup_time,
        status,
        payment_status,
        total_amount,
        deposit_amount,
        remaining_balance,
        created_at,
        customer:customers (
          customer_id,
          first_name,
          last_name,
          phone_number,
          email
        ),
        items:customer_order_items (
          item_id,
          product_name,
          quantity
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (payment_status) {
      query = query.eq('payment_status', payment_status);
    }

    if (order_type) {
      query = query.eq('order_type', order_type);
    }

    if (date_from) {
      query = query.gte('pickup_date', date_from);
    }

    if (date_to) {
      query = query.lte('pickup_date', date_to);
    }

    if (search) {
      // Search by order number
      query = query.ilike('order_number', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Customer Orders] Error fetching all orders:', error);
      return {
        success: false,
        error: error.message,
        orders: [],
      };
    }

    return {
      success: true,
      orders: data || [],
      total: count || 0,
    };

  } catch (error) {
    console.error('[Customer Orders] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to fetch orders',
      orders: [],
    };
  }
};

/**
 * Calculate order totals
 * Helper function to calculate deposit and balance
 * 
 * @param {number} subtotal - Order subtotal
 * @param {number} depositPercentage - Deposit percentage (default 40)
 * @returns {Object} Calculated totals
 */
export const calculateOrderTotals = (subtotal, depositPercentage = 40) => {
  const deposit = parseFloat((subtotal * depositPercentage / 100).toFixed(2));
  const remaining = parseFloat((subtotal - deposit).toFixed(2));

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    depositAmount: deposit,
    remainingBalance: remaining,
    totalAmount: parseFloat(subtotal.toFixed(2)),
  };
};

/**
 * Validate order data before creation
 * 
 * @param {Object} orderData - Order data to validate
 * @returns {Object} Validation result
 */
export const validateOrderData = (orderData) => {
  const errors = [];

  if (!orderData.customer_id) {
    errors.push('Customer ID is required');
  }

  if (!orderData.pickup_date) {
    errors.push('Pickup date is required');
  }

  if (!orderData.pickup_time) {
    errors.push('Pickup time is required');
  }

  if (!orderData.items || orderData.items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  // Validate items
  if (orderData.items && orderData.items.length > 0) {
    orderData.items.forEach((item, index) => {
      if (!item.product_id) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      if (!item.pricing_id) {
        errors.push(`Item ${index + 1}: Pricing ID is required`);
      }
      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      }
      if (!item.unit_price || item.unit_price <= 0) {
        errors.push(`Item ${index + 1}: Valid price is required`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

