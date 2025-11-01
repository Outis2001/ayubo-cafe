# Product Requirements Document: Returns Management System

## Introduction/Overview

The Returns Management System is a feature that enables cafe owners and cashiers to efficiently process end-of-day product returns to the bakery and track return payments. Currently, there is no systematic way to manage which products should be returned to the bakery, calculate the return value based on different reimbursement rates, or maintain a historical log of returns for accounting and audit purposes.

This feature solves the problem of manual tracking and calculation of returns, reducing errors and providing transparency in the return process. It will help the business optimize inventory decisions by tracking which products can be kept for multiple days versus those that must be returned daily.

## Goals

1. **Streamline Return Processing**: Provide a simple, efficient interface to process end-of-day returns manually when needed
2. **Accurate Financial Tracking**: Automatically calculate return values based on configurable reimbursement rates (20% or 100% of original cost)
3. **Flexible Inventory Management**: Allow staff to identify products that can be kept for the next day instead of being returned
4. **Historical Record Keeping**: Maintain a comprehensive log of all returns with detailed information for accounting and analysis
5. **Product Configuration**: Extend the product catalog to include pricing tiers (original cost vs. sale price) and default return percentages
6. **Inventory Freshness Tracking**: Track product age at batch level to ensure oldest items are returned first, maintaining product quality
7. **Smart Return Prioritization**: Automatically prioritize older inventory for returns to minimize waste and ensure fresher products remain

## User Stories

1. **As an owner**, I want to view the remaining stock at the end of the day so that I can decide which products to return to the bakery and which to keep for tomorrow.

2. **As a cashier**, I want to process returns manually when needed so that I can handle the end-of-day inventory reconciliation efficiently.

3. **As an owner**, I want to configure return percentages for each product in the catalog so that the system automatically calculates the correct reimbursement amount (20% or 100% of original cost).

4. **As a cashier**, I want to override the default return percentage at the time of processing a return so that I can handle special cases or updated agreements with the bakery.

5. **As an owner**, I want to select products to keep for the next day so that I don't lose inventory value on items that remain fresh.

6. **As an owner**, I want to view a historical log of returns organized by date so that I can track return patterns and reconcile payments from the bakery.

7. **As a cashier**, I want to see detailed information about each day's returns (products, quantities, prices, return values) so that I can verify the accuracy of the return process.

8. **As an owner**, I want to edit or reprocess a return if I made a mistake so that the records remain accurate.

9. **As an owner**, I want to see who processed each return and when so that I can maintain accountability and audit trails.

10. **As an owner**, I want to see how many days each batch of products has been in inventory so that I can prioritize returning older items and maintain product freshness.

11. **As a cashier**, I want the system to automatically return the oldest items first so that I don't accidentally keep old stock while returning fresh stock.

12. **As an owner**, I want visual indicators (color-coded badges) showing product age so that I can quickly identify which items need immediate attention.

## Functional Requirements

### Product Catalog Enhancements

1. The system **must** add an "Original Price" field to each product, representing the cost paid to the bakery.
2. The system **must** add a "Sale Price" field to each product, representing the price charged to customers. "Original Price" is 15% less than "Sale Price" this is the default value.
3. The system **must** add a "Default Return Percentage" field to each product with two options: 20% or 100%.
4. The system **must** allow these new fields to be set when creating a new product.
5. The system **must** allow these fields to be edited when updating an existing product.
6. The system **must** maintain backward compatibility with existing products by setting sensible defaults for products that don't have these fields yet.

### Inventory Batch Tracking

7. The system **must** track inventory at the batch level, where each batch represents stock added on a specific date via Daily Stock Check-In.
8. Each batch **must** store:
   - Product ID
   - Quantity in batch
   - Date added (from Daily Stock Check-In)
   - Age in days (calculated daily from date added)
