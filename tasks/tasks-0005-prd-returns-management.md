# Tasks: Returns Management System

Based on PRD: `0005-prd-returns-management.md`

## Current Codebase Context

### Existing Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Migration System**: SQL files in `/database/migrations/`
- **Stock Management**: Daily Stock Check-In modal (`DailyStockCheckIn.jsx`)
- **Email System**: Netlify serverless function (`/netlify/functions/send-email.js`)
- **Auth Context**: Role-based access control (`AuthContext.jsx`)
- **Products Table**: Already has `product_id`, `name`, `price`, `is_weight_based`, `stock_quantity`, `low_stock_threshold`, `updated_time`
- **Navigation**: Main app navigation in `App.jsx` with views: billing, products, sales, users, audit-logs

### Key Patterns Identified
- Component structure: Page-level components in `/src/components/`
- Utility functions in `/src/utils/`
- Hooks in `/src/hooks/`
- Database operations use Supabase client directly
- Modal-based interfaces for complex workflows
- Color-coded badges for status indicators (StockBadge.jsx, SalesBadge.jsx)

## Relevant Files

### Database & Migrations
- `database/migrations/008_returns_management_schema.sql` - New migration for returns management schema
- `database/migrations/009_batch_tracking_data_migration.sql` - Migration to convert existing inventory to batches

### Components
- `src/components/ReturnsPage.jsx` - Main returns processing interface (NEW)
- `src/components/ReturnedLog.jsx` - Historical returns log window/modal (NEW)
- `src/components/BatchAgeIndicator.jsx` - Color-coded age badge component (NEW)
- `src/components/DailyStockCheckIn.jsx` - Modified to create batches instead of updating stock_quantity
- `src/components/staff/ProductForm.jsx` - Modified to include new price fields and return percentage
- `src/App.jsx` - Modified to add Returns navigation

### Utilities
- `src/utils/batchTracking.js` - Batch management, FIFO logic, age calculations (NEW)
- `src/utils/returns.js` - Return processing business logic (NEW)
- `src/utils/inventory.js` - Modified to work with batch-based inventory

### Hooks
- `src/hooks/useBatches.js` - Hook for fetching and managing inventory batches (NEW)
- `src/hooks/useReturns.js` - Hook for return processing and history (NEW)

### Email Templates
- `src/utils/emailTemplates.js` - Return notification email template (NEW or extend existing)

### Tests
- `tests/unit/batchTracking.test.js` - Unit tests for batch tracking utilities (NEW)
- `tests/unit/returns.test.js` - Unit tests for return business logic (NEW)
- `tests/integration/returns-flow.test.js` - Integration tests for returns processing (NEW)
- `tests/integration/batch-fifo-flow.test.js` - Integration tests for FIFO batch logic (NEW)

## Tasks

- [ ] 1.0 Database Schema & Migration Setup
  - [x] 1.1 Create migration file `008_returns_management_schema.sql`
  - [x] 1.2 Add new columns to `products` table: `original_price`, `sale_price`, `default_return_percentage`
  - [x] 1.3 Create `inventory_batches` table with fields: id, product_id, quantity, date_added, created_at, updated_at
  - [x] 1.4 Create `returns` table with fields: id, return_date, processed_by, processed_at, total_value, total_quantity, total_batches, notification_sent
  - [x] 1.5 Create `return_items` table with fields: id, return_id, product_id, batch_id, product_name, quantity, age_at_return, date_batch_added, original_price, sale_price, return_percentage, return_value_per_unit, total_return_value
  - [x] 1.6 Add indexes: `idx_batches_product_date` on inventory_batches(product_id, date_added), `idx_returns_date` on returns(return_date), `idx_return_items_return` on return_items(return_id)
  - [x] 1.7 Add foreign key constraints with appropriate ON DELETE behaviors
  - [x] 1.8 Set default values for existing products: original_price = price * 0.85, sale_price = price, default_return_percentage = 20
  - [x] 1.9 Create migration file `009_batch_tracking_data_migration.sql` for converting existing inventory
  - [x] 1.10 Write migration logic to create Day 0 batches for all existing products with current stock_quantity > 0
  - [ ] 1.11 Test migration on development database
  - [x] 1.12 Create rollback script if needed

