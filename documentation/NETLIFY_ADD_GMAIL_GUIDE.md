# 📧 Enable Gmail on Your Netlify Deployment

## Quick Guide to Add Email Functionality

Your app is already deployed on Netlify! Now let's enable email sending for password resets and welcome emails.

---

## Step 1: Generate Gmail App Password

### 1.1 Enable 2-Step Verification (if not already enabled)

1. **Go to Google Account Security:**
   - Visit: https://myaccount.google.com/security

2. **Enable 2-Step Verification:**
   - Scroll to "Signing in to Google"
   - Click "2-Step Verification"
   - Follow the prompts (use your phone number or authenticator app)
   - Complete the setup

### 1.2 Generate App Password

1. **Go to App Passwords:**
   - Visit: https://myaccount.google.com/apppasswords
   - Or: Go to Security → Search for "App passwords"

2. **Create New App Password:**
   - Click "Select app" → Choose "Mail"
   - Click "Select device" → Choose "Other" → Type "Ayubo Cafe Netlify"
   - Click "Generate"

3. **Copy the 16-Character Password:**
   - You'll see something like: `abcd efgh ijkl mnop`
   - **COPY THIS NOW** - you won't see it again!
   - Example: `xmsp qwer tyui opas` (yours will be different)

---

## Step 2: Add Environment Variables to Netlify

### 2.1 Go to Netlify Dashboard

1. **Login to Netlify:**
   - Visit: https://app.netlify.com
   - Find your "ayubo-cafe" site

2. **Navigate to Environment Variables:**
   - Click on your site
   - Go to **Site settings** (or **Site configuration**)
   - Click **Environment variables** in the left sidebar
   - Or directly: **Site settings → Build & deploy → Environment → Environment variables**

### 2.2 Add Email Variables

Click **"Add a variable"** or **"Add environment variable"** for each of these:

#### Variable 1: EMAIL_HOST
```
Key:   EMAIL_HOST
Value: smtp.gmail.com
```

#### Variable 2: EMAIL_PORT
```
Key:   EMAIL_PORT
Value: 465
```
**Use 465 for SSL/TLS (recommended for Netlify)**

#### Variable 3: EMAIL_SECURE
```
Key:   EMAIL_SECURE
Value: true
```
**Use true when using port 465**

#### Variable 4: EMAIL_USER
```
Key:   EMAIL_USER
Value: your-email@gmail.com
```
**Replace with YOUR Gmail address** (e.g., `benujith@gmail.com`)

#### Variable 5: EMAIL_PASSWORD
```
Key:   EMAIL_PASSWORD
Value: xmsp qwer tyui opas
```
**Replace with the 16-character App Password you copied** (remove spaces if you want, but spaces are OK)

#### Variable 6: EMAIL_FROM
```
Key:   EMAIL_FROM
Value: "Ayubo Cafe <your-email@gmail.com>"
```
**Replace with YOUR Gmail address** (e.g., `"Ayubo Cafe <benujith@gmail.com>"`)

