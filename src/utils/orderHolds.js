/**
 * Order Holds Utility
 * 
 * Functions for managing order holds (blocked dates) and validating pickup dates.
 * Owner can set holds for dates when orders should not be accepted.
 * 
 * @module utils/orderHolds
 */

import { supabaseClient } from '../config/supabase';

/**
 * Fetch all active order holds
 * 
 * @returns {Promise<Object>} Result with holds array
 */
export const getActiveOrderHolds = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('order_holds')
      .select('hold_id, hold_date, reason')
      .eq('is_active', true)
      .order('hold_date', { ascending: true });

    if (error) {
      console.error('[Order Holds] Error fetching holds:', error);
      return {
        success: false,
        error: error.message,
        holds: [],
      };
    }

    return {
      success: true,
      holds: data || [],
    };
  } catch (error) {
    console.error('[Order Holds] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to fetch order holds',
      holds: [],
    };
  }
};

/**
 * Check if a specific date is blocked by an order hold
 * 
 * @param {Date|string} date - Date to check (Date object or YYYY-MM-DD string)
 * @returns {Promise<Object>} Result with isBlocked boolean and reason
 */
export const isDateBlocked = async (date) => {
  try {
    // Convert Date object to YYYY-MM-DD string if needed
    let dateString;
    if (date instanceof Date) {
      dateString = date.toISOString().split('T')[0];
    } else {
      dateString = date;
    }

    const { data, error } = await supabaseClient
      .from('order_holds')
      .select('hold_id, reason')
      .eq('hold_date', dateString)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[Order Holds] Error checking date:', error);
      return {
        success: false,
        error: error.message,
        isBlocked: false,
      };
    }

    return {
      success: true,
      isBlocked: !!data,
      reason: data?.reason || null,
    };
  } catch (error) {
    console.error('[Order Holds] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to check date availability',
      isBlocked: false,
    };
  }
};

/**
 * Get array of blocked dates for date picker
 * Returns dates as Date objects for easier integration with date pickers
 * 
 * @returns {Promise<Object>} Result with blockedDates array and holdsMap
 */
export const getBlockedDates = async () => {
  try {
    const result = await getActiveOrderHolds();

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        blockedDates: [],
        holdsMap: {},
      };
    }

    // Convert to Date objects and create a map for quick lookup
    const blockedDates = [];
    const holdsMap = {};

    result.holds.forEach((hold) => {
      const date = new Date(hold.hold_date + 'T00:00:00');
      blockedDates.push(date);
      holdsMap[hold.hold_date] = {
        reason: hold.reason,
        holdId: hold.hold_id,
      };
    });

    return {
      success: true,
      blockedDates,
      holdsMap,
    };
  } catch (error) {
    console.error('[Order Holds] Error getting blocked dates:', error);
    return {
      success: false,
      error: 'Failed to get blocked dates',
      blockedDates: [],
      holdsMap: {},
    };
  }
};

/**
 * Validate pickup date against business rules and order holds
 * 
 * @param {Date|string} pickupDate - Date to validate
 * @param {number} minAdvanceDays - Minimum days in advance (from config)
 * @param {number} maxAdvanceDays - Maximum days in advance (from config)
 * @returns {Promise<Object>} Result with isValid boolean and error message
 */