- [x] 2.0 Batch Tracking System Implementation
  - [x] 2.1 Create `src/utils/batchTracking.js` utility file
  - [x] 2.2 Implement `calculateBatchAge(dateAdded)` function to compute age in days
  - [x] 2.3 Implement `getBatchAgeCategory(ageInDays)` function returning 'fresh' (0-2), 'medium' (3-7), or 'old' (7+)
  - [x] 2.4 Implement `sortBatchesByAge(batches)` function for FIFO ordering (oldest first)
  - [x] 2.5 Implement `createBatch(productId, quantity, dateAdded)` function
  - [x] 2.6 Implement `deductFromOldestBatches(productId, quantityToDeduct, batches)` for FIFO sales logic
  - [x] 2.7 Implement `getBatchesByProduct(productId)` to fetch all batches for a product
  - [x] 2.8 Implement `getTotalStockForProduct(batches)` to sum quantities across batches
  - [x] 2.9 Create `src/hooks/useBatches.js` custom hook
  - [x] 2.10 Implement `useBatches()` hook with methods: fetchBatches, createBatch, updateBatch, deleteBatch
  - [x] 2.11 Add real-time subscriptions for batch changes using Supabase realtime
  - [x] 2.12 Modify `DailyStockCheckIn.jsx` to create batches instead of updating stock_quantity directly
  - [x] 2.13 Update stock check-in save logic to call `createBatch()` for each product
  - [x] 2.14 Modify sales/billing logic in `App.jsx` to use `deductFromOldestBatches()` when processing orders
  - [x] 2.15 Update `src/utils/inventory.js` to calculate stock from batches instead of stock_quantity column
  - [x] 2.16 Add validation to prevent negative batch quantities

- [ ] 3.0 Returns Page UI & Functionality
  - [ ] 3.1 Create `src/components/ReturnsPage.jsx` component
  - [ ] 3.2 Add "Returns" navigation button in `App.jsx` header (owner and cashier only)
  - [ ] 3.3 Implement role-based access control for Returns page
  - [ ] 3.4 Create main layout: header, batch list table, summary footer, action buttons
  - [ ] 3.5 Implement `useBatches()` hook to fetch all batches with quantity > 0
  - [ ] 3.6 Display batches in table format with columns: Product Name, Batch Qty, Age Badge, Date Added, Original Price, Sale Price, Return %, Return Value/Unit, Keep Checkbox
  - [ ] 3.7 Sort batches with oldest at the top using `sortBatchesByAge()`
  - [ ] 3.8 Create `src/components/BatchAgeIndicator.jsx` component for color-coded age badges
  - [ ] 3.9 Implement age badge logic: Green (0-2 days), Yellow (3-7 days), Red (7+ days)
  - [ ] 3.10 Display age both as number (e.g., "Day 3") and color
  - [ ] 3.11 Add "Keep for tomorrow" checkbox for each batch
  - [ ] 3.12 Implement checkbox state management (track which batches to keep)
  - [ ] 3.13 Add return percentage override dropdown/input for each batch (20% or 100%)
  - [ ] 3.14 Implement real-time return value calculation as user toggles checkboxes
  - [ ] 3.15 Create sticky summary footer showing: Total batches to return, Total quantity, Total return value
  - [ ] 3.16 Add product-level breakdown in summary (combined totals for same products with multiple batches)
  - [ ] 3.17 Implement filter/search functionality for long product lists
  - [ ] 3.18 Add filter by age option (show only old, medium, fresh items)
  - [ ] 3.19 Create "Process Return" button with confirmation dialog
  - [ ] 3.20 Implement confirmation dialog showing return summary before processing
  - [ ] 3.21 Create `src/utils/returns.js` with `processReturn()` function
  - [ ] 3.22 Implement return processing logic: create return record, create return_items, delete returned batches, increment age for kept batches
  - [ ] 3.23 Handle batch age increment: update date_added to maintain age tracking for kept items
  - [ ] 3.24 Add success/error notifications after processing
  - [ ] 3.25 Reload batches and clear selections after successful return
  - [ ] 3.26 Add "Returned Log" button to open historical log window
  - [ ] 3.27 Implement loading states during data fetching and processing
  - [ ] 3.28 Style visual distinction for batches marked "keep for tomorrow" (grayed out or special styling)

