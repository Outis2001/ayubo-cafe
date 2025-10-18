# PRD: Inventory Management System

## Introduction/Overview

The Ayubo Cafe billing system currently lacks inventory tracking, which can lead to overselling products and operational inefficiencies. This feature adds comprehensive inventory management that allows cashiers and owners to track product stock levels in real-time, receive low-stock alerts, and prevent out-of-stock items from being sold.

The system will migrate the current database schema to a more robust structure with proper order tracking and inventory management, supporting both unit-based products (e.g., pastries) and weight-based products (e.g., cakes sold by kilogram).

## Goals

1. Enable real-time inventory tracking for all products (unit-based and weight-based)
2. Prevent overselling by disabling out-of-stock products in the billing interface
3. Provide visual low-stock warnings with customizable thresholds per product
4. Implement daily stock check-in workflow for cashiers and owners
5. Maintain accurate inventory records through automatic deduction on bill confirmation
6. Migrate existing data to new normalized database schema without data loss

## User Stories

1. **As a cashier**, I want to see available stock quantities on product cards so that I know which items are available before adding them to cart.

2. **As a cashier**, I want out-of-stock products to be disabled so that I cannot accidentally add unavailable items to a customer's order.

3. **As a cashier**, I want to see visual warnings for low-stock items so that I can inform customers about limited availability.

4. **As a cashier**, I want to update daily stock levels at the start of my shift so that the system reflects current inventory.

5. **As an owner**, I want to set custom low-stock thresholds for each product so that I receive appropriate warnings based on product turnover rates.

6. **As an owner**, I want to manually adjust stock quantities so that I can correct errors or account for damaged goods.

7. **As an owner**, I want inventory to automatically decrease when bills are confirmed so that stock levels stay accurate without manual updates.

8. **As an owner**, I want to track inventory changes related to orders so that I can audit sales history.

## Functional Requirements

### Database Migration

1. The system must migrate the current `products` table to include a `stock_quantity` column (INT, NOT NULL, default 0, CHECK >= 0).
2. The system must rename the `id` column in `products` to `product_id` (INT PRIMARY KEY AUTO_INCREMENT).
3. The system must add an `updated_time` column to `products` (DATETIME, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP).
4. The system must create a new `orders` table with columns: `order_id` (BIGINT PRIMARY KEY AUTO_INCREMENT), `order_date` (DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP), `value` (DECIMAL(10,2) NOT NULL).
5. The system must create a new `order_items` table with columns: `order_item_id` (INT PRIMARY KEY AUTO_INCREMENT), `order_id` (BIGINT FK), `product_id` (INT FK), `quantity` (INT NOT NULL CHECK > 0), `subtotal` (DECIMAL(10,2) NOT NULL CHECK > 0).
6. The system must migrate existing data from the `bills` table to the new `orders` and `order_items` tables, grouping bill items by date/paid_amount/balance to create unified orders.
7. The system must preserve the `bills` table for historical reference but mark it as deprecated/archived.

### Inventory Display

8. The system must display the current stock quantity on each product card/button in the main billing view.
9. The system must show stock quantity in the format "Stock: X" (for unit-based) or "Stock: X kg" (for weight-based products).
10. The system must display a visual warning indicator (e.g., orange/yellow icon or text color) on products when stock falls below their custom threshold.
11. The system must show "Out of Stock" label on products with zero stock quantity.
12. The system must display stock quantities in the product management section with the ability to edit them.

### Out-of-Stock Handling

13. The system must disable/gray out product cards/buttons when `stock_quantity` is 0.
14. The system must prevent clicking on disabled out-of-stock products.
15. The system must display a tooltip or message explaining why the product is disabled (e.g., "Currently out of stock").
16. The system must not allow out-of-stock products to be added to the cart under any circumstances.

### Low Stock Alerts

17. The system must allow owners to set a custom low-stock threshold for each product (default: 5 units/kg).
18. The system must display the low-stock threshold field in the product edit/add interface (owner only).
19. The system must visually highlight products (using color, icon, or badge) when `stock_quantity` <= `low_stock_threshold`.
20. The system must show the low-stock indicator on the product card in the main billing view.
21. The system must allow cashiers to see low-stock warnings but not change thresholds.

### Inventory Deduction

22. The system must deduct inventory quantities ONLY when a bill is confirmed and saved (not when added to cart).
23. The system must validate that sufficient stock exists at the moment of bill confirmation.
24. The system must show an error message if stock becomes insufficient between adding to cart and confirming the bill (edge case: another user sold the last items).
25. The system must automatically reduce `stock_quantity` by the ordered amount for each product in the confirmed bill.
26. For weight-based products, the system must deduct the exact weight in kilograms (supporting decimal values).
27. The system must prevent bill confirmation if any cart item exceeds available stock.

### Stock Updates & Restocking

28. The system must allow only the owner to manually update stock quantities in the product management section.
29. The system must provide an input field in the product edit interface for owners to adjust `stock_quantity`.
30. The system must validate that manually entered stock quantities are non-negative integers (or decimals for weight-based products).
31. The system must update the `updated_time` timestamp whenever stock is manually changed.
32. The system must allow both cashiers and owners to access the stock update feature during daily check-in.

### Daily Stock Check-In

33. The system must detect the first login of each day for cashier and owner roles.
34. The system must display a "Daily Stock Check-In" modal/screen on first daily login.
35. The system must show a list of all products with current stock levels in the check-in interface.
36. The system must allow users to update stock quantities for all products during check-in.
37. The system must provide a "Skip for Now" option in the check-in modal.
38. The system must remember that check-in was completed for the current day (stored per user or globally).
39. The system must allow users to manually trigger stock check-in from the settings/product management area.

