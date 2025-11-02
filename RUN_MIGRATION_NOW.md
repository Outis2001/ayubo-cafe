# 🚨 URGENT: Run Database Migration for Customer Portal

## ❌ Current Problem

You're getting these errors:
```
Could not find the table 'public.customers'
Could not find the table 'public.customer_otp_verifications'
```

**Cause**: The customer ordering database tables don't exist yet.

**Solution**: Run Migration 006 to create all required tables.

---

## ✅ How to Fix (5 Minutes)

### STEP 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: **Ayubo Cafe**

### STEP 2: Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button (top right)

### STEP 3: Copy the Migration File
1. Open the file: `database/migrations/006_customer_ordering_schema.sql`
2. Select all content (Ctrl+A or Cmd+A)
3. Copy (Ctrl+C or Cmd+C)

### STEP 4: Execute Migration
1. Paste the SQL into the Supabase SQL Editor
2. Click **"Run"** button (or press Ctrl+Enter)
3. Wait for completion (10-30 seconds)
4. You should see: ✅ **"Success. No rows returned"**

### STEP 5: Verify Success
Run this query in the SQL Editor to verify:

```sql
-- Check if customer tables exist
SELECT table_name 
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('customers', 'customer_otp_verifications', 'customer_orders')
ORDER BY table_name;
```

**Expected Result**: You should see 3 rows (customers, customer_otp_verifications, customer_orders)

---

## 📋 What This Migration Creates

The migration creates **15 tables** for the customer ordering system:

### Core Tables:
- ✅ `customers` - Customer accounts
- ✅ `customer_otp_verifications` - Phone verification codes
- ✅ `customer_orders` - Customer orders
- ✅ `customer_order_items` - Order line items
- ✅ `customer_payments` - Payment records
- ✅ `customer_addresses` - Delivery addresses
- ✅ `customer_notifications` - SMS/Email notifications

### Product Catalog Tables:
- ✅ `product_catalog` - Product listings
- ✅ `product_categories` - Category definitions (Birthday Cakes, etc.)
- ✅ `product_pricing` - Multiple pricing options per product
- ✅ `product_category_mappings` - Product-to-category relationships

### Custom Cake Tables:
- ✅ `custom_cake_requests` - Custom cake quotes
- ✅ `order_holds` - Pickup date reservations

### System Tables:
- ✅ `order_status_history` - Order audit trail
- ✅ `system_configuration` - System settings

### Plus:
- 🔧 12 stored functions (business logic)
- ⚙️ 12 triggers (automation)
- 🔒 32 security policies (RLS)
- 📦 8 default product categories
- ⚙️ 17 system configuration entries

---

## 🧪 After Migration - Test It

Once the migration completes successfully:

1. **Refresh your browser** (Ctrl+F5 or Cmd+Shift+R)
2. Go to: `http://localhost:3000/customer`
3. Try signing up with: `+94702228573`
4. You should receive an OTP code (check console in dev mode)

---

## ⚠️ Important Notes

- **Safe to run multiple times**: Uses `CREATE TABLE IF NOT EXISTS`
- **No data loss**: Won't affect existing staff/inventory tables
- **Isolated system**: Customer data is separate from staff data
- **Security included**: Row Level Security (RLS) is automatically enabled

---

## 🆘 Troubleshooting

### Error: "permission denied"
**Solution**: Make sure you're logged in as the project owner in Supabase Dashboard

### Error: "relation already exists"
**Solution**: This is fine! It means some tables already exist. The migration will skip them.

### Error: "syntax error at or near..."
**Solution**: Make sure you copied the ENTIRE migration file without missing any lines

### Still getting 404 errors after migration?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart your dev server (`npm run dev`)
3. Check browser console for new errors

---

## 📖 Alternative: Command Line Instructions

Want detailed instructions with verification queries? Run:

```bash
node database/run-customer-migration.js
```

This will display:
- Migration statistics
- Verification queries
- Rollback procedures
- Post-migration checklist

---

## 🎯 Quick Verification

After running the migration, verify with this single query:

```sql
-- Quick verification - should return 15
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'customer%' 
  OR table_name LIKE 'product%'
  OR table_name IN ('order_holds', 'system_configuration', 'order_status_history')
);
```

**Expected Result**: `table_count: 15`

If you see 15, you're good to go! 🎉

---

## ✅ Success Checklist

- [ ] Opened Supabase Dashboard
- [ ] Ran migration in SQL Editor
- [ ] Saw "Success" message
- [ ] Verified tables exist (15 tables)
- [ ] Refreshed browser
- [ ] Tested customer signup at `/customer`
- [ ] Received OTP (or saw it in console)

---

## 🎊 After Successful Migration

Your customer portal will be fully functional with:
- ✅ Phone-based signup with OTP
- ✅ Product browsing
- ✅ Shopping cart
- ✅ Order placement
- ✅ Custom cake requests
- ✅ Payment processing
- ✅ Order tracking

**Ready to test? Go to:** `http://localhost:3000/customer`

