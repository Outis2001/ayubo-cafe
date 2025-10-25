/**
 * Netlify Function: Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for payment processing.
 * Securely verifies webhook signatures and processes payment events.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for server-side operations
);

// Webhook secret for signature verification
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Log audit event
 */
const logAudit = async (action, targetType, targetId, details, status) => {
  try {
    await supabase.from('audit_logs').insert([{
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      status,
      created_at: new Date().toISOString(),
    }]);
  } catch (error) {
    console.error('[Webhook] Error logging audit:', error);
  }
};

/**
 * Handle payment succeeded event
 */
const handlePaymentSucceeded = async (session) => {
  try {
    const { order_id, payment_id, payment_type } = session.metadata;

    console.log('[Webhook] Payment succeeded:', {
      session_id: session.id,
      payment_id,
      order_id,
    });

    // Update payment record
    const { error: paymentError } = await supabase
      .from('customer_payments')
      .update({
        payment_status: 'success',
        stripe_payment_intent_id: session.payment_intent,
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', payment_id);

    if (paymentError) {
      throw new Error(`Failed to update payment: ${paymentError.message}`);
    }

    // Update order status to payment_verified
    const { error: orderError } = await supabase
      .from('customer_orders')
      .update({
        status: 'payment_verified',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order_id);

    if (orderError) {
      throw new Error(`Failed to update order: ${orderError.message}`);
    }

    // Check if order is now fully paid
    const { data: payments } = await supabase
      .from('customer_payments')
      .select('payment_type')
      .eq('order_id', order_id)
      .eq('payment_status', 'success')
      .in('payment_type', ['deposit', 'balance', 'full']);

    const paymentTypes = payments.map(p => p.payment_type);
    const fullyPaid = 
      paymentTypes.includes('full') || 
      (paymentTypes.includes('deposit') && paymentTypes.includes('balance'));

    if (fullyPaid) {
      await supabase
        .from('customer_orders')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', order_id);
    }

    // Get customer info for notification
    const { data: order } = await supabase
      .from('customer_orders')
      .select('customer_id, order_number')
      .eq('order_id', order_id)
      .single();

    // Send notification to customer
    if (order) {
      await supabase
        .from('customer_notifications')
        .insert([{
          customer_id: order.customer_id,
          notification_type: 'payment_success',
          title: 'Payment Successful',
          message: `Your ${payment_type} payment for order ${order.order_number} has been confirmed. Thank you!`,
          related_type: 'customer_order',
          related_id: order_id,
          is_read: false,
        }]);
    }

    // Log audit event
    await logAudit(
      'payment_succeeded',
      'customer_payment',
      payment_id,
      {
        order_id,
        payment_type,
        session_id: session.id,
        amount: session.amount_total / 100,
      },
      'success'
    );

    return { success: true };
  } catch (error) {
    console.error('[Webhook] Error handling payment success:', error);
    
    await logAudit(
      'payment_processing_failed',
      'customer_payment',
      session.metadata.payment_id,
      {
        error: error.message,
        session_id: session.id,
      },
      'failure'
    );

    throw error;
  }
};

/**
 * Handle payment failed event
 */
const handlePaymentFailed = async (session) => {
  try {
    const { order_id, payment_id, payment_type } = session.metadata;

    console.log('[Webhook] Payment failed:', {
      session_id: session.id,
      payment_id,
      order_id,
    });

    // Update payment record
    const { error: paymentError } = await supabase
      .from('customer_payments')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', payment_id);

    if (paymentError) {
      throw new Error(`Failed to update payment: ${paymentError.message}`);
    }

    // Get customer info for notification
    const { data: order } = await supabase
      .from('customer_orders')
      .select('customer_id, order_number')
      .eq('order_id', order_id)
      .single();

    // Send notification to customer
    if (order) {
      await supabase
        .from('customer_notifications')
        .insert([{
          customer_id: order.customer_id,
          notification_type: 'payment_failed',
          title: 'Payment Failed',
          message: `Your ${payment_type} payment for order ${order.order_number} could not be processed. Please try again or contact support.`,
          related_type: 'customer_order',
          related_id: order_id,
          is_read: false,
        }]);
    }

    // Log audit event
    await logAudit(
      'payment_failed',
      'customer_payment',
      payment_id,
      {
        order_id,
        payment_type,
        session_id: session.id,
      },
      'failure'
    );

    return { success: true };
  } catch (error) {
    console.error('[Webhook] Error handling payment failure:', error);
    throw error;
  }
};

/**
 * Main webhook handler
 */
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const sig = event.headers['stripe-signature'];

  let stripeEvent;

  try {
    // Verify webhook signature
    if (!webhookSecret) {
      console.warn('[Webhook] No webhook secret configured, skipping signature verification');
      stripeEvent = JSON.parse(event.body);
    } else {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        webhookSecret
      );
    }

    console.log('[Webhook] Received event:', stripeEvent.type);

    // Handle the event
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;

      case 'checkout.session.async_payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;

      case 'checkout.session.async_payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;

      case 'checkout.session.expired':
        console.log('[Webhook] Checkout session expired:', stripeEvent.data.object.id);
        // Optionally handle expired sessions
        break;

      default:
        console.log('[Webhook] Unhandled event type:', stripeEvent.type);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('[Webhook] Error:', error);

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message || 'Webhook processing failed',
      }),
    };
  }
};