### Weight-Based Product Inventory

40. The system must track weight-based products (where `is_weight_based` = true) in kilograms.
41. The system must support decimal values for weight-based product stock (e.g., 5.5 kg).
42. The system must display weight-based stock with "kg" suffix.
43. The system must deduct the exact weight sold from weight-based product inventory when bills are confirmed.
44. The system must apply low-stock thresholds to weight-based products in the same manner as unit-based products.

### Inventory Tracking & Audit

45. The system must NOT log manual stock adjustments to any history table.
46. The system must automatically track inventory changes that result from order confirmations.
47. The system must store order-related inventory changes implicitly through the `order_items` table (quantity field).
48. The system must allow viewing historical orders to understand past inventory deductions.

## Non-Goals (Out of Scope)

1. **Supplier Management** - No features for tracking suppliers or purchase orders.
2. **Batch/Lot Tracking** - No tracking of product batches or expiration dates.
3. **Multi-Location Inventory** - Assumes single cafe location only.
4. **Predictive Inventory** - No automatic reorder suggestions or AI-based predictions.
5. **Barcode Scanning** - No barcode/QR code integration for inventory updates.
6. **Manual Inventory Audit Log** - No detailed history tracking for manual stock adjustments (only order-based changes are tracked).
7. **Guest Role Inventory Access** - Guest users cannot see inventory levels.
8. **Product Bundling** - No support for combo/bundle products with shared inventory.

## Design Considerations

### UI Elements

1. **Product Card Enhancement**
   - Add small text below product name: "Stock: [quantity]" or "Stock: [quantity] kg"
   - Use color coding: Green (adequate stock), Yellow/Orange (low stock), Red/Gray (out of stock)
   - Disable entire card with reduced opacity when out of stock
   - Add small warning icon (⚠️) for low-stock items

2. **Product Management Section**
   - Add "Stock Quantity" column to product list table
   - Add "Low Stock Threshold" field (owner only) in add/edit product forms
   - Add visual indicator (colored dot or badge) next to low-stock items
   - Include "Last Updated" timestamp for inventory

3. **Daily Stock Check-In Modal**
   - Full-screen or large modal overlay
   - Scrollable list of all products with current stock
   - Input field next to each product for updating quantity
   - "Save Changes" and "Skip for Now" buttons at bottom
   - Option to "Mark all as checked" without changes

4. **Bill Confirmation Screen**
   - Show stock validation message if any item becomes unavailable
   - Highlight problematic items in red with explanation
   - Provide "Remove Item" or "Adjust Quantity" options

### Responsive Design

- Ensure stock information is readable on mobile devices
- Consider abbreviating "Stock: X" to "Stk: X" on very small screens
- Stack stock info vertically on narrow product cards

## Technical Considerations

### Database Migration Script

- Create migration script that runs on application startup (one-time)
- Use Supabase migrations or SQL script executed via admin interface
- Include rollback strategy in case of migration failure
- Backup existing `bills` table before migration

### Supabase Configuration

- Update existing `supabaseClient` queries to use new table names
- Add Row Level Security (RLS) policies if needed
- Ensure foreign key constraints are properly enforced
- Consider adding database triggers for `updated_time` if needed

### State Management

- Update React state to include `stock_quantity` and `low_stock_threshold` for products
- Add daily check-in state (completed: boolean, date: string) to localStorage
- Implement optimistic UI updates for stock changes with rollback on error

### Edge Case Handling

1. **Concurrent Sales**: Two users selling the last item simultaneously
   - Use database-level constraints and transaction locks
   - Show error message to second user: "This item just sold out. Please remove it from cart."

2. **Negative Stock Prevention**: Ensure database CHECK constraint prevents negative values
   - Validate on frontend before submission
   - Handle database constraint error gracefully with user-friendly message

3. **Weight-Based Decimals**: Ensure precision handling for kg values
   - Store as DECIMAL(10, 2) in database
   - Use parseFloat() carefully in JavaScript
   - Round display values to 2 decimal places

4. **Migration Data Integrity**: Ensure all existing bills are properly grouped into orders
   - Test migration on copy of production data first
   - Verify total revenue matches before/after migration
   - Validate foreign key relationships

### Performance

- Index `product_id` in `order_items` table for fast lookups
- Index `order_date` in `orders` table for date-range queries
- Consider caching product list with stock in React state (refresh on updates)

## Success Metrics

1. **Operational Efficiency**: Reduce incidents of selling out-of-stock items to zero
2. **Inventory Accuracy**: Achieve 95%+ accuracy between physical and system inventory within first month
3. **User Adoption**: 100% of cashiers/owners complete daily stock check-in at least 5 days per week
4. **Low Stock Alerts**: Reduce stock-outs by 50% through proactive low-stock warnings
5. **Data Migration**: Successfully migrate 100% of historical bills to new schema with zero data loss

## Open Questions

1. Should the daily stock check-in be mandatory (cannot skip) or optional?
2. Do we need different permissions for stock viewing vs. stock updating for cashier role?
3. Should the system send notifications (email/SMS) when critical items are out of stock?
4. How should refunds/returns be handled with regard to inventory (add stock back)?
5. Should there be a maximum stock limit to prevent accidental data entry errors (e.g., entering 10000 instead of 10)?
6. Do we need a "Reserve Stock" feature for large pre-orders?
7. Should the system display total inventory value (sum of stock_quantity × price for all products)?
8. How often should the frontend refresh product stock data (real-time, every 30s, manual refresh)?

---

**Document Version**: 1.0  
**Created**: 2025-10-10  
**Last Updated**: 2025-10-10  
**Status**: Ready for Review

