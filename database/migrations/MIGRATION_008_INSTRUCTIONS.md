# 🔧 Migration 008: Returns Management Schema

## Fixed Issue ✅

The migration has been updated to correctly reference the `users` table:
- Changed `processed_by` from `INTEGER` to `UUID`
- Fixed foreign key reference from `users(id)` to `users(user_id)`

## Step-by-Step Migration Instructions

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Log in to your account
3. Select your **Ayubo Cafe** project

### Step 2: Open SQL Editor
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"** button (top right)

### Step 3: Copy Migration SQL
1. Open this file: `database/migrations/008_returns_management_schema.sql`
2. Copy the **entire contents** (Ctrl+A, then Ctrl+C)

### Step 4: Run the Migration
1. Paste the SQL into the Supabase SQL Editor (Ctrl+V)
2. Click the **"Run"** button (or press Ctrl+Enter)
3. Wait for it to complete

### Step 5: Verify Success
You should see:
- ✅ No errors in the output
- ✅ Tables created: `inventory_batches`, `returns`, `return_items`
- ✅ Columns added to `products` table

### Step 6: Optional Verification Query
Run this in SQL Editor to verify:
```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('inventory_batches', 'returns', 'return_items');

-- Check products columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('original_price', 'sale_price', 'default_return_percentage');
```

Expected: All 3 tables exist, all 3 columns added to products

## Next Steps

After running Migration 008 successfully:

1. **Run Migration 009** to convert existing inventory to batches
   - See `database/migrations/MIGRATION_009_INSTRUCTIONS.md`

2. **Test the Returns page** in your app
   - Navigate to Returns page
   - Verify batches display correctly

## What This Migration Does

- ✅ Adds `original_price`, `sale_price`, `default_return_percentage` to products
- ✅ Creates `inventory_batches` table for batch-level tracking
- ✅ Creates `returns` table for return transactions
- ✅ Creates `return_items` table for detailed return records
- ✅ Sets default values for existing products
- ✅ Adds proper indexes and foreign keys
- ✅ Adds validation constraints

## Troubleshooting

**Error: "column already exists"**
- Some columns may already exist from a previous partial run
- The migration uses `IF NOT EXISTS` and should be safe to rerun

**Error: "table already exists"**
- The migration uses `IF NOT EXISTS` and should be safe to rerun

**Error: "constraint already exists"**
- Some constraints may already exist
- The migration should handle this gracefully

If you encounter any errors, share the full error message for assistance.

