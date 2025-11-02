# 📧 Email Testing Guide - Returns Notifications

## Overview

This guide covers testing the email notification system for return processing in both development and production environments.

## Prerequisites

- ✅ Migration 008 completed successfully
- ✅ Migration 009 completed successfully  
- ✅ Returns management system running
- ✅ Netlify functions deployed (for production)

---

## Development Environment Testing

### 1. Console Logging

When email sending is disabled in development, you'll see console logs instead:

```
[Email] Starting notification email for return #1 to owner@email.com
[Email] Dev mode - email not actually sent
[Return Process] COMPLETE: Return #1 processed in 0.25s. Email sent: ✗ Not configured
```

**What to Check:**
- ✅ No JavaScript errors in console
- ✅ Log messages appear correctly
- ✅ Formatting is readable

### 2. Enable Dev Email Testing

To actually send emails in development:

**Option A: Netlify CLI (Local)**
```bash
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Start local Netlify dev server
netlify dev

# App will be available at http://localhost:8888
# Emails will actually send through Netlify functions
```

**Option B: Configure Gmail in `.env`**
```env
# .env.local (for local development)
VITE_EMAIL_ENABLED=true
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

⚠️ **Note:** Environment variables in Vite need `VITE_` prefix to be available in browser. Netlify functions have separate env vars.

---

## Production Environment Testing

### 1. Netlify Configuration

**Set Environment Variables in Netlify Dashboard:**
1. Go to: https://app.netlify.com/sites/YOUR_SITE/settings/deploys#environment-variables
2. Add the following variables:
   - `EMAIL_USER`: Your Gmail address
   - `EMAIL_PASSWORD`: Your Gmail app password (16-char app password, not your regular password)
   - `EMAIL_HOST`: `smtp.gmail.com`
   - `EMAIL_PORT`: `587`
   - `EMAIL_SECURE`: `false`
   - `EMAIL_FROM`: `"Ayubo Cafe" <your-email@gmail.com>`

### 2. Test Return Processing

**Step-by-Step Test:**
1. **Add some test inventory** via Daily Stock Check-In
   - Create batches with different ages
   - Use realistic product names

2. **Process a return**
   - Go to Returns page
   - Select some batches to return
   - Click "Process Return"
   - Confirm

3. **Check email delivery**
   - Owner should receive email within seconds
   - Check inbox and spam folder
   - Verify content is correct

### 3. Verify Success Metrics

Check browser console for:
```
[Return Process] Started processing return #1
[Email] Starting notification email for return #1 to owner@email.com
[Email] SUCCESS: Return notification sent to owner (attempt 1/3, 1250ms)
[Return Process] COMPLETE: Return #1 processed in 2.15s. Email sent: ✓ Within 5 minutes
```

**Success Criteria:**
- ✅ Email arrives in owner's inbox
- ✅ Total time < 5 minutes
- ✅ No errors in console
- ✅ `notification_sent = true` in database

---

## Expected Email Content

The email should contain:

### 1. Header
- Subject: "Return Processed - [Date/Time]"
- Company name: "Ayubo Cafe"

### 2. Summary Box
- Date and time of return
- Processed by (staff member name)
- Total batches returned
- Total quantity
- **Total return value** (highlighted in green)

### 3. Item Details Table
- Product name
- Quantity returned
- Age at return (in days)
- Return percentage (20% or 100%)
- Value per item

### 4. Link
- "View Returns Log" button (links to Returns page)

### 5. Footer
- Automated notification disclaimer

---

## Retry Mechanism Testing

### Test Failed Email Scenarios

To test retry logic:

**Option 1: Disconnect Network**
1. Open browser DevTools
2. Go to Network tab
3. Enable "Offline" mode
4. Process a return
5. Watch console for retry attempts:
   ```
   [Email] FAILED (attempt 1/3): Failed to fetch. Retrying in 1000ms...
   [Email] FAILED (attempt 2/3): Failed to fetch. Retrying in 2000ms...
   [Email] FAILED (attempt 3/3): Failed to fetch.
   [Email] All attempts exhausted
   ```

**Option 2: Invalid Email Config**
1. Set wrong email password in Netlify env vars
2. Process a return
3. Watch for authentication errors and retries

### Expected Retry Behavior

- **Attempt 1:** Immediate
- **Attempt 2:** After 1 second
- **Attempt 3:** After 2 seconds  
- **Max delay:** 10 seconds between attempts
- **Total:** 3 attempts maximum

---

## Troubleshooting

### Email Not Arriving

**Checklist:**
1. ✅ Verify owner email exists in users table
2. ✅ Check Netlify env vars are set correctly
3. ✅ Verify Gmail app password is correct (not regular password)
4. ✅ Check spam/junk folder
5. ✅ Look for console errors

**Common Issues:**
- **"Owner email not found":** Owner user doesn't exist or is inactive
- **"Failed to send":** Email configuration issue
- **"All attempts exhausted":** Network or service issue

### Console Shows Errors

**Error: "Failed to fetch"**
- Netlify function not deployed
- Network connectivity issue
- CORS error

**Error: "Authentication failed"**
- Gmail app password wrong
- Gmail account 2FA not enabled
- Need to generate new app password

**Error: "Email not configured"**
- Dev mode: This is expected
- Production: Add environment variables

---

## Success Metrics

### Task 6.15 Compliance

The system tracks:
- ✓ Email sent within 5 minutes of return
- ✓ Retry attempts and timing
- ✓ Total processing time

**Monitor via Console:**
```
[Return Process] COMPLETE: Return #1 processed in 1.25s. Email sent: ✓ Within 5 minutes
```

**Database Check:**
```sql
SELECT 
  id,
  return_date,
  processed_at,
  notification_sent,
  EXTRACT(EPOCH FROM (processed_at - NOW())) as seconds_since_return
FROM returns
ORDER BY processed_at DESC
LIMIT 10;
```

---

## Manual Testing Checklist

- [ ] Process a return with fresh batches (0-2 days)
- [ ] Process a return with medium batches (3-7 days)
- [ ] Process a return with old batches (7+ days)
- [ ] Mix batches with different return percentages
- [ ] Test "Keep for tomorrow" functionality
- [ ] Verify email arrives for each case
- [ ] Check email content accuracy
- [ ] Test with network offline (retry logic)
- [ ] Verify notification_sent flag in database
- [ ] Check console logs for proper formatting

---

## Advanced Testing

### Load Testing

Process multiple returns quickly:
1. Process return 1
2. Immediately process return 2
3. Check both emails arrive
4. Verify no race conditions

### Email Format Validation

Check:
- ✅ Currency formatted correctly (Rs. X.XX)
- ✅ Dates formatted correctly
- ✅ Table borders visible
- ✅ Colors render in email client
- ✅ Link button works
- ✅ Mobile-friendly layout

---

## Integration Testing

### End-to-End Flow

1. **Morning:** Daily Stock Check-In
   - Add new batches
   - Verify batches created

2. **During Day:** Process Sales
   - FIFO deduction working
   - Older batches consumed first

3. **End of Day:** Process Returns
   - Select batches to return
   - Some batches "Keep for tomorrow"
   - Verify email sent
   - Check Returned Log

4. **Next Morning:** Verify Kept Batches
   - "Kept from [date]" indicator shows
   - Age incremented correctly

---

## Questions?

If emails aren't working:
1. Check console logs first
2. Verify Netlify deployment
3. Test Netlify function directly
4. Check environment variables
5. Review Netlify function logs

**Netlify Function Logs:**
- Go to Netlify Dashboard
- Navigate to Functions
- View logs for recent invocations

