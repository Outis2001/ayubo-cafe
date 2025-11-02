-- ============================================================================
-- AYUBO CAFE RETURNS MANAGEMENT MIGRATION
-- Version: 008
-- Date: 2025-11-01
-- Description: Adds returns management system with batch-level inventory tracking
--              Includes: product pricing fields, inventory batches, returns tracking
-- ============================================================================

-- ============================================================================
-- SECTION 1: MODIFY PRODUCTS TABLE - ADD PRICING & RETURN FIELDS
-- ============================================================================

-- Add original_price column (cost from bakery - what we pay)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10, 2);

-- Add sale_price column (retail price - what customers pay)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);

-- Add default_return_percentage column (20 or 100)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS default_return_percentage INTEGER DEFAULT 20
CHECK (default_return_percentage IN (20, 100));

-- Set default values for existing products
-- Original price = 85% of current price (15% margin)
-- Sale price = current price
-- Default return percentage = 20%
UPDATE products 
SET 
  original_price = COALESCE(original_price, price * 0.85),
  sale_price = COALESCE(sale_price, price),
  default_return_percentage = COALESCE(default_return_percentage, 20)
WHERE original_price IS NULL OR sale_price IS NULL;

-- Make columns NOT NULL after setting defaults
ALTER TABLE products 
ALTER COLUMN original_price SET NOT NULL,
ALTER COLUMN sale_price SET NOT NULL,
ALTER COLUMN default_return_percentage SET NOT NULL;

-- Add validation: sale_price must be >= original_price
ALTER TABLE products
ADD CONSTRAINT check_sale_price_gte_original_price 
CHECK (sale_price >= original_price);

-- ============================================================================
-- SECTION 2: CREATE INVENTORY BATCHES TABLE
-- ============================================================================

-- Inventory batches track stock at batch level (by date added)
-- This enables FIFO logic and age tracking
CREATE TABLE IF NOT EXISTS inventory_batches (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity >= 0),
    date_added DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Foreign key to products table
    CONSTRAINT fk_inventory_batches_product
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id)
        ON DELETE CASCADE
);

-- Add index for efficient queries by product and date
CREATE INDEX IF NOT EXISTS idx_batches_product_date 
ON inventory_batches(product_id, date_added);

-- Add index for date queries (for age calculation)
CREATE INDEX IF NOT EXISTS idx_batches_date_added 
ON inventory_batches(date_added);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_inventory_batches_timestamp ON inventory_batches;

CREATE TRIGGER update_inventory_batches_timestamp
    BEFORE UPDATE ON inventory_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_batches_updated_at();

-- ============================================================================
-- SECTION 3: CREATE RETURNS TABLE
-- ============================================================================

-- Returns table stores high-level return transaction information
CREATE TABLE IF NOT EXISTS returns (
    id BIGSERIAL PRIMARY KEY,
    return_date DATE NOT NULL DEFAULT CURRENT_DATE,
    processed_by UUID NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    total_value DECIMAL(10, 2) NOT NULL CHECK (total_value >= 0),
    total_quantity DECIMAL(10, 2) NOT NULL CHECK (total_quantity >= 0),
    total_batches INTEGER NOT NULL CHECK (total_batches >= 0),
    notification_sent BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Foreign key to users table (who processed the return)
    CONSTRAINT fk_returns_processed_by
        FOREIGN KEY (processed_by) 
        REFERENCES users(user_id)
        ON DELETE RESTRICT
);

-- Add index on return_date for efficient date-range queries
CREATE INDEX IF NOT EXISTS idx_returns_date 
ON returns(return_date);

-- Add index on processed_by for user-specific queries
CREATE INDEX IF NOT EXISTS idx_returns_processed_by 
ON returns(processed_by);

-- Add index on processed_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_returns_processed_at 
ON returns(processed_at DESC);

-- ============================================================================
-- SECTION 4: CREATE RETURN ITEMS TABLE
-- ============================================================================

