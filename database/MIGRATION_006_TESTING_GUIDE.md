# Migration 006 - Testing Guide

## Overview
Comprehensive testing procedures to verify successful migration and proper functioning of the customer ordering system.

---

## Prerequisites

### Before Testing
- [ ] Migration 006 has been executed in Supabase SQL Editor
- [ ] No errors reported during migration execution
- [ ] Access to Supabase Dashboard (SQL Editor + Table Editor)
- [ ] Basic SQL knowledge for running queries

### Recommended Tools
- **Primary:** Supabase Dashboard (SQL Editor)
- **Alternative:** DBeaver, pgAdmin, or psql client
- **API Testing:** Postman or curl (for integration tests)

---

## Test Suite Overview

| Test Category | Test Count | Priority | Time Estimate |
|--------------|------------|----------|---------------|
| 1. Schema Verification | 6 | Critical | 5 min |
| 2. Function Testing | 6 | Critical | 10 min |
| 3. Trigger Testing | 3 | High | 8 min |
| 4. RLS Policy Testing | 5 | Critical | 12 min |
| 5. Data Integrity | 8 | High | 10 min |
| 6. Concurrency Testing | 2 | Medium | 5 min |
| **Total** | **30 tests** | - | **~50 min** |

---

## 1. Schema Verification Tests (Critical)

### Test 1.1: Verify All Tables Created
```sql
-- Expected: 15 tables
SELECT table_name, table_type 
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
  table_name LIKE 'customer%' 
  OR table_name LIKE 'product%'
  OR table_name IN ('order_holds', 'system_configuration', 'order_status_history')
)
ORDER BY table_name;
```
**Expected Result:** 15 rows (all customer/product tables)

---

### Test 1.2: Verify All Indexes Created
```sql
-- Expected: 63 indexes
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  tablename LIKE 'customer%' 
  OR tablename LIKE 'product%'
  OR tablename IN ('order_holds', 'system_configuration', 'order_status_history')
)
ORDER BY tablename, indexname;
```
**Expected Result:** 63 indexes across the 15 tables

---

### Test 1.3: Verify All Functions Created
```sql
-- Expected: 12 functions
SELECT 
  routine_name, 
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'update_updated_at_column', 'generate_order_number', 'log_order_status_change',
  'current_customer_id', 'is_staff_user', 'is_owner_user',
  'calculate_order_totals', 'validate_pickup_date', 'create_customer_order',
  'update_order_status', 'verify_payment', 'send_quote'
)
ORDER BY routine_name;
```
**Expected Result:** 12 functions

---

### Test 1.4: Verify All Triggers Created
```sql
-- Expected: 12 triggers
SELECT 
  trigger_name, 
  event_object_table as table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (
  event_object_table LIKE 'customer%' 
  OR event_object_table LIKE 'product%'
  OR event_object_table IN ('order_holds', 'system_configuration')
)
ORDER BY event_object_table, trigger_name;
```
**Expected Result:** 12 triggers (10 updated_at + 1 order_number + 1 status_history)

---

### Test 1.5: Verify RLS Policies Created
```sql
-- Expected: 32 policies
SELECT 
  schemaname,
  tablename, 
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
AND (
  tablename LIKE 'customer%'
  OR tablename IN ('order_holds', 'system_configuration')
)
ORDER BY tablename, policyname;
```
**Expected Result:** 32 RLS policies

---

### Test 1.6: Verify Default Data Populated
```sql
-- Check product categories (Expected: 8)
SELECT COUNT(*) as category_count FROM product_categories;

-- Check system configuration (Expected: 17)
SELECT COUNT(*) as config_count FROM system_configuration;

-- List categories
SELECT name, display_order FROM product_categories ORDER BY display_order;

-- List key configurations
SELECT config_key, data_type, is_public FROM system_configuration ORDER BY config_key;
```
**Expected Result:** 
- 8 categories (Birthday, Wedding, Custom, Cupcakes, Anniversary, Kids, Corporate, Seasonal)
- 17 configuration entries

---

## 2. Function Testing (Critical)

