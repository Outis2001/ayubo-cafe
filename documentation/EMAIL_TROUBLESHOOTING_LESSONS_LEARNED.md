# 🐛 Email Setup - Troubleshooting & Lessons Learned

**Date:** October 19, 2025  
**Status:** RESOLVED ✅

This document chronicles the errors encountered during the email setup process and their solutions. It serves as a reference for future troubleshooting and helps avoid repeating the same mistakes.

---

## 📋 Table of Contents

1. [Error Timeline](#error-timeline)
2. [Error 1: Missing Authorization Header](#error-1-missing-authorization-header)
3. [Error 2: Email Configuration Missing](#error-2-email-configuration-missing)
4. [Error 3: Invalid Email Address Format](#error-3-invalid-email-address-format)
5. [Error 4: InvalidContentType (SMTP Connection)](#error-4-invalidcontenttype-smtp-connection)
6. [Key Lessons Learned](#key-lessons-learned)
7. [Best Practices](#best-practices)

---

## Error Timeline

| # | Error | Root Cause | Solution | Status |
|---|-------|-----------|----------|--------|
| 1 | `Missing authorization header` | No `Authorization` header in fetch request | Added `Bearer ${VITE_SUPABASE_ANON_KEY}` | ✅ Fixed |
| 2 | `Email configuration missing` | Secrets not set in Supabase | Set 6 Supabase secrets | ✅ Fixed |
| 3 | `Invalid email address` | `EMAIL_FROM` formatted as `"Name <email>"` | Changed to plain email | ✅ Fixed |
| 4 | `InvalidContentType` | STARTTLS incompatibility on port 587 | Changed to port 465 (SSL) | ✅ Fixed |

---

## Error 1: Missing Authorization Header

### 🔴 The Error

```
GET https://chxflnoqbapoywpibeba.supabase.co/functions/v1/send-email
401 (Unauthorized)

Response: {"message":"No API key found in request","hint":"No `apikey` request header or url param was found."}
```

### 🔍 Root Cause

The client-side code in `src/utils/email.js` was calling the Supabase Edge Function without an `Authorization` header. Supabase requires either:
- `apikey` query parameter, OR
- `Authorization: Bearer <anon_key>` header

### ✅ Solution

Added the `Authorization` header to all fetch requests in `src/utils/email.js`:

```javascript
const response = await fetch('https://chxflnoqbapoywpibeba.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, // ✅ ADDED
  },
  body: JSON.stringify({
    type: 'password_reset',
    email,
    resetToken,
    userName
  }),
});
```

### 📝 Lesson

**Always include the Supabase anon key** when calling Edge Functions from the client, even if the function doesn't require authentication. It's required by Supabase's proxy layer.

---

## Error 2: Email Configuration Missing

### 🔴 The Error

```
POST https://chxflnoqbapoywpibeba.supabase.co/functions/v1/send-email
500 (Internal Server Error)

Response: {"success":false,"error":"Email configuration missing"}
```

### 🔍 Root Cause

**Critical Misunderstanding:** We initially thought that the environment variables in the local `.env` file would be available to the Supabase Edge Function. This is **NOT** true.

**The Truth:**
- ❌ Local `.env` variables are **NOT** accessible to Edge Functions
- ✅ Edge Functions run in Supabase's Deno runtime, isolated from your local environment
- ✅ Edge Functions require **Supabase Secrets** to access sensitive data

Our local `.env` had:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=benujith@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=Ayubo Cafe <benujith@gmail.com>
```

But the Edge Function couldn't see these variables because they were never set as Supabase Secrets.

### ✅ Solution

Set all email configuration as **Supabase Secrets**:

```bash
supabase secrets set EMAIL_HOST=smtp.gmail.com
supabase secrets set EMAIL_PORT=465
supabase secrets set EMAIL_USER=benujith@gmail.com
supabase secrets set EMAIL_PASSWORD=abcd efgh ijkl mnop
supabase secrets set EMAIL_FROM=benujith@gmail.com
supabase secrets set APP_URL=http://192.168.1.5:3000
```

Or via Supabase Dashboard:
1. Project Settings → Edge Functions → Secrets
2. Add each secret manually

### 📝 Lessons

1. **Environment Variables are NOT universal**
   - Local `.env` → Only for client-side React app (prefixed with `VITE_`)
   - Supabase Secrets → Only for Edge Functions (accessed via `Deno.env.get()`)

2. **Two separate environments**
   ```
   Local Development          Supabase Edge Functions
   ==================         =======================
   .env file                  Supabase Secrets
   process.env.VAR            Deno.env.get("VAR")
   Runs on your machine       Runs on Supabase servers
   Has local file access      Isolated Deno runtime
   ```

3. **Security Benefit:** This isolation is actually a security feature - your production secrets never touch your local machine.

---

## Error 3: Invalid Email Address Format

### 🔴 The Error

```
Error sending email: Error: The specified from adress is not a valid email adress.
at validateConfig (https://deno.land/x/denomailer@1.6.0/config/mail/mod.ts:78:...)
```

### 🔍 Root Cause

We set the `EMAIL_FROM` secret as:
```
Ayubo Cafe <benujith@gmail.com>
```

This is a **valid SMTP format** used by many email libraries (including Nodemailer), but the `denomailer` library (used in Deno) is **stricter** and only accepts plain email addresses.

**Why we made this mistake:**
- Most SMTP libraries accept `"Name <email>"` format
- We assumed `denomailer` would be the same
- The library documentation wasn't clear about this restriction

### ✅ Solution

Changed `EMAIL_FROM` to a **plain email address**:
```
benujith@gmail.com
```

### 📝 Lessons

1. **Library-specific quirks:** Always check the specific library's documentation and validation rules
2. **When in doubt, keep it simple:** Plain email addresses work everywhere
3. **Sender name is optional:** Most email clients will use the email address as the sender name if no name is provided

---

## Error 4: InvalidContentType (SMTP Connection)

### 🔴 The Error

```
POST https://chxflnoqbapoywpibeba.supabase.co/functions/v1/send-email
500 (Internal Server Error)

Response: {"success":false,"error":"received corrupt message of type InvalidContentType"}

Edge Function Logs:
Error sending email: InvalidData: received corrupt message of type InvalidContentType
at async Object.pull (ext:deno_web/06_streams.js:994:27)
```

### 🔍 Root Cause

This error is **deceptive**. It sounds like a content type issue, but it's actually an **SMTP connection problem**.

**What we tried (that didn't work):**

1. **First Attempt: `tls: false` with port 587**
   ```typescript
   const client = new SMTPClient({
     connection: {
       hostname: "smtp.gmail.com",
       port: 587,
       tls: false,  // ❌ WRONG
       auth: { username, password },
     },
   });
   ```
   **Result:** `InvalidContentType` error
   **Why:** Port 587 requires STARTTLS, but `tls: false` disabled encryption entirely

2. **Second Attempt: `tls: true` with port 587**
   ```typescript
   const client = new SMTPClient({
     connection: {
       hostname: "smtp.gmail.com",
       port: 587,
       tls: true,  // ❌ STILL WRONG
       auth: { username, password },
     },
   });
   ```
   **Result:** Still `InvalidContentType` error
   **Why:** The `denomailer` library has compatibility issues with STARTTLS on port 587

**Understanding the two Gmail SMTP ports:**

| Port | Protocol | Description | Works with denomailer? |
|------|----------|-------------|----------------------|
| 587 | STARTTLS | Starts unencrypted, then upgrades to TLS | ❌ No (library bug) |
| 465 | SSL/TLS | Encrypted from the start | ✅ Yes |

### ✅ Solution

**Changed to port 465 with SSL:**

1. Updated Supabase Secret:
   ```bash
   supabase secrets set EMAIL_PORT=465
   ```

2. Edge Function configuration:
   ```typescript
   const client = new SMTPClient({
     connection: {
       hostname: "smtp.gmail.com",
       port: 465,        // ✅ SSL port
       tls: true,        // ✅ SSL enabled
       auth: { username, password },
     },
   });
   ```

**Result:** ✅ Emails sent successfully!

### 📝 Lessons

1. **Error messages can be misleading**
   - "InvalidContentType" sounded like a JSON/Content-Type header issue
   - It was actually a low-level SMTP connection/TLS handshake failure
   - Always check Edge Function logs for more context

2. **Library-specific compatibility issues**
   - `denomailer` (Deno) has issues with STARTTLS on port 587
   - Standard `nodemailer` (Node.js) works fine with both ports
   - Always test the specific library you're using

3. **Port 465 is more reliable**
   - Simpler protocol (SSL from start)
   - Better compatibility with Deno's networking stack
   - Fewer handshake issues

4. **When SMTP fails, use an API**
   - Modern email services (Resend, SendGrid, Mailgun) use HTTP APIs
   - More reliable than SMTP
   - Better error messages
   - Designed for serverless/edge environments

---

## Key Lessons Learned

### 1. Environment Isolation

```
┌─────────────────────┐         ┌──────────────────────┐
│  Local Development  │         │  Supabase Edge Func  │
├─────────────────────┤         ├──────────────────────┤
│ .env file           │  ❌ ≠   │ Supabase Secrets     │
│ process.env         │         │ Deno.env.get()       │
│ Node.js runtime     │         │ Deno runtime         │
│ Local file system   │         │ Isolated sandbox     │
└─────────────────────┘         └──────────────────────┘
```

**Takeaway:** Local `.env` and Supabase Secrets are **completely separate**. Set both if needed.

### 2. Library-Specific Behavior

- Don't assume library behavior from similar libraries
- `denomailer` ≠ `nodemailer` (even though they're similar)
- Always read the docs and test thoroughly
- When a library has issues, consider alternatives (API-based email services)

### 3. Error Message Interpretation

| Error Message | What It Sounds Like | What It Actually Was |
|---------------|-------------------|---------------------|
| `No API key found` | Auth problem | Missing header |
| `Email configuration missing` | Code bug | Secrets not set |
| `Invalid email address` | Typo | Format incompatibility |
| `InvalidContentType` | Content-Type header | SMTP connection failure |

**Takeaway:** Don't trust error messages at face value. Dig deeper.

### 4. Testing Strategy

**What we should have done:**
1. ✅ Test with the simplest possible configuration first (port 465, plain email)
2. ✅ Test SMTP connection separately before integrating
3. ✅ Use Edge Function logs for server-side debugging
4. ✅ Check browser Network tab for client-side issues
5. ✅ Test on multiple devices (desktop, mobile)

**What we did:**
1. ❌ Tried the "recommended" port 587 first (which has compatibility issues)
2. ❌ Assumed library behavior without testing
3. ✅ Eventually checked logs and network tab (after multiple failures)

### 5. Documentation Gaps

**Issues we encountered:**
- Supabase docs don't clearly explain that local `.env` ≠ Edge Function secrets
- `denomailer` docs don't mention port 587 compatibility issues
- Error messages were too generic

**How to handle:**
- Test everything yourself
- Don't rely solely on documentation
- Use proven configurations (port 465 is widely documented)

---

## Best Practices

### ✅ DO:

1. **Set Supabase Secrets explicitly**
   - Don't assume local environment variables will work
   - Use the dashboard or CLI to set secrets
   - Verify secrets are set correctly

2. **Use port 465 for Gmail SMTP**
   - More reliable than port 587
   - Better compatibility with Deno/Edge Functions
   - Fewer configuration options = fewer ways to break

3. **Use plain email addresses**
   - `user@domain.com` ✅
   - `"Name <user@domain.com>"` ❌ (may not work with all libraries)

4. **Test in the actual environment**
   - Local development ≠ Edge Functions
   - Test directly in Supabase after deployment
   - Check Edge Function logs

5. **Consider API-based email services**
   - Resend, SendGrid, Mailgun are more reliable
   - Better error messages
   - No SMTP complexity
   - Built for serverless environments

### ❌ DON'T:

1. **Assume environment variable portability**
   - `.env` is NOT universal
   - Each runtime has its own environment

2. **Trust error messages blindly**
   - "InvalidContentType" was actually SMTP connection failure
   - Always investigate deeper

3. **Use port 587 with denomailer**
   - Known compatibility issues
   - Stick with port 465

4. **Format EMAIL_FROM with names**
   - Keep it simple: just the email address

5. **Skip testing**
   - Test every change immediately
   - Use Edge Function logs
   - Test on multiple devices

---

## Alternative Solution: Resend API

**Why we recommend Resend for production:**

| Feature | Gmail SMTP (Port 465) | Resend API |
|---------|---------------------|-----------|
| Complexity | Medium | Low |
| Reliability | Good | Excellent |
| Error Messages | Cryptic | Clear |
| Setup Time | 10 minutes | 5 minutes |
| Free Tier | 500 emails/day | 3,000 emails/month |
| Edge Function Friendly | Yes, but tricky | Yes, built for it |
| Deliverability | Good | Better |
| Troubleshooting | Hard | Easy |

**Recommendation:** 
- ✅ Gmail SMTP for development/testing
- ✅ Resend API for production

---

## Quick Reference: Working Configuration

### Supabase Secrets (Dashboard or CLI)

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465              # ⚠️ MUST be 465, not 587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # Gmail App Password
EMAIL_FROM=your-email@gmail.com     # ⚠️ Plain email, no "Name <email>"
APP_URL=http://192.168.1.5:3000
```

### Edge Function Configuration

```typescript
const client = new SMTPClient({
  connection: {
    hostname: emailHost,
    port: parseInt(emailPort || "465"),  // ⚠️ Must be 465
    tls: true,                           // ⚠️ Must be true
    auth: {
      username: emailUser,
      password: emailPassword,
    },
  },
});
```

### Client-Side Fetch Request

```javascript
const response = await fetch('https://YOUR-PROJECT.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,  // ⚠️ Required
  },
  body: JSON.stringify({
    type: 'password_reset',
    email,
    resetToken,
    userName
  }),
});
```

---

## Conclusion

The email setup journey taught us valuable lessons about:
- Environment isolation in serverless architectures
- Library-specific quirks and compatibility issues
- The importance of thorough testing
- Not trusting error messages at face value
- The value of simpler solutions (port 465 vs 587, API vs SMTP)

**Final Status:** ✅ Working perfectly with Gmail SMTP on port 465

**Time Spent Debugging:** ~2 hours  
**Time Saved by This Document:** Hopefully many hours for future developers! 🎉

---

**Document Version:** 1.0  
**Created:** October 19, 2025  
**Authors:** AI Assistant & Developer  
**Status:** Complete