-- Return items table stores individual batch details for each return
CREATE TABLE IF NOT EXISTS return_items (
    id BIGSERIAL PRIMARY KEY,
    return_id BIGINT NOT NULL,
    product_id INTEGER,
    batch_id BIGINT,
    product_name TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    age_at_return INTEGER NOT NULL CHECK (age_at_return >= 0),
    date_batch_added DATE NOT NULL,
    original_price DECIMAL(10, 2) NOT NULL CHECK (original_price >= 0),
    sale_price DECIMAL(10, 2) NOT NULL CHECK (sale_price >= 0),
    return_percentage INTEGER NOT NULL CHECK (return_percentage IN (20, 100)),
    return_value_per_unit DECIMAL(10, 2) NOT NULL CHECK (return_value_per_unit >= 0),
    total_return_value DECIMAL(10, 2) NOT NULL CHECK (total_return_value >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Foreign key to returns table
    CONSTRAINT fk_return_items_return
        FOREIGN KEY (return_id) 
        REFERENCES returns(id)
        ON DELETE CASCADE,
    
    -- Foreign key to products table (nullable - product might be deleted)
    CONSTRAINT fk_return_items_product
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id)
        ON DELETE SET NULL,
    
    -- Foreign key to inventory_batches table (nullable - batch will be deleted on return)
    CONSTRAINT fk_return_items_batch
        FOREIGN KEY (batch_id) 
        REFERENCES inventory_batches(id)
        ON DELETE SET NULL
);

-- Add index on return_id for efficient joins
CREATE INDEX IF NOT EXISTS idx_return_items_return 
ON return_items(return_id);

-- Add index on product_id for product-specific queries
CREATE INDEX IF NOT EXISTS idx_return_items_product 
ON return_items(product_id);

-- Add index on date_batch_added for age-based queries
CREATE INDEX IF NOT EXISTS idx_return_items_date_batch_added 
ON return_items(date_batch_added);

-- ============================================================================
-- SECTION 5: ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE inventory_batches IS 'Tracks inventory at batch level by date added, enabling FIFO and age tracking';
COMMENT ON COLUMN inventory_batches.date_added IS 'Date when this batch was added via Daily Stock Check-In';
COMMENT ON COLUMN inventory_batches.quantity IS 'Current quantity remaining in this batch (decreases with sales)';

COMMENT ON TABLE returns IS 'Stores high-level return transaction information';
COMMENT ON COLUMN returns.processed_by IS 'User ID of who processed this return (owner or cashier)';
COMMENT ON COLUMN returns.notification_sent IS 'Whether email notification was sent to owner';

COMMENT ON TABLE return_items IS 'Stores detailed batch-level information for each returned item';
COMMENT ON COLUMN return_items.product_name IS 'Snapshot of product name at time of return (preserved even if product deleted)';
COMMENT ON COLUMN return_items.age_at_return IS 'Age of batch in days at time of return';
COMMENT ON COLUMN return_items.return_percentage IS 'Percentage of original price returned (20 or 100)';

COMMENT ON COLUMN products.original_price IS 'Cost from bakery (what we pay)';
COMMENT ON COLUMN products.sale_price IS 'Retail price (what customers pay)';
COMMENT ON COLUMN products.default_return_percentage IS 'Default return value: 20% or 100% of original price';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✓ Added original_price, sale_price, default_return_percentage to products
-- ✓ Created inventory_batches table with indexes and triggers
-- ✓ Created returns table with indexes
-- ✓ Created return_items table with indexes and foreign keys
-- ✓ Set default values for existing products
-- ✓ Added validation constraints
-- ✓ Added helpful comments

-- Next Steps:
-- 1. Run this migration: node database/run-migration.js (or appropriate runner)
-- 2. Run migration 009 to convert existing inventory to batches
-- 3. Test the schema with sample data
