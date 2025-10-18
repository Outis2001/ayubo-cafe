# Database Migrations

## How to Run Migrations

The Supabase JavaScript client doesn't support raw SQL execution for security reasons. To run migrations, follow these steps:

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Log in to your account
   - Select your project: `vvemwvrjkxzqtzdcxajn`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Copy Migration SQL**
   - Open the migration file you want to run (see Migration Status below)
   - Copy the entire contents
   - Paste into the SQL Editor

4. **Execute Migration**
   - Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for completion message
   - Check for any errors in the output panel

5. **Verify Migration**
   - Go to "Table Editor" in the left sidebar
   - Check that the `products` table has new columns: `stock_quantity`, `low_stock_threshold`, `updated_time`, `product_id`
   - Check that new tables exist: `orders`, `order_items`

### Option 2: PostgreSQL Client (Advanced)

If you have direct PostgreSQL access:

```bash
# Using psql
psql "postgresql://[user]:[password]@[host]:5432/postgres" -f database/migrations/001_inventory_migration.sql

# Or using pgAdmin, DBeaver, etc.
# Connect to your Supabase database and run the script
```

### Migration Status

- ✅ `001_inventory_migration.sql` - Inventory Management (REQUIRED - run first)
- ✅ `002_product_sorting_migration.sql` - Dynamic Product Sorting (run after 001)
- 🔧 `003_fix_trigger_conflict.sql` - **IMPORTANT FIX** (run if you get "record 'new' has no field 'updated_at'" errors)

### Current Migration: 001_inventory_migration.sql

This migration includes:
- ✅ Adds `stock_quantity` column to `products` table
- ✅ Adds `low_stock_threshold` column to `products` table  
- ✅ Adds `updated_time` column to `products` table with auto-update trigger
- ✅ Renames `id` column to `product_id` in `products` table
- ✅ Creates `orders` table with proper schema
- ✅ Creates `order_items` table with foreign key relationships
- ✅ Migrates existing `bills` data to new `orders` and `order_items` structure
- ✅ Creates backup of `bills` table before migration

---

## Migration 002: Dynamic Product Sorting

**File:** `database/migrations/002_product_sorting_migration.sql`

**Prerequisites:** Migration 001 must be completed first

**What it does:**
- ✅ Creates `settings` table for application configuration
- ✅ Adds auto-update trigger for `updated_at` timestamp
- ✅ Inserts default configuration: `product_sort_window = -1` (all-time sales)
- ✅ Enables dynamic product sorting by sales performance

**Running the migration:**

1. Follow the steps in "Option 1: Supabase Dashboard" above
2. Use file: `database/migrations/002_product_sorting_migration.sql`
3. Or run the helper script: `node database/run-sorting-migration.js`

**Verification queries:**

```sql
-- Check settings table exists
SELECT table_name FROM information_schema.tables WHERE table_name = 'settings';

-- Verify default setting
SELECT * FROM settings WHERE setting_key = 'product_sort_window';

-- Check trigger exists
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'settings';
```

**Expected results:**
- Settings table exists
- Default setting: `product_sort_window | -1 | [timestamp]`
- Trigger: `update_settings_updated_at`

---

## Migration 003: Fix Trigger Conflict 🔧

**File:** `database/migrations/003_fix_trigger_conflict.sql`

**Prerequisites:** Migrations 001 and 002 must be completed first

**When to run this:**
If you encounter this error when saving bills:
```
record "new" has no field "updated_at"
```

**What it does:**
- ⚠️ Fixes trigger function conflict between products and settings tables
- ✅ Creates separate trigger functions for each table:
  - `update_products_updated_time_column()` for products table (uses `updated_time`)
  - `update_settings_updated_at_column()` for settings table (uses `updated_at`)
- ✅ Updates both triggers to use the correct functions

**Why this is needed:**
Migration 002 accidentally overwrote the trigger function from Migration 001, causing the products table trigger to fail. This migration creates separate functions to prevent conflicts.

**Running the migration:**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `database/migrations/003_fix_trigger_conflict.sql`
3. Paste and click "Run"
4. Check for success messages in the output

**Verification queries:**

```sql
-- Check trigger functions exist
SELECT proname FROM pg_proc WHERE proname LIKE '%update%time%';

-- Check triggers are set up correctly
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE event_object_table IN ('products', 'settings');
```

**Expected results:**
- Two functions: `update_products_updated_time_column` and `update_settings_updated_at_column`
- Two triggers: `update_products_updated_time` on products, `update_settings_updated_at` on settings

---

### Post-Migration Verification (Migration 001)

After running migration 001, you can verify it succeeded by running these queries in the SQL Editor:

```sql
-- Check products table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products';

-- Count migrated orders
SELECT COUNT(*) as total_orders FROM orders;

-- Count migrated order items
SELECT COUNT(*) as total_order_items FROM order_items;

-- Verify data integrity
SELECT 
  (SELECT SUM(value) FROM orders) as orders_total,
  (SELECT SUM(total) FROM bills) as bills_total;
```

