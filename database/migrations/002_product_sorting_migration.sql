-- ============================================================================
-- AYUBO CAFE PRODUCT SORTING MIGRATION
-- Version: 002
-- Date: 2025-10-12
-- Description: Creates settings table for product sorting configuration
--              Stores N value (sort window) for dynamic product sorting
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE SETTINGS TABLE
-- ============================================================================

-- Settings table stores application configuration as key-value pairs
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on setting_key for faster lookups (though it's already PK)
COMMENT ON TABLE settings IS 'Application configuration settings stored as key-value pairs';
COMMENT ON COLUMN settings.setting_key IS 'Unique identifier for the setting (e.g., product_sort_window)';
COMMENT ON COLUMN settings.setting_value IS 'Value of the setting stored as text (can be parsed as needed)';
COMMENT ON COLUMN settings.updated_at IS 'Timestamp of last update to this setting';

-- ============================================================================
-- SECTION 2: AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================

-- Reuse the existing update_updated_time_column function from products migration
-- If it doesn't exist, create it
CREATE OR REPLACE FUNCTION update_updated_time_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;

-- Create trigger on settings table to auto-update updated_at timestamp
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_time_column();

-- ============================================================================
-- SECTION 3: INSERT DEFAULT CONFIGURATION
-- ============================================================================

-- Insert default product sort window configuration
-- N = -1 means use all-time sales data for sorting
INSERT INTO settings (setting_key, setting_value, updated_at)
VALUES ('product_sort_window', '-1', NOW())
ON CONFLICT (setting_key) 
DO UPDATE SET 
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- ============================================================================
-- SECTION 4: VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- These queries are commented out but can be used to verify migration success

-- Verify settings table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'settings';

-- Verify default setting exists
-- SELECT * FROM settings WHERE setting_key = 'product_sort_window';

-- Verify trigger exists
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'settings';

-- Test trigger by updating a value
-- UPDATE settings SET setting_value = '10' WHERE setting_key = 'product_sort_window';
-- SELECT setting_key, setting_value, updated_at FROM settings;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE '=== Migration 002: Product Sorting ===';
    RAISE NOTICE '✅ Settings table created successfully';
    RAISE NOTICE '✅ Auto-update trigger configured';
    RAISE NOTICE '✅ Default configuration inserted (N=-1)';
    RAISE NOTICE '📊 Product sorting feature ready to use';
    RAISE NOTICE 'Next: Run migration script or execute in Supabase SQL Editor';
END $$;

