# 🔧 URGENT: Run Migration 003 to Fix Trigger Error

## ⚠️ The Problem

You're getting this error when saving bills:
```
record "new" has no field "updated_at"
```

This happens because Migration 002 accidentally overwrote a trigger function from Migration 001, breaking the products table updates.

## ✅ The Solution

Run Migration 003 to create separate trigger functions for each table.

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Log in to your account
3. Select your Ayubo Cafe project

### Step 2: Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. Click the **"New Query"** button (top right)

### Step 3: Copy Migration SQL
1. Open this file: `database/migrations/003_fix_trigger_conflict.sql`
2. Copy the **entire contents** (Ctrl+A, then Ctrl+C)

### Step 4: Run the Migration
1. Paste the SQL into the Supabase SQL Editor (Ctrl+V)
2. Click the **"Run"** button (or press Ctrl+Enter)
3. Wait for it to complete (should take less than 1 second)

### Step 5: Verify Success
You should see these messages in the output:
- ✅ `NOTICE: ✅ Products trigger configured correctly`
- ✅ `NOTICE: ✅ Settings trigger configured correctly`
- ✅ `NOTICE: ✅ Migration 003 completed: Trigger conflict fixed`

### Step 6: Test
1. **Hard refresh your browser**: Press `Ctrl + Shift + R`
2. Try saving a bill with products
3. It should work without errors! 🎉

## 🔍 Verification (Optional)

If you want to verify the fix worked, run this in SQL Editor:

```sql
-- Check both trigger functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('update_products_updated_time_column', 'update_settings_updated_at_column');

-- Check both triggers are set up
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table IN ('products', 'settings');
```

Expected output:
- 2 functions found
- 2 triggers found (one for products, one for settings)

## ❓ Troubleshooting

**Q: What if I see errors when running the migration?**
A: Copy the error message and let me know. The migration is safe to re-run multiple times.

**Q: Will this affect my existing data?**
A: No! This only fixes the trigger functions. Your data remains unchanged.

**Q: Do I need to restart my app?**
A: Just hard refresh your browser (Ctrl + Shift + R). No need to restart the dev server.

---

## 🚀 After Fixing

Once the migration is complete, your billing system will:
- ✅ Save bills successfully
- ✅ Update stock quantities correctly
- ✅ Update product timestamps properly
- ✅ Sort products by sales performance
- ✅ Show sales badges to owners