- [ ] 4.0 Returned Log Window & Analytics
  - [ ] 4.1 Create `src/components/ReturnedLog.jsx` modal/window component
  - [ ] 4.2 Implement modal open/close functionality from Returns page
  - [ ] 4.3 Create `src/hooks/useReturns.js` hook for fetching return history
  - [ ] 4.4 Implement `fetchReturnsByDateRange()` function
  - [ ] 4.5 Display date list in reverse chronological order (most recent first)
  - [ ] 4.6 For each date, show: Return date, Total return value, Number of batches, Total quantity, Number of transactions
  - [ ] 4.7 Implement date selection to view detailed return information
  - [ ] 4.8 Display multiple transactions per day separately with timestamps
  - [ ] 4.9 For each transaction, show: Timestamp, Username who processed, List of batches returned
  - [ ] 4.10 For each batch in transaction, display: Product name, Quantity, Age at return, Date added, Original price, Sale price, Return %, Return value/unit, Total value
  - [ ] 4.11 Show batch age with same color-coding as Returns page
  - [ ] 4.12 Implement edit/reprocess functionality for past returns
  - [ ] 4.13 Add confirmation when editing past returns
  - [ ] 4.14 Update inventory when editing (recreate batches if needed)
  - [ ] 4.15 Preserve deleted product names in historical logs
  - [ ] 4.16 Implement analytics section with charts/graphs
  - [ ] 4.17 Create "Total return value trend over time" chart (line or bar chart)
  - [ ] 4.18 Create "Most frequently returned products" chart
  - [ ] 4.19 Calculate and display "Average batch age at return" metric
  - [ ] 4.20 Add date range picker for filtering analytics
  - [ ] 4.21 Implement CSV export functionality for accounting
  - [ ] 4.22 Implement PDF export functionality for accounting
  - [ ] 4.23 Add filter by product name
  - [ ] 4.24 Add filter by return value range
  - [ ] 4.25 Implement one-month archiving: show archived returns differently or hide them
  - [ ] 4.26 Add pagination if return history is large
  - [ ] 4.27 Optimize queries with proper indexing

- [ ] 5.0 Product Catalog Enhancements
  - [ ] 5.1 Modify `src/components/staff/ProductForm.jsx` to add new fields
  - [ ] 5.2 Add "Original Price" input field (cost from bakery)
  - [ ] 5.3 Add "Sale Price" input field (retail price to customers)
  - [ ] 5.4 Implement auto-calculation: Original Price = Sale Price * 0.85 (as default)
  - [ ] 5.5 Allow manual override of original price
  - [ ] 5.6 Add "Default Return Percentage" dropdown (20% or 100%)
  - [ ] 5.7 Update product creation logic to save new fields
  - [ ] 5.8 Update product edit logic to allow editing new fields
  - [ ] 5.9 Modify `ProductsPage.jsx` to display new fields in product list
  - [ ] 5.10 Update product table/cards to show original price and sale price
  - [ ] 5.11 Show return percentage badge/indicator
  - [ ] 5.12 Update `addProduct()` function to include new fields
  - [ ] 5.13 Update `saveEdit()` function to save new fields
  - [ ] 5.14 Add validation: sale_price must be greater than original_price
  - [ ] 5.15 Add validation: return_percentage must be 20 or 100
  - [ ] 5.16 Update existing products view to show both prices clearly
  - [ ] 5.17 Ensure backward compatibility with products missing new fields

