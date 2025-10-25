/**
 * SMS Client for OTP Delivery
 * 
 * Sends SMS messages via webhook integration for OTP verification.
 * Supports test mode for development (logs to console instead of sending).
 * 
 * @module utils/sms
 */

/**
 * SMS configuration from environment variables
 */
const SMS_CONFIG = {
  enabled: import.meta.env.VITE_SMS_ENABLED === 'true',
  webhookUrl: import.meta.env.VITE_SMS_WEBHOOK_URL || '',
  webhookKey: import.meta.env.VITE_SMS_WEBHOOK_KEY || '',
  fromNumber: import.meta.env.VITE_SMS_FROM_NUMBER || 'Ayubo Cafe',
  debug: import.meta.env.VITE_SMS_DEBUG === 'true',
};

/**
 * Check if SMS is configured and enabled
 * @returns {boolean} True if SMS is ready to send
 */
export const isSMSConfigured = () => {
  return SMS_CONFIG.enabled && SMS_CONFIG.webhookUrl && SMS_CONFIG.webhookKey;
};

/**
 * Send SMS via webhook
 * 
 * @param {Object} smsData - SMS configuration
 * @param {string} smsData.to - Recipient phone number (+94XXXXXXXXX format)
 * @param {string} smsData.message - SMS message content
 * @param {string} [smsData.type] - Message type (for logging)
 * @returns {Promise<Object>} Result of SMS send
 * 
 * @example
 * const result = await sendSMS({
 *   to: '+94771234567',
 *   message: 'Your OTP is: 123456',
 *   type: 'otp'
 * });
 */
