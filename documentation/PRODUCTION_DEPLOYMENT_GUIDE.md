# Production Deployment Guide

## Pre-Deployment Checklist

### ✅ Database Preparation
- [ ] Run all migrations on production database
- [ ] Verify all tables are created
- [ ] Test stored procedures
- [ ] Enable Row Level Security (RLS) policies
- [ ] Create database backup strategy
- [ ] Set up automated backups
- [ ] Test RLS policies with different user roles

### ✅ Environment Variables
- [ ] Set all required production environment variables
- [ ] Use production Supabase project
- [ ] Use live Stripe keys (pk_live_*, sk_live_*)
- [ ] Use production Twilio credentials
- [ ] Set correct VITE_APP_URL (production domain)
- [ ] Remove or disable test mode flags

### ✅ Security
- [ ] Enable HTTPS only
- [ ] Configure CORS policies
- [ ] Set up Content Security Policy (CSP)
- [ ] Enable rate limiting
- [ ] Verify RLS policies
- [ ] Test role-based access control
- [ ] Review audit logging
- [ ] Set up error monitoring (Sentry)

### ✅ Testing
- [ ] Run all unit tests
- [ ] Run all integration tests
- [ ] Test customer signup flow
- [ ] Test order placement
- [ ] Test payment processing (test mode)
- [ ] Test custom cake requests
- [ ] Test staff order management
- [ ] Test notifications
- [ ] Mobile responsiveness testing
- [ ] Cross-browser testing

### ✅ Performance
- [ ] Optimize images
- [ ] Enable lazy loading
- [ ] Minify JavaScript/CSS
- [ ] Configure caching
- [ ] Test load times
- [ ] Monitor database query performance

### ✅ Monitoring & Logging
- [ ] Set up error tracking (Sentry)
- [ ] Configure application logging
- [ ] Set up uptime monitoring
- [ ] Configure alerts for critical errors
- [ ] Set up performance monitoring

## Deployment Steps

### 1. Supabase Setup

#### Create Production Project
```bash
1. Go to https://app.supabase.com
2. Click "New Project"
3. Select organization
4. Enter project name: "ayubo-cafe-production"
5. Generate strong database password
6. Choose region closest to users (e.g., Singapore for Sri Lanka)
7. Wait for project creation (~2 minutes)
```

#### Run Migrations
```bash
1. Navigate to SQL Editor in Supabase dashboard
2. Run migrations in order:
   - 001_inventory_migration.sql
   - 002_product_sorting_migration.sql
   - 003_fix_trigger_conflict.sql
   - 004_user_authentication_migration.sql
   - 005_email_verification.sql
   - 006_customer_ordering_schema.sql
3. Verify all tables exist in Table Editor
4. Test stored procedures
```

#### Configure Storage
```bash
1. Go to Storage section
2. Create buckets:
   - product-images (public)
   - custom-cake-images (public)
   - profile-images (public)
3. Set up storage policies for public read access
4. Configure file size limits (5MB for images)
```

#### Enable RLS
```bash
1. Go to Authentication → Policies
2. Verify all RLS policies are enabled
3. Test policies with different user roles
4. Ensure customers can only see their own data
```

### 2. Netlify Setup

#### Connect Repository
```bash
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to Git provider (GitHub, GitLab, Bitbucket)
4. Select repository: ayubo_cafe
5. Configure build settings:
   - Build command: npm run build
   - Publish directory: dist
   - Node version: 18
```

#### Configure Environment Variables
```bash
Site Settings → Build & deploy → Environment variables

Frontend (exposed to client):
- VITE_SUPABASE_URL=https://your-prod-project.supabase.co
- VITE_SUPABASE_ANON_KEY=your_prod_anon_key
- VITE_STRIPE_PUBLIC_KEY=pk_live_your_live_key
- VITE_APP_URL=https://your-domain.com

Backend (Netlify Functions only):
- SUPABASE_URL=https://your-prod-project.supabase.co
- SUPABASE_SERVICE_KEY=your_service_role_key
- STRIPE_SECRET_KEY=sk_live_your_live_key
- STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
- TWILIO_ACCOUNT_SID=your_account_sid
- TWILIO_AUTH_TOKEN=your_auth_token
- TWILIO_PHONE_NUMBER=+94XXXXXXXXX
```

#### Deploy
```bash
1. Click "Deploy site"
2. Wait for build to complete (~3-5 minutes)
3. Site will be live at random subdomain (e.g., random-name-123.netlify.app)
4. Test all functionality on deployed site
```

#### Configure Custom Domain (Optional)
```bash
1. Go to Site settings → Domain management
2. Click "Add custom domain"
3. Enter your domain: ayubocafe.com
4. Follow DNS configuration instructions
5. Wait for DNS propagation (~24-48 hours)
6. Enable HTTPS (automatic with Let's Encrypt)
```

### 3. Stripe Setup

#### Configure Webhooks
```bash
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: https://your-netlify-site.netlify.app/.netlify/functions/stripe-webhook
4. Events to listen for:
   - payment_intent.succeeded
   - payment_intent.payment_failed
   - payment_intent.canceled
5. Copy webhook signing secret
6. Add to Netlify environment variables as STRIPE_WEBHOOK_SECRET
```

#### Switch to Live Mode
```bash
1. Toggle "Viewing test data" to "Live mode" in Stripe Dashboard
2. Go to Developers → API keys
3. Copy Publishable key (pk_live_*)
4. Copy Secret key (sk_live_*)
5. Update Netlify environment variables
6. Redeploy site
```

### 4. Twilio Setup

