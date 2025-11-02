# 🧪 Manual Testing Checklist - Returns Management System

## Overview

This checklist covers manual testing for the Returns Management System. Run through each item to verify functionality works as expected in a real environment.

**Prerequisites:**
- ✅ Database migrations 008 and 009 completed
- ✅ Test data available (products, users, inventory)
- ✅ Email configured (optional for basic testing)
- ✅ Application running in development environment

---

## 📋 Test Execution Record

**Tester:** _____________________  
**Date:** _______________________  
**Environment:** ☐ Development  ☐ Staging  ☐ Production  
**Browser:** _____________________

---

## ✅ Task 7.33: Complete Return Workflow

### Step 1: Daily Stock Check-In
- [ ] Navigate to Daily Stock Check-In
- [ ] Add new stock for multiple products
- [ ] Verify batches are created in database
- [ ] Check that each batch has unique date_added

**Verification:** Check `inventory_batches` table in Supabase

### Step 2: Process Sales (FIFO Testing)
- [ ] Navigate to Sales/Billing page
- [ ] Process a sale for a product with multiple batches
- [ ] Verify oldest batch is consumed first
- [ ] Check batch quantities updated correctly

**Verification:** Query `inventory_batches` to see oldest batches reduced first

### Step 3: Navigate to Returns Page
- [ ] Click "Returns" navigation button
- [ ] Verify page loads without errors
- [ ] Check all batches display correctly
- [ ] Verify color-coded age badges appear

### Step 4: View Batch Information
- [ ] Verify Product Name column displays correctly
- [ ] Verify Batch Qty shows correct quantities
- [ ] Check Age Badge shows correct day count
- [ ] Confirm Date Added is accurate
- [ ] Verify Original Price displays
- [ ] Verify Sale Price displays
- [ ] Check Return % shows default value

### Step 5: FIFO Verification
- [ ] Verify oldest batches appear at the top
- [ ] Check age badges match batch ages
- [ ] Confirm colors: Green (0-2), Yellow (3-7), Red (7+)

### Step 6: Search and Filter
- [ ] Test search by product name
- [ ] Test filter by age category (Fresh/Medium/Old)
- [ ] Verify filtering updates table correctly
- [ ] Clear filters and verify all show

### Step 7: Test "Keep for Tomorrow"
- [ ] Check checkbox for a few batches
- [ ] Verify batch becomes grayed/disabled
- [ ] Uncheck and verify returns to normal
- [ ] Test with multiple batches

### Step 8: Test Return Percentage Override
- [ ] Change return % for a batch to 100%
- [ ] Change another to 20%
- [ ] Verify value calculations update in real-time
- [ ] Check summary totals update correctly

### Step 9: Process Return
- [ ] Select multiple batches to return
- [ ] Mix some to keep, some to return
- [ ] Mix different return percentages
- [ ] Click "Process Return" button
- [ ] Review confirmation dialog
- [ ] Verify totals are correct
- [ ] Confirm the return

### Step 10: Verify Return Processing
- [ ] Check success message appears
- [ ] Verify returned batches removed from inventory
- [ ] Check kept batches age incremented
- [ ] Verify return record created in database
- [ ] Check return_items created correctly
- [ ] Test email notification (if configured)

**Verification:**
- Query `returns` table for new record
- Query `return_items` for detailed records
- Query `inventory_batches` to verify deletions
- Check email inbox for notification

### Step 11: Returned Log
- [ ] Click "Returned Log" button
- [ ] Verify log opens in modal
- [ ] Check today's return appears
- [ ] Click on return date
- [ ] Verify transaction list appears
- [ ] Click on transaction
- [ ] Review detailed return items
- [ ] Verify all columns populated correctly

### Step 12: Next Day Workflow
- [ ] Come back next day or update batch dates
- [ ] Navigate to Returns page
- [ ] Verify kept batches show increased age
- [ ] Check "Kept from [date]" indicator appears
- [ ] Process another return
- [ ] Verify FIFO still prioritizes oldest

---

## ✅ Task 7.34: Color-Coded Age Badges

### Visual Verification
- [ ] **Green Badge (0-2 days):** Fresh batches show green circle with text
- [ ] **Yellow Badge (3-7 days):** Medium batches show yellow circle with text
- [ ] **Red Badge (8+ days):** Old batches show red circle with text
- [ ] Text displays "Day X" format correctly
- [ ] Badges consistent in Returns page and Returned Log
- [ ] Colors visible in both light/dark themes (if applicable)