### Test 2.1: Test `calculate_order_totals()`
```sql
-- Test with default 40% deposit
SELECT * FROM calculate_order_totals(10000.00, 40);
-- Expected: deposit=4000, total=10000, remaining=6000

-- Test with custom deposit percentage
SELECT * FROM calculate_order_totals(5000.00, 30);
-- Expected: deposit=1500, total=5000, remaining=3500

-- Test validation (should error)
SELECT * FROM calculate_order_totals(-100.00, 40);
-- Expected: ERROR - Subtotal must be greater than 0

SELECT * FROM calculate_order_totals(1000.00, 150);
-- Expected: ERROR - Deposit percentage must be between 0 and 100
```

---

### Test 2.2: Test `validate_pickup_date()`
```sql
-- Test valid future date
SELECT validate_pickup_date(CURRENT_DATE + 3);
-- Expected: true

-- Test past date (should error)
SELECT validate_pickup_date(CURRENT_DATE - 1);
-- Expected: ERROR - Pickup date cannot be in the past

-- Test too soon (should error if < min advance days)
SELECT validate_pickup_date(CURRENT_DATE + 1);
-- Expected: ERROR - Orders must be placed at least 2 days in advance (if min=2)

-- Test with order hold
-- First, create an order hold
INSERT INTO order_holds (hold_date, reason, created_by, is_active) 
VALUES (CURRENT_DATE + 10, 'Test Hold', (SELECT user_id FROM users WHERE role = 'owner' LIMIT 1), true);

-- Then test validation
SELECT validate_pickup_date(CURRENT_DATE + 10);
-- Expected: ERROR - Orders are not accepted on this date

-- Cleanup
DELETE FROM order_holds WHERE reason = 'Test Hold';
```

---

### Test 2.3: Test `create_customer_order()`
```sql
-- First, create a test customer
INSERT INTO customers (phone_number, phone_verified, first_name, last_name)
VALUES ('+94771234567', true, 'Test', 'Customer')
RETURNING customer_id;
-- Save this customer_id for next step

-- Create a test order
SELECT create_customer_order(
  '<customer-uuid-from-above>'::UUID,
  'pre-made',
  CURRENT_DATE + 5,
  '14:00'::TIME,
  'Test order',
  '[
    {
      "product_id": null,
      "pricing_id": null,
      "product_name": "Test Cake",
      "quantity": 2,
      "unit_price": 2500.00,
      "weight": "1kg"
    }
  ]'::JSONB,
  40
);
-- Expected: Returns order_id (UUID)

-- Verify order was created with correct values
SELECT 
  order_number,
  subtotal,
  deposit_amount,
  total_amount,
  remaining_balance
FROM customer_orders 
WHERE customer_id = '<customer-uuid-from-above>'::UUID;
-- Expected: order_number like 'ORD-20240122-001', subtotal=5000, deposit=2000, total=5000, remaining=3000

-- Cleanup
DELETE FROM customer_orders WHERE customer_id = '<customer-uuid-from-above>'::UUID;
DELETE FROM customers WHERE phone_number = '+94771234567';
```

---

### Test 2.4: Test `update_order_status()`
```sql
-- Using the test order from 2.3 (or create a new one)
-- Update status
SELECT update_order_status(
  '<order-uuid>'::UUID,
  'confirmed',
  'deposit_paid',
  (SELECT user_id FROM users WHERE role = 'owner' LIMIT 1),
  'Test status update'
);
-- Expected: true

-- Verify status was updated and history was logged
SELECT status, payment_status FROM customer_orders WHERE order_id = '<order-uuid>'::UUID;
-- Expected: status='confirmed', payment_status='deposit_paid'

SELECT * FROM order_status_history WHERE order_id = '<order-uuid>'::UUID ORDER BY created_at DESC LIMIT 1;
-- Expected: One history record with old/new status values
```

---

