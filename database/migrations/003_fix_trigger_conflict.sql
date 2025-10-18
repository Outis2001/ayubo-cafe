-- ============================================================================
-- AYUBO CAFE TRIGGER FIX MIGRATION
-- Version: 003
-- Date: 2025-10-12
-- Description: Fixes trigger function conflict between products and settings tables
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE SEPARATE TRIGGER FUNCTIONS
-- ============================================================================

-- Function for products table (uses updated_time column)
CREATE OR REPLACE FUNCTION update_products_updated_time_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_time = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function for settings table (uses updated_at column)
CREATE OR REPLACE FUNCTION update_settings_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- SECTION 2: UPDATE TRIGGERS TO USE CORRECT FUNCTIONS
-- ============================================================================

-- Drop and recreate products trigger with correct function
DROP TRIGGER IF EXISTS update_products_updated_time ON products;
CREATE TRIGGER update_products_updated_time
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_updated_time_column();

-- Drop and recreate settings trigger with correct function
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify triggers are set up correctly
DO $$
DECLARE
    products_trigger_count INT;
    settings_trigger_count INT;
BEGIN
    -- Check products trigger
    SELECT COUNT(*) INTO products_trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'products'
      AND trigger_name = 'update_products_updated_time';
    
    -- Check settings trigger
    SELECT COUNT(*) INTO settings_trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'settings'
      AND trigger_name = 'update_settings_updated_at';
    
    IF products_trigger_count = 1 THEN
        RAISE NOTICE '✅ Products trigger configured correctly';
    ELSE
        RAISE WARNING '⚠️ Products trigger not found';
    END IF;
    
    IF settings_trigger_count = 1 THEN
        RAISE NOTICE '✅ Settings trigger configured correctly';
    ELSE
        RAISE WARNING '⚠️ Settings trigger not found';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 003 completed: Trigger conflict fixed';
END $$;

