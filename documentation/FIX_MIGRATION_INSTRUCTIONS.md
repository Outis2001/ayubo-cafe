# 🔧 Fix Migration Instructions

## Problem
You're getting a **400 Bad Request** error when saving bills because the database columns have incorrect data types:
- `stock_quantity` and `low_stock_threshold` are `INT` instead of `DECIMAL`
- This causes issues with weight-based products (like Butter Cake, product_id 33)

## Solution
Run the fix migration to update the data types.

---

## Option 1: Run via Supabase SQL Editor (Recommended - Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `ayubo_cafe`

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Copy and Paste the Fix SQL**
   - Open `database/migrations/001_inventory_migration_fix.sql`
   - Copy all the contents
   - Paste into the SQL Editor

4. **Execute**
   - Click "Run" button
   - Wait for completion message

5. **Verify**
   - You should see success notices in the output
   - Look for: "✅ All fixes applied successfully!"

---

## Option 2: Run via Node.js Script

```bash
node database/run-fix-migration.js
```

**Note:** This requires the service_role key which has more privileges than the anon key.

If you get an error, use Option 1 instead.

---

## After Running the Fix

1. **Refresh Your Browser**
   - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - This clears cached data

2. **Test Saving a Bill**
   - Add some products to cart
   - Generate and confirm the bill
   - Stock should now update correctly

3. **Test Weight-Based Products**
   - Try adding "Butter Cake" or other weight-based items
   - Enter decimal weights (e.g., 2.5 kg)
   - Confirm bill - should work without errors

---

## What the Fix Does

✅ Changes `stock_quantity` from `INT` to `DECIMAL(10, 2)`  
✅ Changes `low_stock_threshold` from `INT` to `DECIMAL(10, 2)`  
✅ Changes `updated_time` from `TIMESTAMP` to `TIMESTAMPTZ`  
✅ Ensures `product_id` is the primary key  

---

## Verification

After running the fix, check the Supabase output for these confirmations:

```
=== MIGRATION FIX VERIFICATION ===
stock_quantity type: numeric
low_stock_threshold type: numeric
updated_time type: timestamp with time zone
product_id is primary key: true
✅ All fixes applied successfully!
```

---

## Still Having Issues?

If you still get errors after running the fix:

1. **Check the browser console** for specific error messages
2. **Verify the migration ran** by checking the column types:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'products';
   ```
3. **Check primary key**:
   ```sql
   SELECT constraint_name, column_name
   FROM information_schema.key_column_usage
   WHERE table_name = 'products' AND constraint_name LIKE '%_pkey';
   ```

---

## Summary

🔴 **Before Fix:** `stock_quantity` is INT → Can't store 2.5 kg → 400 Error  
🟢 **After Fix:** `stock_quantity` is DECIMAL → Can store 2.5 kg → ✅ Works!