### Test 2.5: Test `verify_payment()` 
```sql
-- Create test payment record
INSERT INTO customer_payments (
  order_id, customer_id, amount, payment_type, payment_method, payment_status
) VALUES (
  '<order-uuid>'::UUID,
  '<customer-uuid>'::UUID,
  2000.00,
  'deposit',
  'bank_transfer',
  'pending'
) RETURNING payment_id;

-- Verify payment
SELECT verify_payment(
  '<payment-uuid-from-above>'::UUID,
  (SELECT user_id FROM users WHERE role = 'owner' LIMIT 1),
  'Bank transfer verified manually'
);
-- Expected: true

-- Check payment status updated
SELECT payment_status, verified_at FROM customer_payments WHERE payment_id = '<payment-uuid>'::UUID;
-- Expected: payment_status='success', verified_at is NOT NULL

-- Check order status updated
SELECT status, payment_status FROM customer_orders WHERE order_id = '<order-uuid>'::UUID;
-- Expected: status='payment_verified', payment_status='deposit_paid'
```

---

### Test 2.6: Test `send_quote()`
```sql
-- Create test custom cake request
INSERT INTO custom_cake_requests (
  customer_id, reference_image_url, customer_notes,
  requested_pickup_date, requested_pickup_time, status
) VALUES (
  '<customer-uuid>'::UUID,
  'https://example.com/cake.jpg',
  'Chocolate cake for birthday',
  CURRENT_DATE + 7,
  '15:00'::TIME,
  'pending_review'
) RETURNING request_id;

-- Send quote
SELECT send_quote(
  '<request-uuid-from-above>'::UUID,
  3500.00,
  '1.5kg',
  '12-15 servings',
  '3-4 hours',
  'Chocolate sponge with buttercream',
  (SELECT user_id FROM users WHERE role = 'owner' LIMIT 1)
);
-- Expected: true

-- Verify quote was sent
SELECT status, quote_price, quote_weight, quoted_at 
FROM custom_cake_requests 
WHERE request_id = '<request-uuid>'::UUID;
-- Expected: status='quoted', quote_price=3500, quoted_at is NOT NULL

-- Verify notification was created
SELECT * FROM customer_notifications 
WHERE customer_id = '<customer-uuid>'::UUID 
AND notification_type = 'quote_received'
ORDER BY created_at DESC LIMIT 1;
-- Expected: One notification record
```

---

## 3. Trigger Testing (High Priority)

### Test 3.1: Test `updated_at` Trigger
```sql
-- Update a customer
UPDATE customers 
SET first_name = 'Updated' 
WHERE customer_id = '<customer-uuid>'::UUID;

-- Check updated_at was changed
SELECT first_name, created_at, updated_at 
FROM customers 
WHERE customer_id = '<customer-uuid>'::UUID;
-- Expected: updated_at > created_at (should be current timestamp)
```

---

### Test 3.2: Test Order Number Generation Trigger
```sql
-- Create multiple orders on same date
DO $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Create test customer
  INSERT INTO customers (phone_number, phone_verified, first_name, last_name)
  VALUES ('+94777777777', true, 'Order', 'Test')
  RETURNING customer_id INTO v_customer_id;
  
  -- Create 3 orders
  FOR i IN 1..3 LOOP
    INSERT INTO customer_orders (
      customer_id, order_type, pickup_date, pickup_time,
      subtotal, deposit_amount, total_amount, remaining_balance, order_number
    ) VALUES (
      v_customer_id, 'pre-made', CURRENT_DATE + 5, '14:00',
      5000, 2000, 5000, 3000, '' -- Empty order_number triggers auto-generation
    );
  END LOOP;
END $$;

-- Check order numbers are sequential
SELECT order_number FROM customer_orders 
WHERE customer_id = (SELECT customer_id FROM customers WHERE phone_number = '+94777777777')
ORDER BY created_at;
-- Expected: ORD-YYYYMMDD-001, ORD-YYYYMMDD-002, ORD-YYYYMMDD-003

-- Cleanup
DELETE FROM customer_orders WHERE customer_id = (SELECT customer_id FROM customers WHERE phone_number = '+94777777777');
DELETE FROM customers WHERE phone_number = '+94777777777';
```

---