export async function sendSMS({ to, message, type = 'generic' }) {
  try {
    // Validate inputs
    if (!to || !message) {
      throw new Error('Recipient phone number and message are required');
    }

    // Validate phone number format (basic check)
    if (!/^\+94[0-9]{9}$/.test(to)) {
      throw new Error('Invalid phone number format. Must be +94XXXXXXXXX');
    }

    // Debug logging
    if (SMS_CONFIG.debug) {
      console.log('[SMS Client] Debug - SMS data:', {
        to,
        message: message.substring(0, 50) + '...', // Truncate for security
        type,
        configured: isSMSConfigured(),
      });
    }

    // Check if SMS is configured
    if (!isSMSConfigured()) {
      // Development/Test mode - log to console instead of sending
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📱 [SMS Client] TEST MODE - SMS NOT ACTUALLY SENT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${to}`);
      console.log(`Type: ${type}`);
      console.log(`Message: ${message}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('💡 To enable real SMS:');
      console.log('   1. Set VITE_SMS_ENABLED=true in .env');
      console.log('   2. Configure VITE_SMS_WEBHOOK_URL');
      console.log('   3. Configure VITE_SMS_WEBHOOK_KEY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      return {
        success: true,
        devMode: true,
        message: 'SMS logged to console (test mode)',
        to,
        type,
      };
    }

    // Production mode - send via webhook
    const response = await fetch(SMS_CONFIG.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SMS_CONFIG.webhookKey}`,
        'X-SMS-Type': type,
      },
      body: JSON.stringify({
        to,
        message,
        from: SMS_CONFIG.fromNumber,
        type,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `SMS webhook returned ${response.status}`);
    }

    console.log('[SMS Client] SMS sent successfully to', to);

    return {
      success: true,
      devMode: false,
      messageId: result.messageId || result.id,
      to,
      type,
    };

  } catch (error) {
    console.error('[SMS Client] Error sending SMS:', error);
    throw error;
  }
}

/**
 * Send OTP via SMS
 * 
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} otpCode - 6-digit OTP code
 * @param {number} expiryMinutes - OTP expiry time in minutes
 * @returns {Promise<Object>} Result of SMS send
 * 
 * @example
 * const result = await sendOTPSMS('+94771234567', '123456', 10);
 */
export async function sendOTPSMS(phoneNumber, otpCode, expiryMinutes = 10) {
  const message = `Your Ayubo Cafe verification code is: ${otpCode}

This code will expire in ${expiryMinutes} minutes.

Do not share this code with anyone.`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'otp',
  });
}

/**
 * Send order notification via SMS
 * 
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} orderNumber - Order number
 * @param {string} status - Order status
 * @returns {Promise<Object>} Result of SMS send
 */
export async function sendOrderNotificationSMS(phoneNumber, orderNumber, status) {
  let message = '';

  switch (status) {
    case 'confirmed':
      message = `Your order ${orderNumber} has been confirmed! We'll notify you when it's ready for pickup.`;
      break;
    case 'in_preparation':
      message = `Good news! Your order ${orderNumber} is now being prepared.`;
      break;
    case 'ready_for_pickup':
      message = `Your order ${orderNumber} is ready for pickup! Visit us to collect your order.`;
      break;
    case 'completed':
      message = `Thank you! Your order ${orderNumber} is complete. We hope you enjoy your treats!`;
      break;
    case 'cancelled':
      message = `Your order ${orderNumber} has been cancelled. Contact us if you have any questions.`;
      break;
    default:
      message = `Order ${orderNumber} status update: ${status}`;
  }

  message += '\n\n- Ayubo Cafe';

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'order_notification',
  });
}

/**
 * Send custom cake quote notification via SMS
 * 
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} requestId - Custom request ID
 * @param {number} quotedPrice - Quoted price
 * @returns {Promise<Object>} Result of SMS send
 */
export async function sendQuoteNotificationSMS(phoneNumber, requestId, quotedPrice) {
  const message = `Your custom cake quote is ready! 

Request ID: ${requestId}
Price: Rs. ${quotedPrice.toLocaleString()}

Log in to your account to view details and approve the quote.

- Ayubo Cafe`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'quote_notification',
  });
}

/**
 * Send payment confirmation via SMS
 * 
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} orderNumber - Order number
 * @param {number} amount - Payment amount
 * @param {string} paymentType - 'deposit' or 'full'
 * @returns {Promise<Object>} Result of SMS send
 */
export async function sendPaymentConfirmationSMS(phoneNumber, orderNumber, amount, paymentType = 'deposit') {
  const message = `Payment received! 

Order: ${orderNumber}
Amount: Rs. ${amount.toLocaleString()}
Type: ${paymentType === 'deposit' ? 'Deposit (40%)' : 'Full Payment'}

${paymentType === 'deposit' ? 'Remaining balance due at pickup.' : 'Your order is fully paid.'}

- Ayubo Cafe`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'payment_confirmation',
  });
}

/**
 * Send reminder SMS
 * 
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} orderNumber - Order number
 * @param {string} pickupDate - Pickup date
 * @param {string} pickupTime - Pickup time
 * @returns {Promise<Object>} Result of SMS send
 */
export async function sendPickupReminderSMS(phoneNumber, orderNumber, pickupDate, pickupTime) {
  const message = `Reminder: Your order ${orderNumber} is scheduled for pickup tomorrow!

Date: ${pickupDate}
Time: ${pickupTime}

See you soon!
- Ayubo Cafe`;

  return sendSMS({
    to: phoneNumber,
    message,
    type: 'reminder',
  });
}

/**
 * Validate SMS webhook configuration
 * Returns detailed status of SMS configuration
 * 
 * @returns {Object} Configuration status
 */
export function validateSMSConfig() {
  return {
    enabled: SMS_CONFIG.enabled,
    webhookConfigured: !!SMS_CONFIG.webhookUrl,
    keyConfigured: !!SMS_CONFIG.webhookKey,
    fromNumber: SMS_CONFIG.fromNumber,
    ready: isSMSConfigured(),
    debugMode: SMS_CONFIG.debug,
    message: isSMSConfigured() 
      ? 'SMS is configured and ready' 
      : 'SMS is in test mode - messages will be logged to console',
  };
}

/**
 * Test SMS functionality
 * Sends a test message to verify configuration
 * 
 * @param {string} phoneNumber - Test recipient phone number
 * @returns {Promise<Object>} Test result
 */
export async function testSMSConnection(phoneNumber) {
  try {
    const result = await sendSMS({
      to: phoneNumber,
      message: 'This is a test message from Ayubo Cafe SMS system. Configuration is working!',
      type: 'test',
    });

    return {
      success: true,
      configured: isSMSConfigured(),
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      configured: isSMSConfigured(),
    };
  }
}

// Export configuration for use in other modules
export { SMS_CONFIG };