#### Variable 7: VITE_EMAIL_ENABLED (Update existing)
```
Key:   VITE_EMAIL_ENABLED
Value: true
```
**Change from `false` to `true`** (or add if it doesn't exist)

### 2.3 Verify All Variables

Your environment variables should now look like this:

| Key | Value | Scope |
|-----|-------|-------|
| `VITE_SUPABASE_URL` | https://xxx.supabase.co | All deploys |
| `VITE_SUPABASE_ANON_KEY` | eyJhbGci... | All deploys |
| `VITE_APP_URL` | https://your-site.netlify.app | All deploys |
| `EMAIL_HOST` | smtp.gmail.com | All deploys |
| `EMAIL_PORT` | 465 | All deploys |
| `EMAIL_SECURE` | true | All deploys |
| `EMAIL_USER` | your-email@gmail.com | All deploys |
| `EMAIL_PASSWORD` | xmsp qwer tyui opas | All deploys |
| `EMAIL_FROM` | "Ayubo Cafe <your-email@gmail.com>" | All deploys |
| `VITE_EMAIL_ENABLED` | true | All deploys |

---

## Step 3: Trigger Redeploy

### 3.1 Deploy Without Code Changes

1. **Go to Deploys Tab:**
   - In Netlify dashboard, click **"Deploys"** tab

2. **Trigger Deploy:**
   - Click **"Trigger deploy"** button (top right)
   - Select **"Deploy site"**

3. **Wait for Build:**
   - Watch the build log (should take 1-3 minutes)
   - Wait for "Published" status
   - Green checkmark = success! ✅

### 3.2 Check Function Deployed

1. **Go to Functions Tab:**
   - Click **"Functions"** in the left sidebar
   - You should see: `send-email`
   - Status should be "Active" or "Published"

---

## Step 4: Test Email Functionality

### 4.1 Test Password Reset

1. **Go to Your Netlify Site:**
   - Visit: `https://your-site-name.netlify.app`

2. **Click "Forgot Password?"**

3. **Enter your owner username:** `owner`

4. **Click "Request Reset Link"**

5. **Check Your Gmail:**
   - Look for email from yourself
   - Subject: "Reset Your Password - Ayubo Cafe"
   - Should arrive within 1-2 minutes

6. **Check Spam Folder** if not in inbox

### 4.2 Test Welcome Email (Optional)

1. **Login as owner**

2. **Go to "Users" page**

3. **Create a test user:**
   - Use your email or another email you control
   - Fill in details
   - Click "Create User"

4. **Check email** for welcome message

### 4.3 Check Function Logs

If emails aren't arriving:

1. **Go to Netlify Dashboard → Functions**

2. **Click on `send-email` function**

3. **View "Function log"** tab

4. **Look for errors:**
   - Authentication errors → Check App Password
   - Connection errors → Check EMAIL_HOST and EMAIL_PORT
   - "Email not configured" → Check environment variables are set

---

## Troubleshooting

### ❌ Email Not Arriving

**Check These:**

1. **Gmail Spam Folder** 📮
   - Often lands here first time
   - Mark as "Not Spam" to fix

2. **Function Logs in Netlify** 📊
   - Deploys → Latest deploy → Function log
   - Or Functions → send-email → Function log
   - Look for error messages

3. **Environment Variables** ⚙️
   - Site settings → Environment variables
   - Verify all 7 email variables are set
   - Check for typos in EMAIL_USER and EMAIL_PASSWORD

4. **App Password** 🔑
   - Make sure it's the 16-character App Password
   - NOT your regular Gmail password
   - Try generating a new one if unsure

5. **2-Step Verification** 🔐
   - Must be enabled on your Google account
   - Check: https://myaccount.google.com/security

### ❌ Function Not Found

**If you get 404 on `/.netlify/functions/send-email`:**

1. Check `netlify.toml` exists in root
2. Verify `netlify/functions/send-email.js` exists
3. Trigger a new deploy
4. Check Functions tab in Netlify dashboard

### ❌ SMTP Connection Errors

**If you see "Connection refused" or "SMTP error":**

**Recommended Configuration (Port 465 - SSL/TLS):**
```
EMAIL_PORT=465
EMAIL_SECURE=true
```

**Alternative Configuration (Port 587 - STARTTLS):**
```
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Other troubleshooting:**
1. Check Gmail hasn't blocked your account
2. Verify firewall isn't blocking outbound SMTP
3. Try from a different email service (see below)

### ❌ Authentication Failed

**If you see "Invalid credentials" or "Authentication failed":**

1. **Regenerate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Delete old app password
   - Generate new one
   - Update EMAIL_PASSWORD in Netlify

2. **Check Email Address:**
   - EMAIL_USER must match the Gmail account
   - Don't use alias addresses

3. **Verify 2FA is enabled:**
   - App Passwords only work with 2FA enabled

---

## Alternative: Using a Different Email Service

If Gmail doesn't work, you can use other services:

### SendGrid (Free Tier: 100 emails/day)

```
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=verified-email@yourdomain.com
```

### Mailgun (Free Tier: 5000 emails/month)

```
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your_mailgun_smtp_password
EMAIL_FROM=noreply@your-domain.mailgun.org
```

### Outlook/Hotmail

```
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your_outlook_password
EMAIL_FROM=your-email@outlook.com
```
*Note: Outlook works best with port 587*

---

## Security Best Practices

### ✅ DO:
- ✅ Use App Passwords (not regular passwords)
- ✅ Keep passwords in Netlify environment variables only
- ✅ Rotate App Passwords every 90 days
- ✅ Monitor Gmail for unusual activity
- ✅ Use different credentials for dev/production

### ❌ DON'T:
- ❌ Never commit email passwords to Git
- ❌ Don't share App Passwords
- ❌ Don't use your main Gmail password
- ❌ Don't hardcode credentials in code

---

## Gmail Sending Limits

**Free Gmail Account:**
- **500 emails per day**
- More than enough for cafe operations

**Google Workspace:**
- **2000 emails per day**
- If you need more, consider upgrading

**If You Hit Limits:**
- Gmail will block sending temporarily
- Unblocks automatically after 24 hours
- Consider using SendGrid or Mailgun for higher volume

---

## Verification Checklist

After setup, verify:

- [ ] 2-Step Verification enabled on Google account
- [ ] Gmail App Password generated and copied
- [ ] All 7 email environment variables added to Netlify
- [ ] VITE_EMAIL_ENABLED set to `true`
- [ ] Site redeployed successfully
- [ ] `send-email` function shows in Netlify Functions tab
- [ ] Password reset email test successful
- [ ] Email arrives in inbox (or spam folder)
- [ ] Welcome email test successful (optional)
- [ ] Function logs show no errors

---

## Quick Reference Commands

### Check if Function is Live
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Test</p>","type":"test"}'
```

Expected response:
```json
{"success":true,"messageId":"..."}
```

---

## Need Help?

**Common Issues:**

1. **"Email not configured"** → Environment variables not set or redeploy needed
2. **"Invalid credentials"** → Wrong App Password or email address
3. **"Connection timeout"** → Wrong port or host
4. **Email not arriving** → Check spam folder or function logs

**Where to Check:**

- **Netlify Dashboard:** Site settings → Environment variables
- **Function Logs:** Functions → send-email → Function log
- **Build Logs:** Deploys → [Latest] → Deploy log
- **Gmail Settings:** https://myaccount.google.com/security

---

## Success! 🎉

Once you see the password reset email arrive, you're all set!

**Your app now has:**
- ✅ Live on Netlify
- ✅ Secure HTTPS
- ✅ Email sending working
- ✅ Password resets functional
- ✅ Welcome emails for new users

**Enjoy your fully functional cafe management system!** ☕

---

## Summary of Steps

1. ✅ Enable 2-Step Verification on Gmail
2. ✅ Generate App Password (16 characters)
3. ✅ Add 7 environment variables to Netlify
4. ✅ Set VITE_EMAIL_ENABLED to `true`
5. ✅ Trigger redeploy
6. ✅ Test password reset email
7. ✅ Check spam folder if needed
8. ✅ Verify in function logs

**Total time: 10-15 minutes** ⏱️