### Test 3.3: Test Status History Logging Trigger
```sql
-- Create test order (reuse from previous tests)
-- Update status multiple times
UPDATE customer_orders 
SET status = 'confirmed' 
WHERE order_id = '<order-uuid>'::UUID;

UPDATE customer_orders 
SET status = 'in_preparation', payment_status = 'fully_paid'
WHERE order_id = '<order-uuid>'::UUID;

-- Check history records
SELECT 
  old_status, 
  new_status, 
  old_payment_status, 
  new_payment_status,
  changed_by_type,
  created_at
FROM order_status_history 
WHERE order_id = '<order-uuid>'::UUID
ORDER BY created_at;
-- Expected: Multiple records showing status progression
```

---

## 4. RLS Policy Testing (Critical)

### Test 4.1: Test Customer Data Isolation
```sql
-- Set session for customer 1
SET app.current_customer_id = '<customer-1-uuid>';
SET app.user_role = 'customer';

-- Try to view own orders
SELECT * FROM customer_orders WHERE customer_id = '<customer-1-uuid>'::UUID;
-- Expected: Returns rows

-- Try to view another customer's orders
SELECT * FROM customer_orders WHERE customer_id = '<customer-2-uuid>'::UUID;
-- Expected: Returns 0 rows (RLS blocks access)
```

---

### Test 4.2: Test Staff Access
```sql
-- Set session for staff
SET app.user_role = 'owner';
-- Clear customer ID
RESET app.current_customer_id;

-- Try to view all orders
SELECT COUNT(*) FROM customer_orders;
-- Expected: Returns all orders (staff can see everything)
```

---

### Test 4.3: Test Owner-Only Policies
```sql
-- Set session for cashier
SET app.user_role = 'cashier';

-- Try to create order hold (should fail)
INSERT INTO order_holds (hold_date, reason, created_by, is_active)
VALUES (CURRENT_DATE + 20, 'Test', (SELECT user_id FROM users WHERE role = 'cashier' LIMIT 1), true);
-- Expected: ERROR - RLS policy violation

-- Try to view active holds (should succeed)
SELECT * FROM order_holds WHERE is_active = true;
-- Expected: Returns rows (cashiers can view active holds)

-- Set session for owner
SET app.user_role = 'owner';

-- Try to create order hold (should succeed)
INSERT INTO order_holds (hold_date, reason, created_by, is_active)
VALUES (CURRENT_DATE + 20, 'Test Hold', (SELECT user_id FROM users WHERE role = 'owner' LIMIT 1), true);
-- Expected: Success

-- Cleanup
DELETE FROM order_holds WHERE reason = 'Test Hold';
```

---

### Test 4.4: Test Public Product Catalog Access
```sql
-- Clear all session variables
RESET app.current_customer_id;
RESET app.user_role;

-- Try to read product catalog (should work - no RLS)
SELECT * FROM product_catalog;
-- Expected: Returns rows (public access)

SELECT * FROM product_categories;
-- Expected: Returns 8 categories (public access)

SELECT * FROM product_pricing;
-- Expected: Returns rows (public access)
```

---

### Test 4.5: Test System Configuration Policies
```sql
-- Set session for customer
SET app.current_customer_id = '<customer-uuid>';
SET app.user_role = 'customer';

-- Try to view public config
SELECT * FROM system_configuration WHERE is_public = true;
-- Expected: Returns public configs (pickup slots, min days, etc.)

-- Try to view private config
SELECT * FROM system_configuration WHERE is_public = false;
-- Expected: Returns 0 rows (customers can't see private configs)

-- Set session for staff
SET app.user_role = 'owner';
RESET app.current_customer_id;

-- Try to view all config
SELECT * FROM system_configuration;
-- Expected: Returns all 17 configs (staff can see everything)
```

---

## 5. Data Integrity Tests (High Priority)

### Test 5.1: Phone Number Validation
```sql
-- Try invalid phone number
INSERT INTO customers (phone_number, phone_verified, first_name, last_name)
VALUES ('1234567890', true, 'Invalid', 'Phone');
-- Expected: ERROR - CHECK constraint violation (must be +94XXXXXXXXX)

-- Try valid phone number
INSERT INTO customers (phone_number, phone_verified, first_name, last_name)
VALUES ('+94771234568', true, 'Valid', 'Phone');
-- Expected: Success

-- Cleanup
DELETE FROM customers WHERE phone_number = '+94771234568';
```