### Edge Cases
- [ ] Day 0 batch shows green
- [ ] Day 2 batch shows green
- [ ] Day 3 batch shows yellow
- [ ] Day 7 batch shows yellow
- [ ] Day 8 batch shows red
- [ ] Very old (20+ days) shows red

---

## ✅ Task 7.35: Real-Time Calculations

### Return Value Calculations
- [ ] Uncheck all batches - total value = Rs. 0.00
- [ ] Check one batch - value appears immediately
- [ ] Check multiple batches - values sum correctly
- [ ] Change return % - value updates instantly
- [ ] Mix 20% and 100% - calculations correct
- [ ] Uncheck batch - value decreases

### Summary Totals
- [ ] Total Batches count updates
- [ ] Total Quantity calculates correctly
- [ ] Total Value calculates correctly
- [ ] Values update as you toggle checkboxes
- [ ] Summary sticky footer visible while scrolling

### Edge Cases
- [ ] Large quantities (100+) calculate correctly
- [ ] Decimal quantities work (if applicable)
- [ ] Very large return values display properly
- [ ] Zero values show Rs. 0.00 clearly

---

## ✅ Task 7.25: Role-Based Access Control

### Owner Role
- [ ] Login as owner
- [ ] Navigate to Returns page ✅ Allowed
- [ ] Process returns ✅ Allowed
- [ ] View Returned Log ✅ Allowed

### Cashier Role
- [ ] Login as cashier
- [ ] Navigate to Returns page ✅ Allowed
- [ ] Process returns ✅ Allowed
- [ ] View Returned Log ✅ Allowed

### Other Roles (if any)
- [ ] Login as non-cashier/owner
- [ ] Returns page not accessible ❌ Blocked

---

## ✅ Task 7.26: Confirmation Dialogs

### Process Return Confirmation
- [ ] Click "Process Return" with no batches selected
- [ ] Verify error message appears
- [ ] Select batches and click "Process Return"
- [ ] Confirmation dialog opens
- [ ] Verify all summary information displayed
- [ ] Click "Cancel" - dialog closes, nothing processed
- [ ] Open dialog again, click "Confirm"
- [ ] Return processes successfully

### Undo Return Confirmation
- [ ] Open Returned Log
- [ ] Select a past return
- [ ] Click "Undo Return"
- [ ] Confirmation dialog appears
- [ ] Verify warning message
- [ ] Cancel - nothing happens
- [ ] Confirm undo - return reversed

---

## ✅ Task 7.27: Error Handling

### Database Errors
- [ ] Simulate network failure
- [ ] Attempt to process return
- [ ] Verify error message displays
- [ ] Return not created
- [ ] User can retry

### Validation Errors
- [ ] Try to select 0 batches
- [ ] Verify validation message
- [ ] Cannot proceed without selection

### Partial Failures
- [ ] (If possible) Simulate partial processing failure
- [ ] Verify rollback occurs
- [ ] No partial data committed

---

## ✅ Task 7.31: CSV/PDF Export

### CSV Export
- [ ] Open Returned Log
- [ ] Click "Export CSV"
- [ ] File downloads
- [ ] Open in Excel/Google Sheets
- [ ] Verify columns present
- [ ] Check data accuracy
- [ ] Validate date formatting
- [ ] Check currency formatting

### PDF Export
- [ ] Open Returned Log
- [ ] Click "Export PDF" or use print dialog
- [ ] PDF generates/prints
- [ ] Verify layout readable
- [ ] Check all data included
- [ ] Validate formatting

---

## ✅ Task 7.32: Analytics and Charts

### Analytics Tab
- [ ] Open Returned Log
- [ ] Switch to "Trends" tab
- [ ] Verify daily return values chart
- [ ] Check bar heights proportional
- [ ] Verify date range shown

### Products Tab
- [ ] Switch to "Products" tab
- [ ] Verify most returned products list
- [ ] Check top 10 products
- [ ] Verify quantity and value displayed
- [ ] Check bar chart visualization

### Filtering Analytics
- [ ] Change date range
- [ ] Analytics update
- [ ] Apply product filter
- [ ] Apply value range filter
- [ ] Check archived toggle
- [ ] Pagination works (if > 20 items)

---

