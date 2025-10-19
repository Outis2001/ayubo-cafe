// Netlify Serverless Function for Email Sending
// This runs on Netlify's servers, not in the browser

import nodemailer from 'nodemailer';

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { to, subject, html, type } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !subject || !html) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, html' })
      };
    }

    // Email configuration from environment variables
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    };

    // Check if email is enabled
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('[Email] Email not configured. Would send:', { to, subject, type });
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Email not configured (dev mode)',
          devMode: true
        })
      };
    }

    // Create transporter
    const transporter = nodemailer.createTransport(emailConfig);

    // Verify connection
    await transporter.verify();

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Ayubo Cafe" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    console.log('[Email] Sent successfully:', info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        messageId: info.messageId 
      })
    };

  } catch (error) {
    console.error('[Email] Error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send email',
        message: error.message 
      })
    };
  }
};