---

### Test 5.2: Payment Math Constraint
```sql
-- Try invalid payment math
INSERT INTO customer_orders (
  customer_id, order_type, pickup_date, pickup_time,
  subtotal, deposit_amount, total_amount, remaining_balance, order_number
) VALUES (
  '<customer-uuid>'::UUID, 'pre-made', CURRENT_DATE + 5, '14:00',
  5000, 2000, 5000, 2000, '' -- deposit + remaining ≠ total!
);
-- Expected: ERROR - CHECK constraint (deposit_amount + remaining_balance = total_amount)
```

---

### Test 5.3: Order Item Total Constraint
```sql
-- Try invalid order item math
INSERT INTO customer_order_items (
  order_id, item_type, product_name, quantity, unit_price, total_price
) VALUES (
  '<order-uuid>'::UUID, 'pre-made', 'Test Cake', 2, 2500.00, 4000.00 -- Wrong total!
);
-- Expected: ERROR - CHECK constraint (total_price = unit_price * quantity)
```

---

### Test 5.4: Status Enum Validation
```sql
-- Try invalid order status
UPDATE customer_orders 
SET status = 'invalid_status' 
WHERE order_id = '<order-uuid>'::UUID;
-- Expected: ERROR - CHECK constraint (status must be in defined enum)

-- Try valid status
UPDATE customer_orders 
SET status = 'confirmed' 
WHERE order_id = '<order-uuid>'::UUID;
-- Expected: Success
```

---

### Test 5.5: Unique Gateway Transaction ID
```sql
-- Create first payment
INSERT INTO customer_payments (
  order_id, customer_id, amount, payment_type, payment_method,
  payment_status, gateway_transaction_id
) VALUES (
  '<order-uuid>'::UUID, '<customer-uuid>'::UUID, 2000, 'deposit',
  'online', 'pending', 'stripe_txn_12345'
);

-- Try duplicate gateway transaction ID
INSERT INTO customer_payments (
  order_id, customer_id, amount, payment_type, payment_method,
  payment_status, gateway_transaction_id
) VALUES (
  '<order-uuid-2>'::UUID, '<customer-uuid>'::UUID, 3000, 'deposit',
  'online', 'pending', 'stripe_txn_12345' -- Same ID!
);
-- Expected: ERROR - Unique constraint violation
```

---

### Test 5.6: Single Default Address
```sql
-- Create first default address
INSERT INTO customer_addresses (customer_id, address_line1, city, is_default)
VALUES ('<customer-uuid>'::UUID, '123 Main St', 'Colombo', true);

-- Try to create second default address for same customer
INSERT INTO customer_addresses (customer_id, address_line1, city, is_default)
VALUES ('<customer-uuid>'::UUID, '456 Side St', 'Kandy', true); -- Another default!
-- Expected: ERROR - Unique partial index violation

-- Create non-default address (should work)
INSERT INTO customer_addresses (customer_id, address_line1, city, is_default)
VALUES ('<customer-uuid>'::UUID, '789 Other St', 'Galle', false);
-- Expected: Success
```

---

### Test 5.7: One Active OTP Per Phone
```sql
-- Create first OTP
INSERT INTO customer_otp_verifications (
  phone_number, otp_code_hash, expires_at, verified
) VALUES (
  '+94771234569', 'hash123', NOW() + INTERVAL '10 minutes', false
);

-- Try to create second active OTP for same phone
INSERT INTO customer_otp_verifications (
  phone_number, otp_code_hash, expires_at, verified
) VALUES (
  '+94771234569', 'hash456', NOW() + INTERVAL '10 minutes', false
);
-- Expected: ERROR - Unique partial index violation (one active OTP per phone)
```

---

