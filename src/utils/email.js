/**
 * Email Utility
 * 
 * IMPORTANT: This utility is designed for SERVER-SIDE use only.
 * Email sending cannot happen directly from the browser for security reasons.
 * 
 * Deployment Options:
 * 1. Supabase Edge Functions (recommended)
 * 2. Express.js server endpoint
 * 3. Netlify/Vercel serverless functions
 * 
 * For now, this file provides the email templates and a client-side
 * function to call your backend email API.
 */

/**
 * Client-side function to request password reset email
 * This calls your backend API which will send the email
 * 
 * @param {string} email - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's first name
 * @returns {Promise<boolean>} Success status
 */
export const sendPasswordResetEmail = async (email, resetToken, userName) => {
  try {
    // For development: Log the reset link instead of sending email
    // ⚠️ WARNING: This logs sensitive reset tokens - DEVELOPMENT MODE ONLY
    // These logs are automatically disabled in production builds
    if (import.meta.env.DEV || import.meta.env.VITE_EMAIL_DEBUG === 'true') {
      const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}`;
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 PASSWORD RESET EMAIL (Development Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${email}`);
      console.log(`Name: ${userName}`);
      console.log('');
      console.log('🔗 RESET LINK (copy from console, not alert):');
      console.log(resetUrl);
      console.log('');
      console.log('Token:', resetToken); // ⚠️ SENSITIVE - Dev only
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('⚠️  On mobile: Copy the URL from the console above');
      console.log('    Do NOT copy from the alert (it may add line breaks)');
      console.log('');
      
      // Show simple alert - user should copy from console
      alert(`Password reset link sent!\n\nTo: ${email}\n\n⚠️ IMPORTANT:\nOpen your browser console to copy the reset link.\nDo NOT copy from this alert as it may wrap the URL incorrectly.`);
      
      return true;
    }

    // Production: Call Supabase Edge Function
    const response = await fetch('https://chxflnoqbapoywpibeba.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        type: 'password_reset',
        email, 
        resetToken, 
        userName 
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

/**
 * Client-side function to send welcome email to new user
 * 
 * @param {string} email - Recipient email
 * @param {string} userName - User's first name
 * @param {string} username - User's username
 * @param {string} tempPassword - Temporary password
 * @returns {Promise<boolean>} Success status
 */
export const sendWelcomeEmail = async (email, userName, username, tempPassword) => {
  try {
    // For development: Log the credentials instead of sending email
    // ⚠️ WARNING: This logs sensitive passwords - DEVELOPMENT MODE ONLY
    // These logs are automatically disabled in production builds
    if (import.meta.env.DEV || import.meta.env.VITE_EMAIL_DEBUG === 'true') {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 WELCOME EMAIL (Development Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${email}`);
      console.log(`Name: ${userName}`);
      console.log(`Username: ${username}`);
      console.log(`Temporary Password: ${tempPassword}`); // ⚠️ SENSITIVE - Dev only
      console.log(`Login URL: ${window.location.origin}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('⚠️  Save these credentials to log in');
      console.log('');
      
      // Show alert with credentials
      alert(`Welcome Email (Development Mode)\n\nUsername: ${username}\nPassword: ${tempPassword}\n\nCredentials also logged to console.`);
      
      return true;
    }

    // Production: Call Supabase Edge Function
    const response = await fetch('https://chxflnoqbapoywpibeba.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        type: 'welcome',
        email, 
        userName, 
        username, 
        tempPassword 
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Client-side function to send password changed notification
 * 
 * @param {string} email - Recipient email
 * @param {string} userName - User's first name
 * @param {string} changedBy - Who changed the password ('self' or 'owner_override')
 * @returns {Promise<boolean>} Success status
 */
export const sendPasswordChangedEmail = async (email, userName, changedBy = 'self') => {
  try {
    // For development: Log the notification
    if (import.meta.env.DEV || import.meta.env.VITE_EMAIL_DEBUG === 'true') {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 PASSWORD CHANGED NOTIFICATION (Development Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`To: ${email}`);
      console.log(`Name: ${userName}`);
      console.log(`Changed By: ${changedBy === 'self' ? 'User (self-service)' : 'Administrator (owner override)'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return true;
    }

    // Production: Call Supabase Edge Function
    const response = await fetch('https://chxflnoqbapoywpibeba.supabase.co/functions/v1/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        type: 'password_changed',
        email, 
        userName, 
        changedBy 
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Error sending password changed email:', error);
    return false;
  }
};

/**
 * Generate password reset email HTML
 * This template can be used server-side
 */
export const getPasswordResetEmailTemplate = (userName, resetUrl) => {
  return {
    subject: 'Reset Your Password - Ayubo Cafe',
    text: `Hi ${userName},

We received a request to reset your password for your Ayubo Cafe account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email or contact your administrator if you have concerns.

Thank you,
Ayubo Cafe Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(to right, #2563eb, #1d4ed8); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Ayubo Cafe</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0;">Reset Your Password</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                We received a request to reset your password for your Ayubo Cafe account. Click the button below to reset your password:
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(to right, #2563eb, #1d4ed8); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Reset Password</a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #2563eb; font-size: 14px; word-break: break-all; margin: 10px 0 20px 0;">
                ${resetUrl}
              </p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  <strong>⚠️ Important:</strong> This link will expire in <strong>1 hour</strong>.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you didn't request a password reset, please ignore this email or contact your administrator if you have concerns.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2025 Ayubo Cafe. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
  };
};

/**
 * Generate welcome email HTML
 */
export const getWelcomeEmailTemplate = (userName, username, tempPassword, loginUrl) => {
  return {
    subject: 'Welcome to Ayubo Cafe - Your Account Details',
    text: `Hi ${userName},

Welcome to Ayubo Cafe! Your account has been created.

Your login credentials:
Username: ${username}
Temporary Password: ${tempPassword}

Login here: ${loginUrl}

For security reasons, please change your password after your first login.

Thank you,
Ayubo Cafe Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(to right, #10b981, #059669); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to Ayubo Cafe! 🎉</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your account has been successfully created! Here are your login credentials:
              </p>
              
              <!-- Credentials Box -->
              <div style="background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="color: #1e40af; font-size: 14px; margin: 0 0 10px 0;">
                  <strong>Username:</strong>
                </p>
                <p style="color: #1f2937; font-size: 18px; font-family: monospace; margin: 0 0 20px 0; font-weight: bold;">
                  ${username}
                </p>
                <p style="color: #1e40af; font-size: 14px; margin: 0 0 10px 0;">
                  <strong>Temporary Password:</strong>
                </p>
                <p style="color: #1f2937; font-size: 18px; font-family: monospace; margin: 0; font-weight: bold;">
                  ${tempPassword}
                </p>
              </div>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${loginUrl}" style="background: linear-gradient(to right, #10b981, #059669); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Login Now</a>
                  </td>
                </tr>
              </table>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  <strong>🔒 Security Tip:</strong> Please change your password after your first login for security.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you have any questions, please contact your administrator.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2025 Ayubo Cafe. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
  };
};

/**
 * Generate password changed notification email HTML
 */
export const getPasswordChangedEmailTemplate = (userName, changedBy) => {
  const isOwnerReset = changedBy === 'owner_override';
  
  return {
    subject: 'Your Password Has Been Changed - Ayubo Cafe',
    text: `Hi ${userName},

This is a security notification to let you know that your password has been ${isOwnerReset ? 'reset by an administrator' : 'changed'}.

${isOwnerReset ? 'If you did not request this password reset, please contact your administrator immediately.' : 'If you did not make this change, please contact your administrator immediately.'}

All your active sessions have been logged out for security.

Thank you,
Ayubo Cafe Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(to right, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔒 Security Notification</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0;">Password Changed</h2>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                This is a security notification to let you know that your password has been <strong>${isOwnerReset ? 'reset by an administrator' : 'changed'}</strong>.
              </p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                  <strong>⚠️ Important:</strong> All your active sessions have been logged out for security.
                </p>
              </div>
              
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                <strong>What changed:</strong>
              </p>
              <ul style="color: #4b5563; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0;">
                <li>Your password has been updated</li>
                <li>All devices have been logged out</li>
                <li>You'll need to log in again</li>
              </ul>
              
              <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <p style="color: #991b1b; font-size: 14px; margin: 0;">
                  <strong>🚨 Didn't make this change?</strong> Please contact your administrator immediately.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                This is an automated security notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2025 Ayubo Cafe. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
  };
};

