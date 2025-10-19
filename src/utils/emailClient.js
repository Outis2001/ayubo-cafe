/**
 * Email Client for Netlify Functions
 * 
 * This replaces direct nodemailer usage and calls the Netlify Function instead.
 * Works both in development (local) and production (Netlify).
 */

/**
 * Send an email via Netlify Function
 * @param {Object} emailData - Email configuration
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - HTML content
 * @param {string} emailData.type - Email type (for logging)
 * @returns {Promise<Object>} Result of email send
 */
export async function sendEmail({ to, subject, html, type = 'generic' }) {
  try {
    // In development, you can use local Netlify CLI
    // In production, this will use the deployed function
    const functionUrl = '/.netlify/functions/send-email';
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        type
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }

    if (result.devMode) {
      console.log('[Email Client] Dev mode - email not actually sent');
    } else {
      console.log('[Email Client] Email sent successfully');
    }

    return result;

  } catch (error) {
    console.error('[Email Client] Error:', error);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, resetUrl) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You requested to reset your password for your Ayubo Cafe account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated email from Ayubo Cafe. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request - Ayubo Cafe',
    html,
    type: 'password_reset'
  });
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email, firstName, username, tempPassword) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .credentials { background-color: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Ayubo Cafe!</h1>
        </div>
        <div class="content">
          <p>Hello ${firstName},</p>
          <p>Your account has been created. Here are your login credentials:</p>
          <div class="credentials">
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p><strong>Important:</strong> Please change your password after your first login.</p>
          <p>You can log in at: ${process.env.VITE_APP_URL || 'your-site-url'}</p>
        </div>
        <div class="footer">
          <p>This is an automated email from Ayubo Cafe. Please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Ayubo Cafe - Your Account Details',
    html,
    type: 'welcome'
  });
}

