/**
 * Netlify Function: Process Payment
 * 
 * Server-side function to create Stripe checkout sessions.
 * This keeps the Stripe secret key secure on the server.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const {
      order_id,
      order_number,
      payment_id,
      amount,
      payment_type,
      customer_email,
    } = JSON.parse(event.body);

    // Validate required fields
    if (!order_id || !payment_id || !amount || !payment_type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Validate amount
    const amountInCents = Math.round(parseFloat(amount) * 100);
    if (amountInCents < 50) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Amount must be at least Rs. 0.50' }),
      };
    }

    // Determine payment description
    let description = `Order ${order_number || order_id}`;
    if (payment_type === 'deposit') {
      description += ' - Deposit Payment (40%)';
    } else if (payment_type === 'balance') {
      description += ' - Balance Payment (60%)';
    } else if (payment_type === 'full') {
      description += ' - Full Payment';
    }

    // Get the base URL from the request
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers['host'];
    const baseUrl = `${protocol}://${host}`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'lkr',
            product_data: {
              name: description,
              description: `Payment for ${payment_type} of order ${order_number || order_id}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&payment_id=${payment_id}`,
      cancel_url: `${baseUrl}/payment-cancelled?order_id=${order_id}`,
      customer_email: customer_email || undefined,
      metadata: {
        order_id,
        payment_id,
        payment_type,
      },
      // Enable automatic tax calculation if configured
      // automatic_tax: { enabled: true },
    });

    console.log('[Process Payment] Checkout session created:', session.id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.id,
      }),
    };
  } catch (error) {
    console.error('[Process Payment] Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: error.message || 'Failed to create payment session',
      }),
    };
  }
};

