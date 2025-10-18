-- ============================================================================
-- AYUBO CAFE INVENTORY MIGRATION FIX
-- Version: 001-fix
-- Date: 2025-10-11
-- Description: Fixes data types and ensures primary key is properly set
-- ============================================================================

-- ============================================================================
-- FIX 1: Update stock_quantity and low_stock_threshold to DECIMAL
-- ============================================================================

-- Drop existing columns if they have wrong type
DO $$ 
BEGIN
    -- Alter stock_quantity to DECIMAL if it exists as INT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' 
        AND column_name='stock_quantity'
        AND data_type IN ('integer', 'smallint', 'bigint')
    ) THEN
        ALTER TABLE products 
        ALTER COLUMN stock_quantity TYPE DECIMAL(10, 2);
    END IF;
    
    -- Alter low_stock_threshold to DECIMAL if it exists as INT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' 
        AND column_name='low_stock_threshold'
        AND data_type IN ('integer', 'smallint', 'bigint')
    ) THEN
        ALTER TABLE products 
        ALTER COLUMN low_stock_threshold TYPE DECIMAL(10, 2);
    END IF;
END $$;

-- ============================================================================
-- FIX 2: Ensure product_id is the primary key
-- ============================================================================

DO $$ 
BEGIN
    -- Check if product_id is the primary key, if not, set it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'products'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND kcu.column_name = 'product_id'
    ) THEN
        -- Drop old primary key if exists on 'id' column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE table_name = 'products' 
              AND constraint_type = 'PRIMARY KEY'
              AND constraint_name LIKE '%_pkey'
        ) THEN
            ALTER TABLE products DROP CONSTRAINT products_pkey;
        END IF;
        
        -- Add primary key on product_id
        ALTER TABLE products ADD PRIMARY KEY (product_id);
    END IF;
END $$;

-- ============================================================================
-- FIX 3: Update timestamp column to use TIMESTAMPTZ
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' 
        AND column_name='updated_time'
        AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE products 
        ALTER COLUMN updated_time TYPE TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the fixes
DO $$
DECLARE
    stock_type TEXT;
    threshold_type TEXT;
    time_type TEXT;
    has_pk BOOLEAN;
BEGIN
    -- Check data types
    SELECT data_type INTO stock_type
    FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stock_quantity';
    
    SELECT data_type INTO threshold_type
    FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'low_stock_threshold';
    
    SELECT data_type INTO time_type
    FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'updated_time';
    
    -- Check primary key
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'products'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND kcu.column_name = 'product_id'
    ) INTO has_pk;
    
    -- Report results
    RAISE NOTICE '=== MIGRATION FIX VERIFICATION ===';
    RAISE NOTICE 'stock_quantity type: %', stock_type;
    RAISE NOTICE 'low_stock_threshold type: %', threshold_type;
    RAISE NOTICE 'updated_time type: %', time_type;
    RAISE NOTICE 'product_id is primary key: %', has_pk;
    
    IF stock_type = 'numeric' AND threshold_type = 'numeric' AND has_pk THEN
        RAISE NOTICE '✅ All fixes applied successfully!';
    ELSE
        RAISE WARNING '⚠️ Some fixes may not have been applied correctly';
    END IF;
END $$;

