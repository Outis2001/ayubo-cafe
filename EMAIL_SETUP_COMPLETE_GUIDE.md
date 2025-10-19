# 📧 Complete Email Setup Guide - Ayubo Cafe

**Status:** ✅ WORKING - Last Updated: October 19, 2025

This guide provides step-by-step instructions to set up email functionality for password resets, welcome emails, and password change notifications in Ayubo Cafe.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Gmail SMTP Setup (Current Working Solution)](#gmail-smtp-setup-current-working-solution)
4. [Supabase Edge Function Setup](#supabase-edge-function-setup)
5. [Testing](#testing)
6. [Alternative: Resend API](#alternative-resend-api)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The email system uses:
- **Backend:** Supabase Edge Functions (Deno runtime)
- **Email Service:** Gmail SMTP (port 465 with SSL)
- **SMTP Library:** `denomailer@1.6.0`
- **Features:**
  - Password reset emails with secure token links
  - Welcome emails for new users
  - Password change notifications

---

## Prerequisites

✅ You need:
1. A Gmail account
2. Google 2-Factor Authentication enabled
3. A Supabase project
4. Supabase CLI installed (optional, can use dashboard)

---

## Gmail SMTP Setup (Current Working Solution)

### Step 1: Enable 2-Factor Authentication

1. Go to https://myaccount.google.com/security
2. Enable **"2-Step Verification"**
3. Follow the prompts to set it up

### Step 2: Generate Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Sign in if prompted
3. Under "Select app", choose **"Mail"**
4. Under "Select device", choose **"Other"** and type: `Ayubo Cafe`
5. Click **"Generate"**
6. **Copy the 16-character password** (format: `xxxx xxxx xxxx xxxx`)
   - ⚠️ **Important:** This password is shown ONLY ONCE!
   - Save it securely (you'll need it in the next step)

### Step 3: Set Supabase Secrets

**Important:** Environment variables in Supabase Edge Functions must be set as **Supabase Secrets**, NOT in your local `.env` file.

#### Option A: Using Supabase Dashboard (Easier)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Project Settings** (gear icon) → **Edge Functions** → **Secrets**
4. Click **"New Secret"** and add these 6 secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `EMAIL_HOST` | `smtp.gmail.com` | `smtp.gmail.com` |
| `EMAIL_PORT` | `465` | `465` |
| `EMAIL_USER` | Your Gmail address | `benujith@gmail.com` |
| `EMAIL_PASSWORD` | Your 16-char App Password | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Your Gmail address (plain) | `benujith@gmail.com` |
| `APP_URL` | Your app URL | `http://192.168.1.5:3000` |

**Critical Notes:**
- ✅ `EMAIL_PORT` must be `465` (NOT 587)
- ✅ `EMAIL_FROM` must be PLAIN email address (no "Name <email>" format)
- ✅ `EMAIL_PASSWORD` is the 16-character App Password, NOT your Gmail password
- ✅ `APP_URL` should be your local IP for mobile testing, or domain for production

#### Option B: Using Supabase CLI

```bash
# Run these commands in your terminal
supabase secrets set EMAIL_HOST=smtp.gmail.com
supabase secrets set EMAIL_PORT=465
supabase secrets set EMAIL_USER=your-email@gmail.com
supabase secrets set EMAIL_PASSWORD=your-16-char-app-password
supabase secrets set EMAIL_FROM=your-email@gmail.com
supabase secrets set APP_URL=http://192.168.1.5:3000
```

---

## Supabase Edge Function Setup

### Step 1: Create the Edge Function

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **"Create a new function"**
3. Name it: `send-email`
4. Click **"Create function"**

### Step 2: Add the Function Code

Copy the code below and paste it into your Edge Function:

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
    const { type, email, resetToken, userName, tempPassword } = await req.json();

    // Initialize SMTP client with Gmail SSL configuration
    const client = new SMTPClient({
      connection: {
        hostname: emailHost,
        port: parseInt(emailPort || "465"),
        tls: true,  // SSL enabled for port 465
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

### Step 3: Deploy the Function

1. Click **"Deploy"** or **"Save"** in the Supabase dashboard
2. Wait 10-20 seconds for deployment to complete
3. The function will be available at: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-email`

---

## Testing

### Test 1: Password Reset Email

1. Open your app in the browser
2. Click **"Forgot Password?"**
3. Enter your email address
4. Click **"Send Reset Link"**
5. **Check your Gmail inbox** - you should receive an email within seconds
6. Click the reset link to verify it works

### Test 2: Welcome Email (Create New User)

1. Login as owner (`owner` / `Sokian@1997`)
2. Navigate to **"Users"** tab
3. Click **"Create User"**
4. Fill in user details
5. Click **"Create User"**
6. **Check the new user's email** - they should receive welcome credentials

### Test 3: Password Changed Notification

1. Login as owner
2. Go to **"Users"** tab
3. Click the 🔑 icon next to a user
4. Reset their password
5. **Check that user's email** - they should receive a notification

---

## Alternative: Resend API

If Gmail SMTP doesn't work for you, or for production use, consider **Resend API**:

### Why Resend?

- ✅ More reliable than SMTP
- ✅ Free tier: 3,000 emails/month
- ✅ Built for serverless/edge functions
- ✅ No SMTP complexity
- ✅ Better deliverability

### Setup Steps

1. **Sign up:** https://resend.com (free)
2. **Get API Key:** Dashboard → API Keys → Create
3. **Set Supabase Secret:**
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxx
   supabase secrets set EMAIL_FROM=your-email@gmail.com
   supabase secrets set APP_URL=http://192.168.1.5:3000
   ```
4. **Update Edge Function:** Use the code from `EDGE_FUNCTION_RESEND.txt`
5. **Deploy**

---

## Troubleshooting

### Problem: "Email configuration missing"

**Solution:** You forgot to set Supabase secrets. Go to Project Settings → Edge Functions → Secrets and add all 6 required secrets.

### Problem: "Invalid email address"

**Solution:** Your `EMAIL_FROM` is formatted incorrectly. Use plain email: `user@gmail.com`, NOT `"Name <user@gmail.com>"`.

### Problem: "received corrupt message of type InvalidContentType"

**Solutions:**
1. Change `EMAIL_PORT` from `587` to `465`
2. Or switch to Resend API (recommended)

### Problem: Not receiving emails

**Check:**
1. ✅ Gmail spam folder
2. ✅ All 6 Supabase secrets are set correctly
3. ✅ App Password (16 chars) is correct, not your Gmail password
4. ✅ Edge Function logs in Supabase dashboard for error messages
5. ✅ Browser console for client-side errors

### Problem: Emails work on laptop but not on mobile

**Solution:** Update `APP_URL` secret to your local network IP:
```bash
# Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
supabase secrets set APP_URL=http://192.168.1.5:3000
```

---

## Development vs Production

### Development Mode (Console Logging)

In your local `.env` file:
```env
VITE_EMAIL_ENABLED=false
VITE_EMAIL_DEBUG=true
```

This will:
- ✅ Log reset links to browser console
- ✅ Show alert dialogs with credentials
- ❌ NOT send real emails

### Production Mode (Real Emails)

In your local `.env` file:
```env
VITE_EMAIL_ENABLED=true
VITE_EMAIL_DEBUG=false
```

**Important:** The Supabase Edge Function ALWAYS sends real emails. The `.env` flags only control the client-side behavior.

---

## Security Best Practices

1. ✅ Never commit `.env` files (already in `.gitignore`)
2. ✅ Use App Passwords, not your main Gmail password
3. ✅ Rotate App Passwords every 90 days
4. ✅ Monitor Edge Function logs for abuse
5. ✅ Set up email rate limiting if needed
6. ✅ For production, use a dedicated email service (Resend, SendGrid, AWS SES)

---

## Production Checklist

Before going live:

- [ ] Gmail App Password is set and working
- [ ] All 6 Supabase secrets are set correctly
- [ ] Edge Function is deployed and tested
- [ ] `EMAIL_PORT` is `465`
- [ ] `EMAIL_FROM` is plain email address
- [ ] `APP_URL` points to your production domain
- [ ] Tested password reset on mobile and desktop
- [ ] Tested welcome email for new users
- [ ] Tested password change notification
- [ ] Checked spam folder deliverability
- [ ] Edge Function logs show no errors
- [ ] Consider upgrading to Resend API for better reliability

---

## Support & Resources

- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Resend Documentation:** https://resend.com/docs/introduction
- **Gmail App Passwords:** https://myaccount.google.com/apppasswords
- **Denomailer Library:** https://deno.land/x/denomailer

---

**Document Version:** 2.0  
**Last Updated:** October 19, 2025  
**Status:** ✅ Production Ready  
**Tested On:** Chrome (Desktop & Mobile), iPhone 12

