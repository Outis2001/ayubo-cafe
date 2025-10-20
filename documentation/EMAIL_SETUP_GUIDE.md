# Email Setup Guide for Ayubo Cafe

This guide explains how to set up email functionality for password reset and user welcome emails.

## 📧 Current Status

**Development Mode:** Email functionality is currently set to **development mode**, which means:
- ✅ All email templates are ready
- ✅ Email functions are integrated into the app
- 📝 Reset links and credentials are logged to the browser console
- 📝 Alert dialogs show the information for easy copying
- ⚠️ **No actual emails are sent**

This is perfect for testing and development!

---

## 🚀 Email Features

### 1. Password Reset Email
- **Triggered by:** User clicking "Forgot Password" and entering email/username
- **Contains:** Secure reset link valid for 1 hour
- **Template:** Professional HTML email with branding

### 2. Welcome Email
- **Triggered by:** Owner creating a new user account
- **Contains:** Username and temporary password
- **Template:** Professional HTML email with login instructions

### 3. Password Changed Notification
- **Triggered by:** Owner resetting a user's password
- **Contains:** Security notification that password was changed
- **Template:** Professional HTML email with security information

---

## 🧪 Testing in Development Mode

### Test Password Reset:
1. Click "Forgot Password" on login screen
2. Enter your email or username
3. Click "Send Reset Link"
4. **Check the browser console** for the reset link
5. An alert dialog will also show the link
6. Copy the link and paste in browser to test password reset

### Test Welcome Email:
1. Login as owner (`owner` / `Sokian@1997`)
2. Navigate to "Users" tab
3. Click "Create User"
4. Fill in user details and password
5. Click "Create User"
6. **Check the browser console** for the credentials
7. An alert dialog will also show the credentials

### Test Password Changed Notification:
1. Login as owner
2. Navigate to "Users" tab
3. Click the 🔑 button next to a user
4. Reset their password
5. **Check the browser console** for the notification details

---

## 🔧 Production Setup Options

When you're ready to send actual emails in production, choose one of these options:

### **Option 1: Gmail SMTP (Recommended for Small Scale)**

#### Prerequisites:
- A Gmail account
- 2-Factor Authentication enabled

#### Setup Steps:

**Step 1: Enable 2FA on your Google Account**
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"

**Step 2: Generate an App Password**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other" as the device and name it "Ayubo Cafe"
4. Click "Generate"
5. **Copy the 16-character password** (shown once!)

**Step 3: Update Your .env File**
1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and update these values:
   ```env
   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   EMAIL_FROM="Ayubo Cafe <your-email@gmail.com>"
   EMAIL_DEBUG=false
   EMAIL_ENABLED=true
   
   # Application URL (for generating password reset links)
   # Development: http://localhost:3000
   # Production: https://yourdomain.com
   APP_URL=https://yourdomain.com
   ```

**Understanding the Variables:**
- `EMAIL_ENABLED`: Set to `true` to send real emails, `false` for console logging only
- `EMAIL_DEBUG`: Set to `true` to see full email content in console (even when EMAIL_ENABLED=true)
- `APP_URL`: Your application's public URL, used to generate clickable password reset links
  - **Development**: `http://localhost:3000` (or whatever port Vite assigns)
  - **Production**: Your actual domain like:
    - `https://ayubocafe.com`
    - `https://your-app.netlify.app`
    - `https://your-app.vercel.app`

**Step 4: Create a Backend API**

Since this is a client-side React app, you need a backend to send emails. Here are your options:

#### A) Supabase Edge Functions (Recommended) ✅ ACTIVE

**Step 1: Set Supabase Secrets**

Your Edge Function needs access to email credentials. Set these as secrets:

```bash
# Option 1: Using Supabase CLI (Recommended)
supabase secrets set EMAIL_HOST=smtp.gmail.com
supabase secrets set EMAIL_PORT=587
supabase secrets set EMAIL_USER=your-email@gmail.com
supabase secrets set EMAIL_PASSWORD=your-16-char-app-password
supabase secrets set EMAIL_FROM="Ayubo Cafe <your-email@gmail.com>"
supabase secrets set APP_URL=http://localhost:3000

# Option 2: Using Supabase Dashboard
# Go to: Project Settings > Edge Functions > Secrets
# Add each secret one by one
```

**Step 2: Create the Edge Function**