- [ ] 6.0 Email Notifications & Integration
  - [ ] 6.1 Create or extend `src/utils/emailTemplates.js` with return notification template
  - [ ] 6.2 Design HTML email template for return summary
  - [ ] 6.3 Include in email: Return date/time, Processed by (user), Total return value, Total quantity, Product breakdown
  - [ ] 6.4 Add "Returned Log" link in email for owner to view details
  - [ ] 6.5 Implement `sendReturnNotification()` function in `returns.js`
  - [ ] 6.6 Integrate with existing Netlify email function (`/netlify/functions/send-email.js`)
  - [ ] 6.7 Call email function after successful return processing
  - [ ] 6.8 Update `returns` table: set `notification_sent = true` after email sent
  - [ ] 6.9 Handle email failures gracefully (log error but don't block return processing)
  - [ ] 6.10 Add retry logic for failed email notifications
  - [ ] 6.11 Create email queue or log for tracking notification status
  - [ ] 6.12 Test email delivery in development and production
  - [ ] 6.13 Ensure email contains batch-level details for transparency
  - [ ] 6.14 Format currency values properly in email (Rs. X.XX)
  - [ ] 6.15 Add success metric tracking: email sent within 5 minutes of return

- [ ] 7.0 Testing & Quality Assurance
  - [ ] 7.1 Create `tests/unit/batchTracking.test.js`
  - [ ] 7.2 Test `calculateBatchAge()` with various dates
  - [ ] 7.3 Test `getBatchAgeCategory()` for all age ranges
  - [ ] 7.4 Test `sortBatchesByAge()` with mixed-age batches
  - [ ] 7.5 Test `deductFromOldestBatches()` FIFO logic
  - [ ] 7.6 Test edge cases: deducting more than available, zero quantity batches
  - [ ] 7.7 Create `tests/unit/returns.test.js`
  - [ ] 7.8 Test return value calculations with different percentages
  - [ ] 7.9 Test `processReturn()` function
  - [ ] 7.10 Test batch age increment for kept items
  - [ ] 7.11 Test return processing with multiple batches
  - [ ] 7.12 Create `tests/integration/returns-flow.test.js`
  - [ ] 7.13 Test end-to-end return processing flow
  - [ ] 7.14 Test "Keep for tomorrow" functionality
  - [ ] 7.15 Test return percentage override
  - [ ] 7.16 Test email notification integration
  - [ ] 7.17 Test Returned Log display and filtering
  - [ ] 7.18 Create `tests/integration/batch-fifo-flow.test.js`
  - [ ] 7.19 Test batch creation during stock check-in
  - [ ] 7.20 Test FIFO deduction during sales
  - [ ] 7.21 Test multiple batches of same product
  - [ ] 7.22 Test stock calculation from batches
  - [ ] 7.23 Verify batch data migration works correctly
  - [ ] 7.24 Test with existing products (backward compatibility)
  - [ ] 7.25 Test role-based access control (owner and cashier can access Returns)
  - [ ] 7.26 Test confirmation dialogs work correctly
  - [ ] 7.27 Test error handling for failed returns
  - [ ] 7.28 Test database constraints (negative quantities, invalid foreign keys)
  - [ ] 7.29 Performance test: Returns page with 100+ batches
  - [ ] 7.30 Performance test: Returned Log with 1000+ returns
  - [ ] 7.31 Test CSV/PDF export functionality
  - [ ] 7.32 Test analytics calculations and charts
  - [ ] 7.33 Manual testing: Complete return workflow from check-in to return
  - [ ] 7.34 Manual testing: Verify color-coded age badges display correctly
  - [ ] 7.35 Manual testing: Verify real-time calculations update properly
  - [ ] 7.36 Run all existing tests to ensure no regressions
  - [ ] 7.37 Update test documentation in `tests/README.md`

---

## Implementation Notes

### Development Approach

**Recommended Order:**
1. Start with Database Schema (Task 1.0) - Foundation for everything
2. Then Batch Tracking System (Task 2.0) - Core business logic
3. Product Catalog Enhancements (Task 5.0) - Needed before Returns page can function
4. Returns Page UI (Task 3.0) - Main user interface
5. Email Notifications (Task 6.0) - Integration work
6. Returned Log & Analytics (Task 4.0) - Historical/reporting features
7. Testing (Task 7.0) - Throughout and at the end

**Key Dependencies:**
- Task 2.0 depends on Task 1.0 (need database tables for batches)
- Task 3.0 depends on Tasks 1.0, 2.0, and 5.0 (need batches, utilities, and product fields)
- Task 4.0 depends on Tasks 1.0 and 3.0 (need returns table and return processing logic)
- Task 6.0 depends on Task 3.0 (need return processing to trigger emails)

### Testing Strategy

- Write unit tests alongside utility functions (continuous testing)
- Write integration tests after completing major features
- Manual testing should follow the complete user workflow:
  1. Add products with new price fields
  2. Daily stock check-in (creates batches)
  3. Process some sales (tests FIFO deduction)
  4. Process returns (keep some batches, return others)
  5. View returned log
  6. Check email notifications

### Database Migration Safety

**CRITICAL:** Test migrations on a development database first!
1. Create a backup before running migration 008
2. Run migration 008 (schema changes)
3. Verify schema is correct
4. Run migration 009 (data migration to batches)
5. Verify all existing products have batches created
6. Test the application with migrated data
7. Only after successful testing, apply to production

### Backward Compatibility

The system must continue to work if:
- Products don't have `original_price` or `sale_price` set (use defaults)
- Products don't have `default_return_percentage` set (default to 20%)
- Existing stock_quantity column data exists (migrate to batches)

### Performance Considerations

- Batch queries should use indexes on `product_id` and `date_added`
- Returns log should paginate for large datasets
- Real-time subscriptions should be scoped to active batches only
- Consider caching batch totals per product to avoid repeated calculations

### UI/UX Guidelines

- Use existing design patterns from `ProductsPage.jsx` and `SalesPage.jsx`
- Color scheme: Green for fresh, Yellow for medium age, Red for old batches
- Sticky footer for return summary (always visible)
- Confirmation dialogs prevent accidental actions
- Loading states for all async operations
- Clear success/error messages

### Total Task Count

- **7 Parent Tasks**
- **156 Sub-tasks**
- Estimated completion time: 4-6 weeks (for experienced developer)

---

## Getting Started

1. Review the PRD: `0005-prd-returns-management.md`
2. Set up development database for testing migrations
3. Start with Task 1.1: Create the schema migration file
4. Work through tasks sequentially within each parent task
5. Test continuously as you build
6. Check off completed tasks in this file

**Questions or clarifications?** Refer back to the PRD for detailed requirements and design considerations.

---

**Generated:** 2025-11-01  
**Based on:** `0005-prd-returns-management.md` (52 functional requirements)  
**Status:** Ready for implementation ✅
