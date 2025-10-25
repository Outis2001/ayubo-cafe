# Environment Variables Guide

## Overview

This guide documents all environment variables required for Ayubo Cafe's Customer Ordering System.

## Required Variables

### Supabase (Database & Storage)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Location**: Supabase Dashboard → Settings → API
**Required**: Yes (application will not work without these)
**Note**: `VITE_` prefix required for Vite to expose to client

## Optional Variables

### Twilio (SMS for OTP)
```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

**Location**: Twilio Console → Account Info
**Required**: No (can use test mode)
**Test Mode**: Set `TWILIO_TEST_MODE=true` to log OTPs to console instead of sending SMS

### Stripe (Online Payments)
```env
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Location**: Stripe Dashboard → Developers → API Keys
**Required**: No (can use bank transfer only)
**Test Mode**: Use `pk_test_*` and `sk_test_*` keys for development
**Production**: Use `pk_live_*` and `sk_live_*` keys for production

### Application Settings
```env
VITE_APP_URL=http://localhost:5173
NODE_ENV=development
```

**VITE_APP_URL**: Base URL for generating links (e.g., payment redirects)
**NODE_ENV**: Environment mode (`development`, `production`, `test`)

## Environment-Specific Configurations

### Development (.env.local)
```env
# Supabase
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev_anon_key

# Twilio (Test Mode)
TWILIO_TEST_MODE=true

# Stripe (Test Keys)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# App
VITE_APP_URL=http://localhost:5173
NODE_ENV=development
```

### Testing (.env.test)
```env
# Supabase (Test Database)
VITE_SUPABASE_URL=https://test-project.supabase.co
VITE_SUPABASE_ANON_KEY=test_anon_key

# Test Mode
VITE_TEST_MODE=true
VITE_DISABLE_RATE_LIMITING=true
VITE_MOCK_SMS=true
VITE_MOCK_PAYMENTS=true

# App
VITE_APP_URL=http://localhost:5173
NODE_ENV=test
```

### Production (.env.production)
```env
# Supabase (Production Database)
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_anon_key

# Twilio (Production)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+94...
TWILIO_TEST_MODE=false

# Stripe (Live Keys)
VITE_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
VITE_APP_URL=https://ayubocafe.com
NODE_ENV=production
```

## Netlify Configuration

For Netlify deployments, set environment variables in:
**Site Settings → Build & deploy → Environment**

### Required for Netlify Functions
- `SUPABASE_URL` (without VITE_ prefix)
- `SUPABASE_SERVICE_KEY` (service role key, not anon key)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Required for Frontend Build
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_APP_URL`

## Security Best Practices

### Never Commit .env Files
- `.env` files are in `.gitignore`
- Never commit actual credentials
- Use `env.example` as a template

### Use Different Keys for Each Environment
- Development: Test/sandbox keys
- Staging: Separate test keys
- Production: Live keys only

### Rotate Credentials Regularly
- Change passwords every 90 days
- Update API keys quarterly
- Revoke unused keys immediately

### Secure Storage
- Use environment variables (not hardcoded)
- Use secret management tools in production
- Never log sensitive credentials

## Troubleshooting

### "VITE_SUPABASE_URL is not defined"
- Ensure `.env` file exists in project root
- Ensure variable names have `VITE_` prefix
- Restart dev server after changing .env

### "Invalid Supabase credentials"
- Check URL format: `https://xxx.supabase.co`
- Verify anon key from Supabase dashboard
- Ensure no extra spaces or quotes

### "Stripe is not configured"
- Check `VITE_STRIPE_PUBLIC_KEY` is set
- Verify key starts with `pk_test_` or `pk_live_`
- Check Netlify function has `STRIPE_SECRET_KEY`

### "SMS not sending"
- Check `TWILIO_TEST_MODE` is `false` for production
- Verify Twilio credentials are correct
- Check phone number format: `+94XXXXXXXXX`

## Environment Validation

The application validates environment variables on startup:

```javascript
import { initializeEnvironmentValidation } from './utils/envValidation';

// In main.jsx
initializeEnvironmentValidation();
```

This will:
- Check all required variables are set
- Validate variable formats
- Warn about missing optional variables
- Log environment info to console

## References

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase API Keys](https://supabase.com/docs/guides/api#api-keys)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Twilio Credentials](https://www.twilio.com/docs/usage/your-request-to-twilio)
- [Netlify Environment Variables](https://docs.netlify.com/configure-builds/environment-variables/)

