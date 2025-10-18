# PRD: Dynamic Product Sorting by Sales Performance

## Introduction/Overview

Currently, products in the Ayubo Cafe billing system are displayed in a fixed order (by product_id). This PRD describes a feature that will automatically rearrange product cards based on sales performance, showing the most popular items first. This will improve the cashier's efficiency by placing frequently ordered items at the top of the product list, reducing search time and speeding up the billing process.

**Problem it solves:** Cashiers waste time scrolling through products to find popular items. By automatically surfacing bestsellers, we reduce order processing time and improve user experience.

**Goal:** Implement a configurable, database-driven product sorting system that dynamically reorders products based on sales quantity, with real-time updates after each transaction.

## Goals

1. **Improve Cashier Efficiency:** Reduce time spent searching for popular products by 50%
2. **Configurable Sorting Window:** Allow owners to adjust the time window (last N orders vs all-time) for sales-based sorting
3. **Real-time Updates:** Product list automatically reorders after each confirmed bill
4. **Role-Based Visibility:** Show sales metrics only to owners while all users benefit from optimized ordering
5. **Accurate Weight Tracking:** Properly count weight-based products (e.g., 2.5kg cake counts as 2.5 units sold)

## User Stories

### Story 1: Cashier Using Sorted Products
**As a cashier,**  
I want the product list to show bestselling items first,  
So that I can quickly find and add popular items to the cart without scrolling.

**Acceptance Criteria:**
- Products are sorted with most-sold items at the top
- Order updates automatically after I confirm each bill
- I don't need to refresh the page to see the updated order

### Story 2: Owner Configuring Sort Window
**As an owner,**  
I want to configure whether products are sorted by all-time sales or recent sales (last N orders),  
So that I can optimize the display based on seasonal trends or current inventory priorities.

**Acceptance Criteria:**
- I can set N value (number of recent orders to consider)
- Setting N=-1 uses all-time sales data (default)
- Setting N=10 uses only the last 10 orders
- Changes apply immediately across all devices

### Story 3: Owner Viewing Sales Performance
**As an owner,**  
I want to see sales quantity indicators on product cards,  
So that I can quickly identify which products are performing well.

**Acceptance Criteria:**
- I see a sales count badge on each product card (e.g., "Sold: 15")
- Guests and cashiers do not see this information
- Badge shows quantity based on current N setting

## Functional Requirements

### Core Sorting Logic

**FR1:** The system SHALL fetch aggregated sales data from the `order_items` table on initial load, calculating total quantity sold per product.

**FR2:** The system SHALL support configurable sorting windows:
- Default: N = -1 (all-time sales)
- Custom: N = any positive integer (last N orders)

**FR3:** For weight-based products (where `is_weight_based = true`), the system SHALL count the total weight sold (e.g., 2.5kg + 1.5kg = 4.0 units).

**FR4:** For unit-based products, the system SHALL count the total quantity sold (e.g., 5 pastries).

**FR5:** Products SHALL be sorted in descending order (most sold first, least sold last).

**FR6:** Products with zero sales SHALL appear at the bottom, maintaining their original order (by product_id).

### Real-time Updates

**FR7:** After a bill is confirmed, the system SHALL immediately recalculate sales data and re-sort the product list.

**FR8:** The product list SHALL update without requiring a page refresh.

**FR9:** All users (guests, cashiers, owners) SHALL see the updated sorted order simultaneously.

### Configuration Management

**FR10:** The system SHALL store the N value configuration in the database in a `settings` table.

**FR11:** Owners SHALL have access to a configuration UI to adjust the N value.

**FR12:** The configuration UI SHALL include:
- Input field for N value (-1 or positive integer)
- Description explaining what N=-1 means (all-time)
- Save button with confirmation feedback

**FR13:** Default N value SHALL be -1 (all-time sales) for new installations.

### Visual Indicators (Owner-only)

**FR14:** When logged in as "owner", product cards SHALL display a sales quantity badge.

**FR15:** The badge SHALL show: "Sold: [quantity]" or "Sold: [weight] kg" for weight-based products.

**FR16:** The badge SHALL reflect the current N setting (last N orders or all-time).

**FR17:** Guests and cashiers SHALL NOT see the sales quantity badge.

### Database Schema

