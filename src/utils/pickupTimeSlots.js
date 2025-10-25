/**
 * Pickup Time Slots Utility
 * 
 * Functions for managing pickup time slots configuration.
 * Time slots are stored in system_configuration table as JSON.
 * 
 * @module utils/pickupTimeSlots
 */

import { supabaseClient } from '../config/supabase';

/**
 * Fetch configured pickup time slots
 * 
 * @returns {Promise<Object>} Result with time slots array
 */
export const getPickupTimeSlots = async () => {
  try {
    const { data, error } = await supabaseClient
      .from('system_configuration')
      .select('config_value')
      .eq('config_key', 'pickup_time_slots')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[Pickup Time Slots] Error fetching slots:', error);
      return {
        success: false,
        error: error.message,
        timeSlots: getDefaultTimeSlots(),
      };
    }

    if (!data || !data.config_value) {
      // Return default time slots if not configured
      return {
        success: true,
        timeSlots: getDefaultTimeSlots(),
      };
    }

    const timeSlots = typeof data.config_value === 'string'
      ? JSON.parse(data.config_value)
      : data.config_value;

    return {
      success: true,
      timeSlots: timeSlots || getDefaultTimeSlots(),
    };
  } catch (error) {
    console.error('[Pickup Time Slots] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to fetch pickup time slots',
      timeSlots: getDefaultTimeSlots(),
    };
  }
};

/**
 * Get default time slots
 * 
 * @returns {Array} Default time slots
 */
const getDefaultTimeSlots = () => {
  return [
    { id: '1', startTime: '09:00', endTime: '12:00', label: 'Morning (9 AM - 12 PM)', enabled: true },
    { id: '2', startTime: '12:00', endTime: '15:00', label: 'Afternoon (12 PM - 3 PM)', enabled: true },
    { id: '3', startTime: '15:00', endTime: '18:00', label: 'Evening (3 PM - 6 PM)', enabled: true },
  ];
};

/**
 * Save pickup time slots configuration
 * 
 * @param {Array} timeSlots - Array of time slot objects
 * @returns {Promise<Object>} Result
 */
export const savePickupTimeSlots = async (timeSlots) => {
  try {
    // Validate time slots
    const validation = validateTimeSlots(timeSlots);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Check if configuration exists
    const { data: existing } = await supabaseClient
      .from('system_configuration')
      .select('config_id')
      .eq('config_key', 'pickup_time_slots')
      .single();

    const configValue = JSON.stringify(timeSlots);

    if (existing) {
      // Update existing configuration
      const { error } = await supabaseClient
        .from('system_configuration')
        .update({
          config_value: configValue,
          updated_at: new Date().toISOString(),
        })
        .eq('config_key', 'pickup_time_slots');

      if (error) {
        console.error('[Pickup Time Slots] Error updating slots:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    } else {
      // Insert new configuration
      const { error } = await supabaseClient
        .from('system_configuration')
        .insert([{
          config_key: 'pickup_time_slots',
          config_value: configValue,
          description: 'Available pickup time slots for customer orders',
        }]);

      if (error) {
        console.error('[Pickup Time Slots] Error inserting slots:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    console.log('[Pickup Time Slots] Saved successfully');

    return {
      success: true,
      message: 'Time slots saved successfully',
    };
  } catch (error) {
    console.error('[Pickup Time Slots] Unexpected error:', error);
    return {
      success: false,
      error: 'Failed to save pickup time slots',
    };
  }
};

/**
 * Validate time slots configuration
 * 
 * @param {Array} timeSlots - Array of time slot objects
 * @returns {Object} Validation result
 */
export const validateTimeSlots = (timeSlots) => {
  if (!Array.isArray(timeSlots)) {
    return {
      valid: false,
      error: 'Time slots must be an array',
    };
  }

  if (timeSlots.length === 0) {
    return {
      valid: false,
      error: 'At least one time slot is required',
    };
  }

  // Validate each time slot
  for (let i = 0; i < timeSlots.length; i++) {
    const slot = timeSlots[i];

    if (!slot.startTime || !slot.endTime) {
      return {
        valid: false,
        error: `Time slot ${i + 1}: Start time and end time are required`,
      };
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
      return {
        valid: false,
        error: `Time slot ${i + 1}: Invalid time format (use HH:MM)`,
      };
    }

    // Validate end time is after start time
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);

    if (end <= start) {
      return {
        valid: false,
        error: `Time slot ${i + 1}: End time must be after start time`,
      };
    }

    // Check for overlaps with other enabled slots
    if (slot.enabled !== false) {
      for (let j = 0; j < timeSlots.length; j++) {
        if (i !== j && timeSlots[j].enabled !== false) {
          const otherStart = timeToMinutes(timeSlots[j].startTime);
          const otherEnd = timeToMinutes(timeSlots[j].endTime);

          // Check if slots overlap
          if ((start < otherEnd && end > otherStart)) {
            return {
              valid: false,
              error: `Time slot ${i + 1} overlaps with time slot ${j + 1}`,
            };
          }
        }
      }
    }
  }

  return {
    valid: true,
  };
};

/**
 * Convert time string (HH:MM) to minutes since midnight
 * 
 * @param {string} timeString - Time in HH:MM format
 * @returns {number} Minutes since midnight
 */
const timeToMinutes = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Format time range for display
 * 
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {string} Formatted time range
 */
export const formatTimeRange = (startTime, endTime) => {
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

/**
 * Get enabled time slots only
 * 
 * @returns {Promise<Object>} Result with enabled time slots
 */
export const getEnabledTimeSlots = async () => {
  const result = await getPickupTimeSlots();
  
  if (result.success) {
    const enabledSlots = result.timeSlots.filter(slot => slot.enabled !== false);
    return {
      success: true,
      timeSlots: enabledSlots,
    };
  }

  return result;
};

/**
 * Check if a time slot exists
 * 
 * @param {string} time - Time to check (HH:MM format)
 * @returns {Promise<boolean>} True if time is within an enabled slot
 */
export const isValidPickupTime = async (time) => {
  const result = await getEnabledTimeSlots();
  
  if (!result.success) {
    return false;
  }

  const timeMinutes = timeToMinutes(time);

  for (const slot of result.timeSlots) {
    const startMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);

    if (timeMinutes >= startMinutes && timeMinutes < endMinutes) {
      return true;
    }
  }

  return false;
};

