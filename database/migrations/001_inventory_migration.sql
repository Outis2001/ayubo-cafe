-- ============================================================================
-- AYUBO CAFE INVENTORY MANAGEMENT MIGRATION
-- Version: 001
-- Date: 2025-10-10
-- Description: Adds inventory tracking, creates orders/order_items tables,
--              and migrates existing bills data to new structure
-- ============================================================================

-- ============================================================================
-- SECTION 1: BACKUP EXISTING BILLS TABLE
-- ============================================================================

-- Create backup of bills table before migration (for safety)
CREATE TABLE IF NOT EXISTS bills_backup AS SELECT * FROM bills;

-- ============================================================================
-- SECTION 2: MODIFY PRODUCTS TABLE
-- ============================================================================

-- Add stock_quantity column (tracks current inventory)
-- Using DECIMAL to support weight-based products (e.g., 2.5 kg of cake)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0
CHECK (stock_quantity >= 0);

-- Add low_stock_threshold column (customizable alert threshold per product)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS low_stock_threshold DECIMAL(10, 2) NOT NULL DEFAULT 5
CHECK (low_stock_threshold >= 0);

-- Add updated_time column (automatically updates on any row modification)
-- Using TIMESTAMPTZ for timezone-aware timestamps
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS updated_time TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to automatically update updated_time on row changes
CREATE OR REPLACE FUNCTION update_updated_time_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_time = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS update_products_updated_time ON products;

-- Create trigger on products table
CREATE TRIGGER update_products_updated_time
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_time_column();

-- Rename id column to product_id (more explicit naming)
-- Note: Check if column already renamed to avoid error
DO $$ 
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.columns 
              WHERE table_name='products' AND column_name='id') THEN
        ALTER TABLE products RENAME COLUMN id TO product_id;
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: CREATE ORDERS TABLE
-- ============================================================================

-- Orders table stores high-level order information
CREATE TABLE IF NOT EXISTS orders (
    order_id BIGSERIAL PRIMARY KEY,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    value DECIMAL(10, 2) NOT NULL CHECK (value > 0)
);

-- Add index on order_date for faster date-range queries
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);

-- ============================================================================
-- SECTION 4: CREATE ORDER_ITEMS TABLE
-- ============================================================================

-- Order_items table stores individual products within each order
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id INT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal > 0),
    
    -- Foreign key constraints
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) 
        REFERENCES orders(order_id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) 
        REFERENCES products(product_id)
        ON DELETE RESTRICT
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ============================================================================
-- SECTION 5: MIGRATE BILLS DATA TO ORDERS/ORDER_ITEMS
-- ============================================================================

-- This migration groups bill items by date/paid_amount/balance to reconstruct orders
-- Each unique combination represents a single customer transaction

DO $$
DECLARE
    bill_record RECORD;
    new_order_id BIGINT;
    order_total DECIMAL(10, 2);
BEGIN
    -- Only run if bills table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bills') THEN
        
        -- Loop through unique order groups (grouped by date, paid_amount, balance)
        FOR bill_record IN 
            SELECT DISTINCT 
                date, 
                paid_amount, 
                balance,
                MIN(created_at) as order_time
            FROM bills
            GROUP BY date, paid_amount, balance
            ORDER BY MIN(created_at)
        LOOP
            -- Calculate order total from the group
            SELECT SUM(total) INTO order_total
            FROM bills
            WHERE date = bill_record.date 
                AND paid_amount = bill_record.paid_amount 
                AND balance = bill_record.balance;
            
            -- Insert into orders table
            INSERT INTO orders (order_date, value)
            VALUES (
                COALESCE(bill_record.order_time, CURRENT_TIMESTAMP),
                COALESCE(order_total, 0)
            )
            RETURNING order_id INTO new_order_id;
            
            -- Insert all items from this order group into order_items
            INSERT INTO order_items (order_id, product_id, quantity, subtotal)
            SELECT 
                new_order_id,
                COALESCE(product_id, 0), -- Use product_id if available, else 0
                quantity,
                total
            FROM bills
            WHERE date = bill_record.date 
                AND paid_amount = bill_record.paid_amount 
                AND balance = bill_record.balance;
        END LOOP;
        
        -- Add comment to bills table marking it as deprecated
        COMMENT ON TABLE bills IS 'DEPRECATED: Historical data only. Use orders and order_items tables for new transactions. Last migration: 2025-10-10';
        
    END IF;
END $$;

-- ============================================================================
-- SECTION 6: VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- These queries are commented out but can be used to verify migration success

-- Count total orders migrated
-- SELECT COUNT(*) as total_orders FROM orders;

-- Count total order items migrated
-- SELECT COUNT(*) as total_order_items FROM order_items;

-- Verify revenue totals match
-- SELECT SUM(value) as total_revenue FROM orders;
-- SELECT SUM(total) as total_revenue FROM bills;

-- Check for orphaned order items (should return 0)
-- SELECT COUNT(*) FROM order_items oi 
-- WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = oi.order_id);

-- Check for invalid product references (should return 0)
-- SELECT COUNT(*) FROM order_items oi 
-- WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.product_id = oi.product_id);

-- ============================================================================
-- SECTION 7: ENABLE ROW LEVEL SECURITY (Optional, for Supabase)
-- ============================================================================

-- Uncomment if using Supabase RLS policies

-- Enable RLS on new tables
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: Allow all authenticated users to read orders
-- CREATE POLICY "Allow authenticated read access" ON orders
--     FOR SELECT
--     USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated read access" ON order_items
--     FOR SELECT
--     USING (auth.role() = 'authenticated');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 001_inventory_migration completed successfully';
    RAISE NOTICE 'Products table updated with inventory columns';
    RAISE NOTICE 'Orders and order_items tables created';
    RAISE NOTICE 'Bills data migrated to new structure';
    RAISE NOTICE 'Please verify data integrity before deploying to production';
END $$;