Create file: `supabase/functions/send-email/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get email configuration from environment
    const emailHost = Deno.env.get("EMAIL_HOST");
    const emailPort = Deno.env.get("EMAIL_PORT");
    const emailUser = Deno.env.get("EMAIL_USER");
    const emailPassword = Deno.env.get("EMAIL_PASSWORD");
    const emailFrom = Deno.env.get("EMAIL_FROM");
    const appUrl = Deno.env.get("APP_URL");

    // Check if configuration exists
    if (!emailHost || !emailUser || !emailPassword || !emailFrom) {
      return new Response(
        JSON.stringify({ success: false, error: "Email configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { type, email, resetToken, userName, tempPassword, verificationToken } = await req.json();

    // Initialize SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: emailHost,
        port: parseInt(emailPort || "587"),
        tls: false,
        auth: {
          username: emailUser,
          password: emailPassword,
        },
      },
    });

    let subject = "";
    let html = "";

    // Generate email content based on type
    if (type === "password_reset") {
      const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
      subject = "Password Reset Request - Ayubo Cafe";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #10B981); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; padding: 14px 32px; background: #3B82F6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
              <p>Hi ${userName || 'there'},</p>
              <p>We received a request to reset your password for your Ayubo Cafe account.</p>
              <p>Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link: ${resetLink}</p>
              <p><strong>⚠️ This link expires in 1 hour.</strong></p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Ayubo Cafe. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "welcome") {
      subject = "Welcome to Ayubo Cafe!";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #10B981); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .credentials { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>👋 Welcome!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Your Ayubo Cafe account has been created!</p>
              <div class="credentials">
                <p><strong>Username:</strong> ${userName}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
              </div>
              <p>⚠️ <strong>Important:</strong> Please change your password after first login.</p>
              <p>Login at: ${appUrl}</p>
            </div>
            <div class="footer">
              <p>© 2025 Ayubo Cafe. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "password_changed") {
      subject = "Password Changed - Ayubo Cafe";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #10B981); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Changed</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>This is a confirmation that your Ayubo Cafe password was recently changed.</p>
              <p>If you made this change, no further action is needed.</p>
              <p><strong>⚠️ If you didn't change your password, contact your administrator immediately.</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 Ayubo Cafe. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "email_verification") {
      const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`;
      subject = "Verify Your Email - Ayubo Cafe";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6, #10B981); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; padding: 14px 32px; background: #10B981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📧 Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi ${userName || 'there'},</p>
              <p>Welcome to Ayubo Cafe! Please verify your email address to complete your account setup.</p>
              <p>Click the button below to verify your email:</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link: ${verificationLink}</p>
              <p><strong>⚠️ This link expires in 24 hours.</strong></p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Ayubo Cafe. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email
    await client.send({
      from: emailFrom,
      to: email,
      subject: subject,
      content: html,
      html: html,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Step 3: Deploy the Edge Function**

```bash
supabase functions deploy send-email
```

**Step 4: Already Done! ✅**

Your `src/utils/email.js` is already configured to call this Edge Function.

#### B) Express.js Server

Create a simple Node.js server:

```javascript
// server/emailServer.js
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

app.post('/api/send-password-reset-email', async (req, res) => {
  const { email, resetToken, userName } = req.body;
  
  // Import and use templates from src/utils/email.js
  // Send email using nodemailer
  
  res.json({ success: true });
});

app.listen(3001, () => {
  console.log('Email server running on port 3001');
});
```

Run:
```bash
node server/emailServer.js
```

Update `src/utils/email.js` to call `http://localhost:3001/api/send-password-reset-email`.

#### C) Netlify/Vercel Serverless Functions

Create a serverless function in your deployment platform and follow similar patterns.

---

### **Option 2: Third-Party Email Service (Recommended for Production)**

For production environments, consider using a dedicated email service:

#### SendGrid
- Free tier: 100 emails/day
- Easy API integration
- Great deliverability
- https://sendgrid.com

#### Mailgun
- Free tier: 5,000 emails/month
- Simple API
- Good analytics
- https://mailgun.com

#### AWS SES (Simple Email Service)
- Very low cost ($0.10 per 1,000 emails)
- High volume support
- Requires AWS account
- https://aws.amazon.com/ses

#### Resend
- Modern email API
- Simple pricing
- Great developer experience
- https://resend.com

**To use these services:**
1. Sign up for an account
2. Get your API key
3. Update `src/utils/email.js` to use their API instead of SMTP
4. Most provide client SDKs for easy integration

---

## 📝 Email Templates

All email templates are defined in `src/utils/email.js`:

- `getPasswordResetEmailTemplate()` - Password reset with button
- `getWelcomeEmailTemplate()` - Welcome with credentials
- `getPasswordChangedEmailTemplate()` - Security notification

These templates are:
- ✅ Fully responsive (mobile-friendly)
- ✅ Professional HTML design
- ✅ Include plain text fallback
- ✅ Match Ayubo Cafe branding (blue/green theme)
- ✅ Include security warnings

You can customize these templates by editing `src/utils/email.js`.

---

## 🔍 Troubleshooting

### Emails not appearing in console?
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for lines starting with `📧`
4. Check that `EMAIL_DEBUG=true` in your `.env`

### Gmail SMTP not working?
1. Ensure 2FA is enabled
2. Use App Password, NOT your regular password
3. Check that your Gmail account isn't blocking "less secure apps"
4. Try port 465 with `EMAIL_SECURE=true`

### Rate limiting?
- Gmail SMTP: 500 emails/day limit
- Consider a dedicated email service for high volume

---

## 📊 Monitoring

In production, monitor:
- Email delivery rates
- Bounce rates
- User complaints
- API quotas/limits

Add logging to track:
- Emails sent successfully
- Email failures
- Retry attempts

---

## 🔒 Security Best Practices

1. **Never commit .env files** - Already in `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Rotate App Passwords** regularly
4. **Monitor for abuse** - implement rate limiting
5. **Use SPF/DKIM records** for better deliverability
6. **Log all email sends** to audit_logs table

---

## 📚 Next Steps

1. **Test in development** using console logging (current setup)
2. **Choose a production option** based on your scale
3. **Set up backend API** (Supabase Edge Functions recommended)
4. **Configure email service** with your chosen provider
5. **Update EMAIL_DEBUG=false** in production `.env`
6. **Test thoroughly** before going live
7. **Monitor delivery** and adjust as needed

---

## 💡 Tips

- **Development:** Keep `EMAIL_DEBUG=true` to avoid sending test emails
- **Staging:** Use a test email service like Mailtrap.io
- **Production:** Use a professional service like SendGrid or AWS SES
- **Testing:** Always test with real email addresses before launch
- **Deliverability:** Add SPF and DKIM DNS records for your domain

---

## 🆘 Need Help?

- Check Supabase documentation for Edge Functions
- Review Nodemailer documentation for SMTP setup
- Test emails with Mailtrap.io before production
- Consider hiring a DevOps engineer for production email setup

---

**Current Version:** 1.0  
**Last Updated:** October 19, 2025  
**Status:** ✅ Development Mode Active