## ✅ Task 7.29 & 7.30: Performance Testing

### Returns Page Performance
- [ ] Load Returns page with 50+ batches
- [ ] Page loads < 3 seconds
- [ ] Scrolling smooth
- [ ] Search works responsively
- [ ] Filtering fast
- [ ] Calculations update quickly

### Returned Log Performance
- [ ] Create 100+ return records
- [ ] Open Returned Log
- [ ] Loads < 5 seconds
- [ ] Date list scrolls smoothly
- [ ] Transaction details load quickly
- [ ] Analytics calculate fast

### Large Dataset
- [ ] Test with 500+ batches (if possible)
- [ ] Test with 1000+ returns (if possible)
- [ ] Verify pagination works
- [ ] Export still functions
- [ ] No browser crashes

---

## ✅ Task 7.24: Backward Compatibility

### Existing Products
- [ ] Load products without new fields
- [ ] Verify default values applied
- [ ] Returns page works
- [ ] No errors logged
- [ ] Can edit and save new fields

### Old Data
- [ ] Verify historical sales unaffected
- [ ] Inventory migration successful
- [ ] Existing workflows still work

---

## ✅ Task 7.23: Data Migration

### Verify Migration 009
- [ ] Check `inventory_batches` table populated
- [ ] One batch per product with stock
- [ ] `date_added` set correctly
- [ ] Quantities match original `stock_quantity`
- [ ] No data loss

**SQL Verification:**
```sql
SELECT p.product_id, p.name, p.stock_quantity, 
       SUM(ib.quantity) as batch_total
FROM products p
LEFT JOIN inventory_batches ib ON p.product_id = ib.product_id
WHERE p.stock_quantity > 0
GROUP BY p.product_id, p.name, p.stock_quantity
ORDER BY p.product_id;
```

Expected: `batch_total` should match or be close to `stock_quantity`

---

## ✅ Task 7.28: Database Constraints

### Negative Quantities
- [ ] Attempt to create batch with -5 quantity
- [ ] Error prevents insert
- [ ] Appropriate error message

### Foreign Keys
- [ ] Attempt to create return with invalid user_id
- [ ] Error prevents insert
- [ ] Cascading deletes work (if applicable)

---

## ✅ Task 7.36: Regression Testing

### Run Existing Tests
- [ ] Run all product catalog tests
- [ ] Run all order tests
- [ ] Run all payment tests
- [ ] Run all customer auth tests
- [ ] Verify no failures introduced

**Command:**
```bash
npm test
```

**Expected:** All existing tests pass

### Manual Regression
- [ ] Daily Stock Check-In still works
- [ ] Sales processing unaffected
- [ ] Product catalog functions normally
- [ ] User management works
- [ ] Customer ordering works (if applicable)

---

## ✅ Task 7.37: Documentation Verification

### Code Documentation
- [ ] README updated with Returns page info
- [ ] Migration guides clear
- [ ] Setup instructions accurate
- [ ] Troubleshooting documented

### User Documentation
- [ ] Returns page user guide exists
- [ ] Screenshots included
- [ ] Step-by-step instructions
- [ ] FAQ section (if applicable)

---

## 📊 Test Summary

### Test Results
- **Total Tests:** 100+
- **Passed:** ____
- **Failed:** ____
- **Blocked:** ____
- **Pass Rate:** ____%

### Critical Issues Found
1. ____________________________________________
2. ____________________________________________
3. ____________________________________________

### Minor Issues Found
1. ____________________________________________
2. ____________________________________________

### Recommendations
- ____________________________________________
- ____________________________________________

### Approval
- **Tester Signature:** _____________________  
- **Date:** _______________________  
- **Status:** ☐ Approved  ☐ Needs Fixes  ☐ Rejected

---

## 🎯 Sign-Off

| Criteria | Status | Notes |
|----------|--------|-------|
| Functional Requirements Met | ☐ Yes ☐ No | |
| UI/UX Acceptable | ☐ Yes ☐ No | |
| Performance Acceptable | ☐ Yes ☐ No | |
| No Critical Bugs | ☐ Yes ☐ No | |
| Documentation Complete | ☐ Yes ☐ No | |

**Final Approval:** ☐ **APPROVED FOR PRODUCTION** ☐ **NOT APPROVED**

---

*Testing Guide Version 1.0*  
*Last Updated: 2025-01-30*