### Test 5.8: Non-Empty Product Images
```sql
-- Try to create product with empty image array
INSERT INTO product_catalog (name, description, image_urls)
VALUES ('Test Cake', 'Description', ARRAY[]::TEXT[]);
-- Expected: ERROR - CHECK constraint (array must have at least 1 element)

-- Try valid image array
INSERT INTO product_catalog (name, description, image_urls)
VALUES ('Test Cake', 'Description', ARRAY['https://example.com/cake.jpg']::TEXT[]);
-- Expected: Success

-- Cleanup
DELETE FROM product_catalog WHERE name = 'Test Cake';
```

---

## 6. Concurrency Testing (Medium Priority)

### Test 6.1: Concurrent Order Number Generation
```sql
-- This test requires multiple concurrent connections
-- Use a tool like pgbench or run multiple psql sessions simultaneously

-- Session 1, 2, 3 (run simultaneously):
INSERT INTO customer_orders (
  customer_id, order_type, pickup_date, pickup_time,
  subtotal, deposit_amount, total_amount, remaining_balance, order_number
) VALUES (
  '<customer-uuid>'::UUID, 'pre-made', CURRENT_DATE + 5, '14:00',
  5000, 2000, 5000, 3000, ''
);

-- After all inserts complete, check for duplicates:
SELECT order_number, COUNT(*) 
FROM customer_orders 
WHERE order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-%'
GROUP BY order_number 
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates - advisory lock prevents collision)
```

---

### Test 6.2: Concurrent Status Updates
```sql
-- Create test order
-- From multiple sessions, try to update status simultaneously
-- Session 1:
UPDATE customer_orders SET status = 'confirmed' WHERE order_id = '<order-uuid>'::UUID;

-- Session 2 (run at same time):
UPDATE customer_orders SET status = 'in_preparation' WHERE order_id = '<order-uuid>'::UUID;

-- Check status history
SELECT COUNT(*) FROM order_status_history WHERE order_id = '<order-uuid>'::UUID;
-- Expected: 2 records (both updates logged, one transaction waited for the other)
```

---

## Test Results Summary

### Pass/Fail Checklist
After running all tests, complete this checklist:

- [ ] All 15 tables created
- [ ] All 63 indexes created
- [ ] All 12 functions working
- [ ] All 12 triggers functioning
- [ ] All 32 RLS policies active
- [ ] Default data populated (8 categories, 17 configs)
- [ ] Phone number validation working
- [ ] Payment math constraints enforced
- [ ] Order number generation unique
- [ ] Status history logging accurate
- [ ] RLS customer isolation working
- [ ] RLS staff access working
- [ ] Concurrency handling verified

### Troubleshooting Common Issues

**Issue:** RLS policies blocking legitimate access  
**Solution:** Check session variables are set correctly:
```sql
SHOW app.current_customer_id;
SHOW app.user_role;
```

**Issue:** Order number duplicates  
**Solution:** Verify advisory lock function is used (check function definition includes `pg_advisory_xact_lock`)

**Issue:** Can't insert data into tables  
**Solution:** Disable RLS temporarily for testing:
```sql
ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable after testing!
```

---

## Production Readiness Checklist

Before deploying to production:

- [ ] All 30 tests passed
- [ ] No constraint violations found
- [ ] RLS policies tested with real user scenarios
- [ ] Concurrency testing shows no duplicates
- [ ] Performance acceptable (< 100ms for order creation)
- [ ] Rollback procedure tested in dev environment
- [ ] Backup strategy confirmed
- [ ] Monitoring/alerting configured
- [ ] Documentation reviewed by team
- [ ] Code review completed

---

## Next Steps After Testing

1. **Update Configuration:**
   - Set SMS webhook URL in system_configuration
   - Update bank account details
   - Configure Stripe API keys

2. **Populate Product Data:**
   - Add products to product_catalog
   - Create pricing options for each product
   - Map products to categories

3. **Test Application Integration:**
   - Test customer signup flow
   - Test order creation via application
   - Test payment webhooks

4. **Deploy to Production:**
   - Run migration on production database
   - Verify all tests pass in production
   - Monitor for errors

---

**Testing Complete! Ready for Production Deployment! 🚀**

