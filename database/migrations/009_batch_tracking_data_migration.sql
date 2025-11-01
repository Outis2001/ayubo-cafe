-- ============================================================================
-- AYUBO CAFE BATCH TRACKING DATA MIGRATION
-- Version: 009
-- Date: 2025-11-01
-- Description: Converts existing stock_quantity data to batch-based inventory
--              Creates Day 0 batches for all products with current stock > 0
-- ============================================================================

-- IMPORTANT: Run this AFTER migration 008_returns_management_schema.sql
-- This migration is idempotent - safe to run multiple times

-- ============================================================================
-- SECTION 1: BACKUP EXISTING DATA
-- ============================================================================

-- Create backup table with current stock quantities (for safety)
CREATE TABLE IF NOT EXISTS products_stock_backup_migration_009 AS 
SELECT 
    product_id, 
    name, 
    stock_quantity, 
    created_at AS backup_created_at
FROM products
WHERE stock_quantity > 0;

-- Add metadata to backup
COMMENT ON TABLE products_stock_backup_migration_009 IS 
'Backup of stock_quantity before migration 009 - Created: ' || CURRENT_TIMESTAMP::TEXT;

-- ============================================================================
-- SECTION 2: CONVERT EXISTING STOCK TO BATCHES
-- ============================================================================

-- Insert batches for all products with stock_quantity > 0
-- Set date_added = CURRENT_DATE (Day 0)
INSERT INTO inventory_batches (product_id, quantity, date_added, created_at, updated_at)
SELECT 
    product_id,
    stock_quantity AS quantity,
    CURRENT_DATE AS date_added,
    NOW() AS created_at,
    NOW() AS updated_at
FROM products
WHERE stock_quantity > 0
  -- Avoid duplicate batches if migration is run multiple times
  AND NOT EXISTS (
    SELECT 1 
    FROM inventory_batches ib 
    WHERE ib.product_id = products.product_id 
      AND ib.date_added = CURRENT_DATE
  );

-- ============================================================================
-- SECTION 3: VERIFICATION & REPORTING
-- ============================================================================

-- Count products migrated
DO $$ 
DECLARE
    v_products_with_stock INTEGER;
    v_batches_created INTEGER;
    v_total_stock_before DECIMAL(10, 2);
    v_total_stock_after DECIMAL(10, 2);
BEGIN
    -- Count products that had stock
    SELECT COUNT(*) INTO v_products_with_stock
    FROM products_stock_backup_migration_009;
    
    -- Count batches created today
    SELECT COUNT(*) INTO v_batches_created
    FROM inventory_batches
    WHERE date_added = CURRENT_DATE;
    
    -- Sum total stock before
    SELECT COALESCE(SUM(stock_quantity), 0) INTO v_total_stock_before
    FROM products_stock_backup_migration_009;
    
    -- Sum total stock after (from batches)
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_stock_after
    FROM inventory_batches
    WHERE date_added = CURRENT_DATE;
    
    -- Report results
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'MIGRATION 009 VERIFICATION REPORT';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Products with stock before migration: %', v_products_with_stock;
    RAISE NOTICE 'Batches created: %', v_batches_created;
    RAISE NOTICE 'Total stock quantity before: %', v_total_stock_before;
    RAISE NOTICE 'Total stock quantity after: %', v_total_stock_after;
    RAISE NOTICE '------------------------------------------------------------';
    
    IF v_total_stock_before = v_total_stock_after THEN
        RAISE NOTICE '✓ SUCCESS: Stock quantities match!';
    ELSE
        RAISE WARNING '✗ WARNING: Stock quantities do not match!';
        RAISE WARNING '  Before: %, After: %', v_total_stock_before, v_total_stock_after;
    END IF;
    
    RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- SECTION 4: VERIFICATION QUERIES (FOR MANUAL CHECKING)
-- ============================================================================

-- Query to verify migration results
-- Uncomment to run manually:

/*
-- View products with their original stock and new batches
SELECT 
    p.product_id,
    p.name,
    pb.stock_quantity AS original_stock,
    ib.quantity AS batch_stock,
    ib.date_added AS batch_date,
    ib.created_at AS batch_created
FROM products p
LEFT JOIN products_stock_backup_migration_009 pb 
    ON p.product_id = pb.product_id
LEFT JOIN inventory_batches ib 
    ON p.product_id = ib.product_id
WHERE pb.stock_quantity IS NOT NULL
ORDER BY p.product_id;

-- Summary statistics
SELECT 
    'Products with stock' AS metric,
    COUNT(*) AS count
FROM products_stock_backup_migration_009
UNION ALL
SELECT 
    'Batches created' AS metric,
    COUNT(*) AS count
FROM inventory_batches
WHERE date_added = CURRENT_DATE
UNION ALL
SELECT 
    'Total original stock' AS metric,
    SUM(stock_quantity) AS count
FROM products_stock_backup_migration_009
UNION ALL
SELECT 
    'Total batch stock' AS metric,
    SUM(quantity) AS count
FROM inventory_batches
WHERE date_added = CURRENT_DATE;
*/

-- ============================================================================
-- SECTION 5: OPTIONAL - CLEAR OLD STOCK_QUANTITY VALUES
-- ============================================================================

-- IMPORTANT: Only run this section after verifying batches are correct!
-- This section is commented out for safety.
-- Uncomment and run manually when ready.

/*
-- Option 1: Zero out stock_quantity (keep column for backward compatibility)
UPDATE products
SET stock_quantity = 0
WHERE stock_quantity > 0;

-- Option 2: Add comment indicating stock is now tracked in batches
COMMENT ON COLUMN products.stock_quantity IS 
'DEPRECATED: Stock is now tracked in inventory_batches table. This column maintained for backward compatibility only.';
*/

-- ============================================================================
-- SECTION 6: ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback this migration:
/*
-- 1. Restore stock quantities from backup
UPDATE products p
SET stock_quantity = b.stock_quantity
FROM products_stock_backup_migration_009 b
WHERE p.product_id = b.product_id;

-- 2. Delete batches created by this migration
DELETE FROM inventory_batches
WHERE date_added = CURRENT_DATE;

-- 3. Drop backup table
DROP TABLE IF EXISTS products_stock_backup_migration_009;
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✓ Created backup of current stock quantities
-- ✓ Created Day 0 batches for all products with stock > 0
-- ✓ Verified total quantities match
-- ✓ Migration is idempotent (safe to run multiple times)

-- Next Steps:
-- 1. Review the verification report above
-- 2. Run manual verification queries (in Section 4)
-- 3. Verify batches were created correctly
-- 4. Once confirmed, optionally clear stock_quantity values (Section 5)
-- 5. Test the application with batch-based inventory

-- Notes:
-- - Backup table: products_stock_backup_migration_009
-- - All batches created with date_added = CURRENT_DATE (Day 0)
-- - Original stock_quantity column is preserved for backward compatibility
-- - Rollback instructions provided in Section 6

