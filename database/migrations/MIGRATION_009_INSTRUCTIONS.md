# 🔧 Migration 009: Convert Existing Inventory to Batches

## Overview

This migration converts your existing `stock_quantity` data into the new batch-based inventory system. It creates "Day 0" batches for all products that currently have stock.

## Prerequisites

✅ **Migration 008 must be completed first!**

Run this migration ONLY after migration 008 has been successfully applied.

## What This Migration Does

1. ✅ Creates backup of current stock quantities
2. ✅ Converts all `stock_quantity > 0` to inventory batches
3. ✅ Sets all batches to `CURRENT_DATE` (Day 0)
4. ✅ Verifies total quantities match
5. ✅ Generates detailed report

## Step-by-Step Instructions

### Step 1: Verify Migration 008 Complete

Run this in SQL Editor to check:
```sql
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inventory_batches'
) AS batches_table_exists;
```

Should return: `true`

### Step 2: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your **Ayubo Cafe** project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"** button

### Step 3: Copy and Run Migration

1. Open this file: `database/migrations/009_batch_tracking_data_migration.sql`
2. Copy the **entire contents** (Ctrl+A, then Ctrl+C)
3. Paste into SQL Editor (Ctrl+V)
4. Click **"Run"** button (Ctrl+Enter)

### Step 4: Review Verification Report

After running, you should see output like:
```
NOTICE: ============================================================
NOTICE: MIGRATION 009 VERIFICATION REPORT
NOTICE: ============================================================
NOTICE: Products with stock before migration: X
NOTICE: Batches created: X
NOTICE: Total stock quantity before: X.XX
NOTICE: Total stock quantity after: X.XX
NOTICE: ------------------------------------------------------------
NOTICE: ✓ SUCCESS: Stock quantities match!
NOTICE: ============================================================
```

✅ **Check that "Before" and "After" totals match!**

### Step 5: Manual Verification (Optional)

Run this to see detailed results:
```sql
-- View products with their batches
SELECT 
    p.product_id,
    p.name,
    pb.stock_quantity AS original_stock,
    ib.quantity AS batch_stock,
    ib.date_added AS batch_date
FROM products p
LEFT JOIN products_stock_backup_migration_009 pb 
    ON p.product_id = pb.product_id
LEFT JOIN inventory_batches ib 
    ON p.product_id = ib.product_id
WHERE pb.stock_quantity IS NOT NULL
ORDER BY p.product_id;
```

Each product should show:
- `original_stock` = original quantity
- `batch_stock` = same quantity
- `batch_date` = today's date

## Backup Table

A backup table is created automatically:
- **Table:** `products_stock_backup_migration_009`
- **Purpose:** Stores original stock quantities before migration
- **Keep This:** Don't delete unless you're certain the migration succeeded

## Rollback Instructions

If you need to rollback this migration:

```sql
-- 1. Restore stock quantities from backup
UPDATE products p
SET stock_quantity = b.stock_quantity
FROM products_stock_backup_migration_009 b
WHERE p.product_id = b.product_id;

-- 2. Delete batches created today
DELETE FROM inventory_batches
WHERE date_added = CURRENT_DATE;

-- 3. Drop backup table
DROP TABLE IF EXISTS products_stock_backup_migration_009;
```

**Only rollback if batches don't match or there are errors!**

## What Happens Next

After this migration:

1. ✅ All existing stock is converted to batches
2. ✅ Stock ages start at "Day 0" (today)
3. ✅ Future stock check-ins create new batches
4. ✅ Sales deduct from batches using FIFO

## Testing Checklist

After both migrations complete:

- [ ] Verify batches exist in `inventory_batches` table
- [ ] Check Returns page displays batches correctly
- [ ] Confirm age badges show "Day 0" (or Day 1 if it's tomorrow)
- [ ] Test adding new stock (creates new batch)
- [ ] Test making a sale (deducts from batch)
- [ ] Verify return processing works

## Troubleshooting

### "No batches created"
- Check if any products have `stock_quantity > 0`
- Run: `SELECT COUNT(*) FROM products WHERE stock_quantity > 0;`

### "Stock quantities don't match"
- Review the backup table for discrepancies
- Check if products were modified during migration
- Consider rolling back and trying again

### "Constraint violation"
- Make sure Migration 008 completed successfully
- Check that `inventory_batches` table exists

### Migration already ran
- This migration is idempotent (safe to run multiple times)
- It will NOT create duplicate batches
- Just review the report for confirmation

## Next Steps

After successful migration:

1. **Test the Returns page** in your app
2. **Verify batch tracking** by making a test sale
3. **Add new stock** and confirm new batches are created
4. **Process a return** to verify full workflow

## Important Notes

⚠️ **Don't clear `stock_quantity` yet!**
- The old column is kept for backward compatibility
- Clear it only after extensive testing
- See Section 5 of the SQL file for instructions

🎯 **All batches are Day 0**
- Today's date is the starting age
- Tomorrow they'll become Day 1
- This is normal and expected

📊 **Monitor the first few days**
- Check Returns page daily
- Verify age calculations work correctly
- Ensure sales deduct properly