export const validatePickupDate = async (pickupDate, minAdvanceDays = 2, maxAdvanceDays = 90) => {
  try {
    // Convert to Date object if string
    const date = pickupDate instanceof Date ? pickupDate : new Date(pickupDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    // Calculate days from today
    const daysFromToday = Math.floor((date - today) / (1000 * 60 * 60 * 24));

    // Check if date is in the past
    if (daysFromToday < 0) {
      return {
        success: true,
        isValid: false,
        error: 'Pickup date cannot be in the past',
      };
    }

    // Check minimum advance days
    if (daysFromToday < minAdvanceDays) {
      return {
        success: true,
        isValid: false,
        error: `Orders must be placed at least ${minAdvanceDays} days in advance`,
      };
    }

    // Check maximum advance days
    if (daysFromToday > maxAdvanceDays) {
      return {
        success: true,
        isValid: false,
        error: `Orders cannot be placed more than ${maxAdvanceDays} days in advance`,
      };
    }

    // Check against order holds
    const blockCheck = await isDateBlocked(date);

    if (!blockCheck.success) {
      // If we can't check holds, allow the date but log the error
      console.error('[Order Holds] Could not verify holds, allowing date');
      return {
        success: true,
        isValid: true,
      };
    }

    if (blockCheck.isBlocked) {
      return {
        success: true,
        isValid: false,
        error: `This date is not available: ${blockCheck.reason}`,
      };
    }

    // Date is valid
    return {
      success: true,
      isValid: true,
    };
  } catch (error) {
    console.error('[Order Holds] Error validating date:', error);
    return {
      success: false,
      error: 'Failed to validate pickup date',
      isValid: false,
    };
  }
};

/**
 * Create a new order hold (owner only)
 * 
 * @param {string} holdDate - Date to block (YYYY-MM-DD)
 * @param {string} reason - Reason for the hold
 * @param {string} userId - User ID creating the hold
 * @returns {Promise<Object>} Result with created hold
 */
export const createOrderHold = async (holdDate, reason, userId) => {
  try {
    // Validate date is not in the past
    const date = new Date(holdDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date < today) {
      return {
        success: false,
        error: 'Cannot create hold for past dates',
      };
    }

    const { data, error } = await supabaseClient
      .from('order_holds')
      .insert({
        hold_date: holdDate,
        reason: reason,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return {
          success: false,
          error: 'A hold already exists for this date',
        };
      }

      console.error('[Order Holds] Error creating hold:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('[Order Holds] Hold created:', data.hold_id);

    return {
      success: true,
      hold: data,
    };
  } catch (error) {
    console.error('[Order Holds] Unexpected error creating hold:', error);
    return {
      success: false,
      error: 'Failed to create order hold',
    };
  }
};

/**
 * Deactivate an order hold (soft delete)
 * 
 * @param {string} holdId - Hold ID to deactivate
 * @returns {Promise<Object>} Result
 */
export const deactivateOrderHold = async (holdId) => {
  try {
    const { error } = await supabaseClient
      .from('order_holds')
      .update({ is_active: false })
      .eq('hold_id', holdId);

    if (error) {
      console.error('[Order Holds] Error deactivating hold:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('[Order Holds] Hold deactivated:', holdId);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Order Holds] Unexpected error deactivating hold:', error);
    return {
      success: false,
      error: 'Failed to deactivate order hold',
    };
  }
};

/**
 * Delete an order hold permanently
 * 
 * @param {string} holdId - Hold ID to delete
 * @returns {Promise<Object>} Result
 */
export const deleteOrderHold = async (holdId) => {
  try {
    const { error } = await supabaseClient
      .from('order_holds')
      .delete()
      .eq('hold_id', holdId);

    if (error) {
      console.error('[Order Holds] Error deleting hold:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('[Order Holds] Hold deleted:', holdId);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Order Holds] Unexpected error deleting hold:', error);
    return {
      success: false,
      error: 'Failed to delete order hold',
    };
  }
};

/**
 * Get all order holds (including inactive) for management
 * 
 * @returns {Promise<Object>} Result with all holds
 */
export const getAllOrderHolds = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('order_holds')
      .select(`
        hold_id,
        hold_date,
        reason,
        is_active,
        created_by,
        created_at,
        updated_at
      `)
      .order('hold_date', { ascending: true });

    if (error) {
      console.error('[Order Holds] Error fetching all holds:', error);
      return {
        success: false,
        error: error.message,
        holds: [],
      };
    }

    return {
      success: true,
      holds: data || [],
    };
  } catch (error) {
    console.error('[Order Holds] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to fetch order holds',
      holds: [],
    };
  }
};