#### Configure Phone Number
```bash
1. Go to Twilio Console
2. Purchase a phone number (if not already done)
3. Configure messaging:
   - When a message comes in: [Leave blank or set webhook]
   - Fallback URL: [Optional]
4. Note Account SID, Auth Token, and Phone Number
5. Add to Netlify environment variables
```

#### Test SMS Delivery
```bash
1. Use test phone number to signup
2. Verify OTP is received
3. Check Twilio logs for delivery status
4. Monitor SMS credits and set up auto-refill
```

### 5. Post-Deployment Testing

#### Critical Flow Testing
```bash
✅ Customer Signup & Login
1. Sign up with new phone number
2. Receive and verify OTP
3. Complete profile setup

✅ Browse Products
1. View product catalog
2. Search for products
3. Filter by category
4. View product details

✅ Place Order
1. Add products to cart
2. Select pickup date/time
3. Enter special instructions
4. Complete checkout
5. Make payment (Stripe or bank transfer)
6. Receive order confirmation

✅ Custom Cake Request
1. Submit custom cake request
2. Upload reference images
3. Receive quote notification
4. Approve/reject quote
5. Complete payment

✅ Staff Order Management
1. Login as staff
2. View customer orders
3. Update order status
4. Verify bank transfer payments
5. Process custom requests
6. Create and send quotes

✅ Notifications
1. Verify staff receives notifications
2. Test notification badge
3. Test mark as read functionality
4. Test real-time updates
```

#### Performance Testing
```bash
1. Test page load times (< 3 seconds)
2. Test image loading
3. Test API response times
4. Test concurrent user load
5. Monitor database query performance
```

#### Security Testing
```bash
1. Verify HTTPS is enforced
2. Test RLS policies (customers can't see other customer data)
3. Test role-based access (cashiers can't access owner features)
4. Test rate limiting
5. Test CSRF protection
6. Test input sanitization
7. Verify secure headers
```

## Monitoring & Maintenance

### Set Up Monitoring

#### Sentry (Error Tracking)
```bash
1. Create account at https://sentry.io
2. Create new project
3. Install Sentry SDK:
   npm install @sentry/react
4. Initialize in main.jsx:
   import * as Sentry from "@sentry/react";
   
   Sentry.init({
     dsn: "your-sentry-dsn",
     environment: "production",
     tracesSampleRate: 1.0,
   });
5. Deploy changes
6. Monitor errors in Sentry dashboard
```

#### Uptime Monitoring
```bash
Options:
- UptimeRobot (free): https://uptimerobot.com
- Pingdom: https://www.pingdom.com
- Better Uptime: https://betteruptime.com

Setup:
1. Add HTTP(s) monitor
2. URL: https://your-domain.com
3. Check interval: 5 minutes
4. Alert contacts: email, SMS
5. Status page: Public or private
```

#### Database Monitoring
```bash
Supabase Dashboard:
1. Monitor query performance
2. Check database size
3. Monitor connection count
4. Review slow queries
5. Set up alerts for high usage
```

### Regular Maintenance

#### Daily
- [ ] Review error logs
- [ ] Check system uptime
- [ ] Monitor order volume
- [ ] Verify payments processing

#### Weekly
- [ ] Review performance metrics
- [ ] Check database size
- [ ] Monitor SMS/email credits
- [ ] Review audit logs

#### Monthly
- [ ] Database backup verification
- [ ] Security audit
- [ ] Update dependencies
- [ ] Review and rotate API keys
- [ ] Performance optimization

#### Quarterly
- [ ] Comprehensive security review
- [ ] Load testing
- [ ] Update documentation
- [ ] Review and update RLS policies
- [ ] Disaster recovery drill

## Troubleshooting

### Build Failures
```bash
Error: Module not found
→ Check package.json dependencies
→ Run npm install locally first
→ Verify import paths

Error: Environment variable not defined
→ Check Netlify environment variables
→ Ensure VITE_ prefix for client-side vars
→ Redeploy after adding variables
```

### Runtime Errors
```bash
Error: Supabase connection failed
→ Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
→ Check Supabase project status
→ Verify RLS policies aren't blocking access

Error: Payment processing failed
→ Check Stripe API keys are correct
→ Verify webhook endpoint is accessible
→ Check webhook secret matches
→ Review Stripe logs

Error: SMS not sending
→ Verify Twilio credentials
→ Check phone number format
→ Review Twilio logs
→ Check SMS credits balance
```

### Performance Issues
```bash
Slow page loads:
→ Optimize images (compress, WebP format)
→ Enable lazy loading
→ Check database query performance
→ Review network waterfall in DevTools

Database slow queries:
→ Add database indexes
→ Optimize complex queries
→ Use database connection pooling
→ Review RLS policy performance
```

## Rollback Plan

If deployment fails or critical issues found:

```bash
1. Revert to previous Netlify deployment:
   - Go to Deploys tab
   - Click on last successful deploy
   - Click "Publish deploy"

2. Restore database backup:
   - Download backup from Supabase
   - Create new project
   - Restore from backup
   - Update environment variables

3. Notify users:
   - Post status update
   - Inform affected customers
   - Provide ETA for resolution
```

## Support & Resources

- [Netlify Documentation](https://docs.netlify.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)
- [Sentry Documentation](https://docs.sentry.io)

## Emergency Contacts

- Netlify Support: support@netlify.com
- Supabase Support: support@supabase.com
- Stripe Support: https://support.stripe.com
- Twilio Support: https://support.twilio.com

---

**Last Updated**: October 25, 2025
**Version**: 1.0