**FR18:** Create a `settings` table with structure:
```sql
CREATE TABLE settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**FR19:** Insert default configuration:
```sql
INSERT INTO settings (setting_key, setting_value) 
VALUES ('product_sort_window', '-1');
```

### Data Fetching

**FR20:** The system SHALL fetch sales data using a query similar to:
```sql
-- For N = -1 (all-time)
SELECT 
  p.product_id,
  COALESCE(SUM(oi.quantity), 0) as total_sold
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id
ORDER BY total_sold DESC;

-- For N = 10 (last 10 orders)
SELECT 
  p.product_id,
  COALESCE(SUM(oi.quantity), 0) as total_sold
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_id IN (
  SELECT order_id FROM orders 
  ORDER BY order_date DESC 
  LIMIT 10
)
GROUP BY p.product_id
ORDER BY total_sold DESC;
```

**FR21:** Sales data SHALL be fetched:
- On initial page load
- After each bill confirmation
- When N configuration is changed

## Non-Goals (Out of Scope)

1. **Manual Product Reordering:** Owners cannot manually drag-and-drop products to custom positions
2. **Multiple Sort Options:** No sorting by price, name, or stock (only by sales quantity)
3. **Category-Based Sorting:** No separate sorting within product categories
4. **User-Specific Sort Preferences:** All users see the same order (no per-user customization)
5. **Historical Sort Tracking:** No audit log of how product order changed over time
6. **A/B Testing:** No built-in feature to test different sort algorithms
7. **Predictive Sorting:** No ML-based prediction of future popular items

## Design Considerations

### UI Elements

**Configuration Panel (Owner Only):**
- Location: Inside the "Product Management" section (Settings panel)
- Components:
  - Label: "Product Sort Window"
  - Number input: Default value -1
  - Help text: "Set to -1 for all-time sales, or enter a number (e.g., 10) to use last N orders"
  - Save button

**Sales Badge (Owner Only):**
- Location: Bottom of product card, below price
- Style: Small badge with blue background
- Format: "Sold: 25" or "Sold: 12.5 kg"

### UX Behavior

- **Smooth Transition:** Product cards should animate/transition when reordering (not jump abruptly)
- **Loading State:** Show a subtle loading indicator while recalculating sort order
- **No Disruption:** If user has the cart open, don't interrupt their workflow
- **Consistency:** Maintain the same visual design as existing product cards

## Technical Considerations

### Implementation Approach

1. **Database Migration:** Create `settings` table before implementing feature
2. **React State:** Store sorted product array in component state
3. **Supabase Query:** Use `.select()` with joins to fetch aggregated sales data
4. **Sort Function:** Implement client-side sort based on fetched sales data
5. **useEffect Hook:** Trigger re-fetch and re-sort after `confirmBill()` succeeds

### Performance

- **Query Optimization:** Use indexed columns (`product_id`, `order_id`) for fast joins
- **Caching:** Consider caching sales data for 1-2 minutes to reduce database load
- **Pagination:** If product list grows beyond 100 items, consider pagination

### Dependencies

- Existing `products`, `orders`, and `order_items` tables
- Supabase client for database queries
- React hooks (`useState`, `useEffect`)

### Error Handling

- If sales data fetch fails, fall back to original order (by product_id)
- Show error message to owner if configuration save fails
- Log errors to console for debugging

## Success Metrics

1. **Efficiency Gain:** Reduce average time to add top 10 products to cart by 40%
2. **User Adoption:** 90% of cashiers report the sorted order is helpful
3. **Configuration Usage:** 50% of owners adjust the N value within first month
4. **Performance:** Sales data query completes in <500ms for datasets up to 1000 orders
5. **Accuracy:** 100% of products reflect correct sales quantities in owner view

## Open Questions

1. **Animation Duration:** How long should the product reorder animation take? 300ms (Suggest: 300ms)
2. **Tie-Breaking:** If two products have the same sales count, how should they be ordered? alphabetically (Suggest: alphabetically by name)
3. **Cache Strategy:** Should we implement client-side caching to reduce database queries? yes (Suggest: yes, with 2-minute TTL)
4. **Mobile View:** Should the sales badge be hidden on mobile to save space, even for owners? only show a fire emoji (Suggest: show abbreviated version like "Sold: 15")
5. **Zero Sales Indicator:** Should products with 0 sales show "Sold: 0" or no badge at all? No badge (Suggest: show "New" badge instead)

---

**Next Steps:**
1. Get approval on open questions
2. Create database migration for `settings` table
3. Generate task list using `@generate-tasks.md`
4. Begin implementation