9. When new stock is added to a product that already has remaining inventory, the system **must** create a separate batch rather than merging with existing stock.
10. The system **must** calculate age in days for each batch as: current date - date added.
11. For existing inventory without batch data, the system **must** consider them as "Day 0" (fresh/today's stock).
12. The system **must** maintain batch integrity when sales reduce quantities (deduct from oldest batches first using FIFO - First In, First Out).

### Returns Page - Main Interface

13. The system **must** create a new "Returns" page accessible from the main navigation menu.
14. The system **must** restrict access to the Returns page to users with "owner" or "cashier" roles only.
15. The Returns page **must** display all product batches that currently have remaining stock greater than zero.
16. The system **must** display products grouped by batch, showing each batch as a separate line item if the same product has multiple batches with different ages.
17. The system **must** sort the display with oldest batches at the top of the list (oldest first, newest last).
18. For each product batch, the system **must** display:
    - Product name
    - Batch quantity (remaining quantity for this specific batch)
    - Age in days with color-coded badge:
      * **Green** for fresh items (0-2 days old)
      * **Yellow** for items 3-7 days old
      * **Red** for items 7+ days old
    - Date added to inventory
    - Original price (cost from bakery)
    - Sale price (retail price)
    - Default return percentage (20% or 100%)
    - Calculated return value per unit (original price × return percentage)
    - Checkbox to "Keep for tomorrow" (exclude from return)
19. The system **must** allow users to mark individual product batches to "Keep for tomorrow" using checkboxes.
20. When a product batch is marked "Keep for tomorrow", the system **must** exclude it from the current return process and add the batch quantity back to the next day's inventory (batch age increments by 1 day).
21. All product batches NOT marked as "Keep for tomorrow" will automatically be included in the return process when "Process Return" is clicked.
22. The system **must** allow users to override the default return percentage for individual product batches during the return process (change from 20% to 100% or vice versa).
23. The system **must** automatically prioritize returning oldest batches first - when processing returns, the system returns batches in order from oldest to newest (unless specifically marked "Keep for tomorrow").
24. The system **must** automatically calculate the total return value based on:
    - Quantity being returned (from all batches not marked to keep)
    - Original price
    - Applied return percentage (per batch)
25. The system **must** display a summary showing:
    - Total number of product batches being returned
    - Total quantity being returned
    - Total return value (amount to be paid by bakery)
    - Breakdown by product showing combined totals for products with multiple batches
26. The system **must** provide a "Process Return" button to finalize the return.
27. The system **must** show a confirmation dialog before processing the return to prevent accidental submissions.
28. When "Process Return" is confirmed and clicked, the system **must**:
    - Create a return record with timestamp
    - Store the user who processed the return
    - Store all batch details (product name, batch quantity, age, date added, original price, sale price, return percentage, return value)
    - Update inventory by removing returned batches completely
    - Increment age by 1 day for batches marked "Keep for tomorrow"
    - Send email notification to owner with return summary
29. The system **must** allow returns to be processed multiple times in a day (not restricted to once per day).
30. The system **must** support partial-day returns (mid-day returns) in addition to end-of-day returns.

### Returned Log Window

31. The system **must** create a "Returned Log" button/link on the Returns page that opens a separate window or modal.
32. The Returned Log window **must** display a list of all return dates in reverse chronological order (most recent first).
33. For each date in the log, the system **must** display:
    - Return date
    - Total return value for that day
    - Number of product batches returned
    - Total quantity returned
    - Number of separate return transactions that day
34. The system **must** allow users to click on a specific date to view detailed return information.
35. When a date is selected, the system **must** display each return transaction separately (if multiple returns occurred that day).
36. For each return transaction, the system **must** display:
    - Transaction timestamp
    - Username of who processed the return
    - List of all batches returned in that transaction
37. For each batch in the return transaction, the system **must** display:
    - Product name
    - Batch quantity returned
    - Age at time of return (in days)
    - Date the batch was originally added to inventory
    - Original price at time of return
    - Sale price at time of return
    - Return percentage used
    - Return value per unit
    - Total return value for that batch
38. The system **must** allow users to edit or reprocess a return from the log if needed.
39. When editing a past return, the system **must** adjust inventory quantities accordingly (recreate batches if needed).
40. The system **must** preserve return history even if a product is later deleted from the catalog (archived products should still appear in historical logs).
41. The Returned Log **must** be accessible by both owners and cashiers with equal permissions.
42. The system **must** provide reporting/analytics features showing return trends over time (total return value, most frequently returned products, average batch age at return).
43. Return history **must** be retained for one month, after which old records are archived.

### Data Integrity & Edge Cases

44. The system **must NOT** display product batches with zero remaining stock in the Returns page selection list.
45. The system **must** validate that batch return quantities do not exceed current batch inventory levels.
46. The system **must** handle cases where multiple returns are processed in the same day by maintaining separate records for each return event.
47. The system **must** maintain data consistency between return records, batch records, and inventory levels.
48. The system **must** preserve historical return data even if product details (prices, percentages) are changed in the catalog.
49. When a batch is completely sold out before end of day, the system **must** remove the batch from the database (no return needed).
50. If products marked "Keep for tomorrow" show a special indicator the next day, the system **must** display a badge or visual cue showing "Kept from [date]".
51. The system **must** handle the transition of existing inventory (without batch data) by creating default batches with "Day 0" age.
52. The system **must** ensure FIFO (First In, First Out) logic is applied consistently across sales and returns.

## Non-Goals (Out of Scope)

1. **Automatic Scheduling**: This feature will NOT automatically trigger returns at a specific time. Returns are manually initiated by staff.
2. **Bakery Integration**: This feature will NOT automatically notify or transmit return information to the bakery's system.
3. **Payment Processing**: This feature will NOT handle the actual payment collection from the bakery (it only calculates and records amounts).
4. **Predictive Analytics**: This feature will NOT provide forecasting or recommendations on which products to order based on return patterns (this may be a future enhancement).
5. **Mobile-Specific Interface**: This feature will NOT include a dedicated mobile app interface (it will use the existing responsive web interface).
6. **Multi-Location Support**: This feature will NOT handle returns across multiple cafe locations (assumes single location).

## Design Considerations

### Returns Page Layout
- Use a table or card-based layout to display product batches with remaining stock
- Each row represents a single batch (same product may appear multiple times if multiple batches exist)
- Sort batches with oldest at the top (automatic FIFO prioritization)
- Display color-coded age badges prominently:
  - Green badges for 0-2 days
  - Yellow badges for 3-7 days
  - Red badges for 7+ days
- Show age both as number (e.g., "Day 3") and color coding
- Provide clear visual distinction for batches marked "keep for tomorrow" (e.g., grayed out or with special styling)
- Display the return value calculation prominently with real-time updates as "keep for tomorrow" selections change
- Use a sticky summary footer showing:
  - Total batches being returned
  - Total quantity being returned
  - Total return value for all batches NOT marked "keep for tomorrow"
  - Breakdown by product (combined totals for products with multiple batches)
- Provide filter/search functionality if product list is long
- Include filter by age (show only old items, only fresh items, etc.)

### Returned Log Window
- Consider using a modal or side panel for the log view
- Use a date picker or calendar view for easy navigation between dates
- Provide clear visual hierarchy: date list → return transaction → batch details
- Display multiple transactions per day if applicable (with timestamps to distinguish)
- Show batch age at time of return with same color-coding system
- Include visual charts/graphs for analytics:
  - Total return value trend over time
  - Most frequently returned products
  - Average batch age at return
- Include export functionality for accounting purposes (CSV/PDF)
- Use consistent styling with the existing application
- Provide filtering options: by date range, by product, by return value

### UI Components to Leverage
- Existing table components for product lists
- Existing form components for checkboxes and input fields
- Existing modal/dialog components for the Returned Log window
- Existing badge components for status indicators

## Technical Considerations

### Database Schema

#### Products Table Updates
- Add columns to `products` table: 
  - `original_price` (DECIMAL) - cost from bakery
  - `sale_price` (DECIMAL) - retail price to customers
  - `default_return_percentage` (INTEGER) - either 20 or 100

#### New Inventory Batches Table
- Create new `inventory_batches` table with fields:
  - `id` (primary key)
  - `product_id` (foreign key to products)
  - `quantity` (INTEGER) - current quantity in this batch
  - `date_added` (DATE) - when batch was added via Daily Stock Check-In
  - `age_in_days` (computed/calculated field: current_date - date_added)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

#### Returns Table
- Create new `returns` table with fields:
  - `id` (primary key)
  - `return_date` (DATE) - date of return
  - `processed_by` (user_id, foreign key)
  - `processed_at` (TIMESTAMP) - exact time of processing
  - `total_value` (DECIMAL) - total return amount
  - `total_quantity` (INTEGER) - total items returned
  - `total_batches` (INTEGER) - number of batches returned
  - `notification_sent` (BOOLEAN) - email sent to owner
  - `created_at` (timestamp)

#### Return Items (Batches) Table
- Create new `return_items` table with fields:
  - `id` (primary key)
  - `return_id` (foreign key to returns)
  - `product_id` (foreign key to products, nullable for deleted products)
  - `batch_id` (reference to original batch, nullable if batch deleted)
  - `product_name` (TEXT, stored snapshot)
  - `quantity` (INTEGER) - quantity of this batch returned
  - `age_at_return` (INTEGER) - age in days when returned
  - `date_batch_added` (DATE) - when batch was originally added
  - `original_price` (DECIMAL, snapshot at time of return)
  - `sale_price` (DECIMAL, snapshot at time of return)
  - `return_percentage` (INTEGER) - 20 or 100
  - `return_value_per_unit` (DECIMAL)
  - `total_return_value` (DECIMAL)
  - `created_at` (timestamp)

### Integration Points
- Integrate with existing Daily Stock Check-In feature to create batches when stock is added
- Use existing authentication and role-based access control (AuthContext)
- Query current batch stock levels from inventory_batches table
- Update batch quantities when sales occur (FIFO - deduct from oldest batches first)
- Update inventory by removing batches when returns are processed
- Integrate with existing email notification system to send return summaries to owner
- Sales tracking must reduce quantities from oldest batches first to maintain FIFO integrity

### Migration Strategy
- **Phase 1: Schema Updates**
  - Create database migration to add new columns to products table (`original_price`, `sale_price`, `default_return_percentage`)
  - Provide default values for existing products (e.g., `original_price` = 85% of current price, `sale_price` = current price, `default_return_percentage` = 20)
  - Create new `inventory_batches`, `returns`, and `return_items` tables
  
- **Phase 2: Data Migration**
  - Convert existing inventory to batch format: create one batch per product with `date_added` = today, `age_in_days` = 0
  - Ensure all existing stock is represented as batches before going live
  
- **Phase 3: Code Updates**
  - Update Daily Stock Check-In to create batches instead of updating simple quantities
  - Update sales/transaction code to deduct from oldest batches first (FIFO)
  - Ensure backwards compatibility with existing product catalog queries
  
- **Phase 4: Testing**
  - Test batch creation, aging calculation, and FIFO logic
  - Test return processing with multiple batches
  - Verify email notifications work correctly

### Performance Considerations
- Index `return_date` column in returns table for efficient log queries
- Index `product_id` and `date_added` in inventory_batches table for fast batch lookups
- Index `date_added` for sorting oldest batches first
- Consider pagination for the Returned Log if return history grows large
- Cache product catalog data on the Returns page to avoid repeated queries
- Use database views or computed columns for age calculation to avoid repeated calculations
- Implement archiving strategy for returns older than one month

## Success Metrics

1. **Adoption Rate**: 80% of daily operations include processing at least one return within the first month
2. **Time Savings**: Reduce time spent on end-of-day return processing by 50% (measured through user feedback)
3. **Accuracy**: Zero discrepancies in return value calculations reported by staff
4. **User Satisfaction**: Achieve a satisfaction rating of 4/5 or higher from owners and cashiers
5. **Data Completeness**: 100% of returns properly logged with all required batch information
6. **Audit Trail**: All returns have associated user and timestamp information for accountability
7. **Freshness Optimization**: Reduce average age of inventory at end-of-day by 30% (by returning older items first)
8. **FIFO Compliance**: 100% of sales deduct from oldest batches first, maintaining proper inventory rotation
9. **Return Value Tracking**: Accurate tracking of return payments owed by bakery with zero calculation errors
10. **Email Notification Reliability**: 100% of returns trigger email notifications to owner within 5 minutes

## Decisions Made & Additional Notes

### Confirmed Requirements (Previously Open Questions)

1. ✅ **Confirmation Dialog**: A confirmation dialog MUST be shown before processing returns to prevent accidental submissions (see Requirement 27)

2. ✅ **Email Notifications**: The system MUST send email notifications to the owner when returns are processed (see Requirement 28)

3. ✅ **Partial-Day Returns**: The system MUST support mid-day returns in addition to end-of-day returns (see Requirement 30)

4. ⚠️ **Additional Return Percentages**: Currently limited to 20% and 100%. May add 50%, 75% in future if business needs change (leave as future enhancement)

5. ✅ **History Retention**: Return history is retained for one month, then archived (see Requirement 43)

6. ✅ **Reporting/Analytics**: The system MUST include analytics features showing return trends over time (see Requirement 42)

7. ✅ **Daily Stock Check-In Integration**: The system MUST integrate with Daily Stock Check-In to create batches when stock is added (see Integration Points)

8. ✅ **"Keep for Tomorrow" Indicator**: Products marked "Keep for tomorrow" MUST show a special indicator the next day showing "Kept from [date]" (see Requirement 50)

### Color-Coding System for Batch Age
- **Green Badge**: Fresh items (0-2 days old)
- **Yellow Badge**: Items 3-7 days old  
- **Red Badge**: Items 7+ days old

### Batch Management Logic
- Inventory is tracked at batch level (separate batches for stock added on different dates)
- Age is calculated from Daily Stock Check-In date
- System automatically returns oldest batches first (FIFO logic)
- When keeping items, age increments by 1 day
- Sales deduct from oldest batches first to maintain freshness

### Future Enhancements (Out of Scope for Initial Release)
- Additional return percentage options (50%, 75%, etc.)
- Predictive analytics for optimal ordering based on return patterns
- Integration with bakery's system for automatic return notifications
- Mobile-optimized interface
- Multi-location support

---

## Implementation Summary

### Core Components to Build

1. **Database Schema Updates**
   - Add 3 columns to `products` table
   - Create 3 new tables: `inventory_batches`, `returns`, `return_items`
   - Set up indexes for performance
   - Create migration scripts

2. **Batch Tracking System**
   - Modify Daily Stock Check-In to create batches
   - Implement FIFO logic for sales (deduct from oldest batches)
   - Age calculation logic (current_date - date_added)
   - Batch lifecycle management

3. **Returns Page UI**
   - Main returns interface showing all batches
   - Color-coded age indicators (Green/Yellow/Red)
   - "Keep for tomorrow" checkbox per batch
   - Return percentage override capability
   - Real-time return value calculator
   - Summary footer with totals
   - Confirmation dialog

4. **Returned Log Window UI**
   - Date-based navigation
   - Transaction-level details
   - Batch-level breakdown
   - Analytics/reporting charts
   - Export functionality (CSV/PDF)
   - Filtering and search

5. **Business Logic**
   - Return processing workflow
   - Oldest-first automatic prioritization
   - Email notification system
   - Return value calculations
   - Inventory updates on return
   - Age increment for kept items
   - Archiving of old returns (1 month retention)

6. **Integration Work**
   - Connect with Daily Stock Check-In
   - Connect with existing email system
   - Connect with authentication/authorization
   - Update sales processing for FIFO
   - Ensure data consistency across systems

### Key Technical Decisions

- **Batch-Level Tracking**: Inventory stored as separate batches by date added
- **FIFO Enforcement**: System automatically manages oldest-first logic
- **Age Calculation**: Computed daily from `date_added` field
- **Default Pricing**: Original price = 85% of sale price (15% margin)
- **Return Percentages**: 20% or 100% of original price
- **Color Thresholds**: 0-2 days (green), 3-7 days (yellow), 7+ days (red)
- **Notifications**: Email sent to owner on every return
- **History**: 1-month retention, then archiving

### Total Requirements Count
- **52 Functional Requirements** across 4 subsections
- **10 Success Metrics** to track
- **8 Confirmed Decisions** from open questions