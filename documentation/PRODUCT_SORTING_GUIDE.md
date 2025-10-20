# Product Sorting Feature Guide

## Overview

The Dynamic Product Sorting feature automatically arranges products based on sales performance, making it easier for cashiers to find popular items quickly.

## 🎯 How It Works

### Automatic Sorting
- Products are sorted by **total quantity sold** (most sold first)
- Sorting updates in **real-time** after each bill confirmation
- Uses a **5-minute cache** to reduce database load
- **Tie-breaking**: Products with equal sales are sorted alphabetically

### Configurable Time Window (N Value)

Owners can configure which sales data to use:

| N Value | Meaning | Use Case |
|---------|---------|----------|
| **-1** (default) | All-time sales | Overall best performers |
| **10** | Last 10 orders | Recent trending items |
| **50** | Last 50 orders | Weekly/monthly trends |

**Example:**
- Setting N=5 shows products sorted by sales from only the last 5 orders
- Good for highlighting current hot-sellers or new promotions

---

## 👥 User Roles

### Guest
- ✅ Benefits from sorted product order
- ❌ Cannot see sales badges
- ❌ Cannot access configuration

### Cashier
- ✅ Benefits from sorted product order
- ❌ Cannot see sales badges
- ❌ Cannot access configuration

### Owner
- ✅ Benefits from sorted product order
- ✅ Can see sales badges (🔥 on mobile, "Sold: X" on desktop)
- ✅ Can configure N value
- ✅ Full access to all features

---

## 🔧 Configuration (Owner Only)

### Accessing Configuration Panel

1. Log in as **Owner**
2. Click **"Products"** button in header
3. Find **"Product Sort Configuration"** panel at the top

### Changing N Value

1. Enter desired N value:
   - `-1` for all-time sales
   - Any positive number for last N orders
2. Click **"Save Configuration"**
3. Products will re-sort automatically
4. Success message confirms save

### Validation Rules

- ✅ N = -1 (all-time)
- ✅ N = 1, 2, 3... (positive integers)
- ❌ N = 0 (not allowed)
- ❌ N < -1 (not allowed)

---

## 🏷️ Sales Badges (Owner Only)

### Desktop View
Shows full text badges:
- **"Sold: 25"** - For regular products
- **"Sold: 12.5 kg"** - For weight-based products

### Mobile View (< 640px)
Shows fire emoji for popular items:
- **🔥** - Displayed only if sold quantity > 5
- No badge shown for 1-5 sales (space saving)
- No badge shown for 0 sales

### Badge Locations
1. **Main Product Cards** - Below price, above stock badge
2. **Product Management List** - Next to stock badge (always shows fire emoji mode)

---

## 📊 Sorting Algorithm

### Step-by-Step

1. **Fetch Sales Data**
   - Query `order_items` table
   - Filter by N value if specified
   - Aggregate quantities by product_id

2. **Apply Sorting Rules**
   ```
   Primary: Sort by total_sold (descending)
   Tie-break: Sort alphabetically by name
   Zero sales: Keep at bottom in product_id order
   ```

3. **Cache Results**
   - Store in memory for 5 minutes
   - Invalidate on bill confirmation
   - Invalidate on N value change

4. **Update Display**
   - Products reorder with 300ms smooth animation
   - Search results maintain sorted order

---

## 💾 Database Schema

### Settings Table
```sql
CREATE TABLE settings (
  setting_key VARCHAR(50) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default configuration
INSERT INTO settings VALUES ('product_sort_window', '-1', NOW());
```

### Query Examples

**Get all-time sales (N=-1):**
```sql
SELECT 
  p.product_id,
  p.name,
  COALESCE(SUM(oi.quantity), 0) as total_sold
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
GROUP BY p.product_id, p.name
ORDER BY total_sold DESC, p.name ASC;
```

**Get sales from last 10 orders (N=10):**
```sql
WITH recent_orders AS (
  SELECT order_id 
  FROM orders 
  ORDER BY order_date DESC 
  LIMIT 10
)
SELECT 
  p.product_id,
  p.name,
  COALESCE(SUM(oi.quantity), 0) as total_sold
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
  AND oi.order_id IN (SELECT order_id FROM recent_orders)
GROUP BY p.product_id, p.name
ORDER BY total_sold DESC, p.name ASC;
```

---

## 🔄 Cache Strategy

### 5-Minute TTL (Time To Live)

**Why 5 minutes?**
- Reduces database queries significantly
- Keeps data reasonably fresh
- Balances performance vs accuracy

**Cache Behavior:**
```
First request → Query database → Store in cache
Next requests (< 5 min) → Return cached data instantly ⚡
After 5 minutes → Cache expires → Next request queries DB again
```

**Automatic Invalidation:**
- ✅ When bill is confirmed (new sales data)
- ✅ When N value changes (different data needed)
- ✅ After 5-minute TTL expires

---

## 🧪 Testing Checklist

### Database Migration ✓
- [x] Settings table created
- [x] Default N=-1 value exists
- [x] Trigger updates updated_at timestamp

### Basic Sorting ✓
- [ ] Products with sales appear before products without sales
- [ ] Higher sales appear first
- [ ] Ties are broken alphabetically
- [ ] Zero-sales products maintain product_id order

### Configuration (Owner) ✓
- [ ] Configuration panel visible to owner
- [ ] Can change N from -1 to 10
- [ ] Products resort after save
- [ ] Success message displays
- [ ] Invalid values show error

### Sales Badges (Owner) ✓
- [ ] Visible on product cards (main view)
- [ ] Visible in product management list
- [ ] Desktop shows "Sold: X" format
- [ ] Mobile shows 🔥 for sales > 5
- [ ] Hidden for sales = 0
- [ ] NOT visible to guests
- [ ] NOT visible to cashiers

### Real-Time Updates ✓
- [ ] Add products to cart → Confirm bill
- [ ] Products resort automatically
- [ ] No page refresh needed
- [ ] Smooth 300ms animation

### Cache Behavior ✓
- [ ] First load queries database
- [ ] Second load (< 5 min) uses cache
- [ ] Cache invalidates after bill
- [ ] Cache invalidates when N changes

### Weight-Based Products ✓
- [ ] Decimal quantities counted correctly (e.g., 2.5 kg)
- [ ] Badge shows "Sold: X kg"
- [ ] Sorting works with decimal values

### Search Integration ✓
- [ ] Search results maintain sorted order
- [ ] Top result is most-sold matching product

### Edge Cases ✓
- [ ] Works with 0 products
- [ ] Works with 0 orders
- [ ] Handles database connection errors gracefully
- [ ] Large datasets (100+ products) perform well

---

## 🚀 Performance

### Expected Metrics
- **Query Time:** < 500ms for 1000+ orders
- **Cache Hit Rate:** ~80% during busy hours
- **UI Responsiveness:** Instant (cached) or < 1s (database)
- **Animation:** Smooth 60fps transitions

### Optimization Tips
1. **Use appropriate N value**: Lower N = faster queries
2. **Let cache work**: Don't change N frequently
3. **Database indices**: Ensure `product_id` and `order_id` are indexed

---

## 🐛 Troubleshooting

### Products Not Reordering

**Symptoms:** Products stay in original order after sales

**Solutions:**
1. Check N value in configuration
2. Verify sales data exists in database
3. Check browser console for errors
4. Hard refresh (Ctrl+Shift+R)

### Configuration Not Saving

**Symptoms:** Changes don't persist or error message

**Solutions:**
1. Verify settings table exists
2. Check database permissions
3. Ensure valid N value (-1 or positive)
4. Check browser console for errors

### Sales Badges Not Showing

**Symptoms:** Owner doesn't see sales badges

**Solutions:**
1. Verify logged in as Owner (not cashier)
2. Check salesData loaded (browser console)
3. Verify orders and order_items have data
4. Hard refresh browser

### Slow Performance

**Symptoms:** Long load times, laggy UI

**Solutions:**
1. Reduce N value (use 10-50 instead of -1)
2. Check database query performance
3. Verify cache is working (check console logs)
4. Consider upgrading Supabase plan

---

## 📝 API Reference

### Utility Functions (`src/utils/productSorting.js`)

```javascript
// Fetch sales data with caching
fetchSalesData(supabaseClient, nValue) → Promise<Array>

// Sort products by sales
sortProductsBySales(products, salesData) → Array

// Get/set configuration
fetchSortConfig(supabaseClient) → Promise<number>
updateSortConfig(supabaseClient, nValue) → Promise<boolean>

// Cache management
invalidateSalesCache() → void
```

### Custom Hook (`src/hooks/useSortConfig.js`)

```javascript
const { sortN, updateSortN, loading, error } = useSortConfig();

// sortN: Current N value
// updateSortN: Function to update N
// loading: Loading/saving state
// error: Error message if any
```

---

## 🎓 Best Practices

### For Owners

1. **Start with N=-1**: Understand overall trends first
2. **Experiment with N**: Try 10-50 for seasonal promotions
3. **Monitor badges**: Use fire emoji to spot hot sellers quickly
4. **Adjust inventory**: Stock up on top-selling items

### For Developers

1. **Don't disable cache**: It's there for a reason
2. **Use proper error handling**: Database can fail
3. **Test with real data**: Use production-like datasets
4. **Monitor console logs**: Cache hits/misses logged

---

## 📚 Related Documentation

- [Main README](README.md) - Project overview
- [Database Migrations](database/README.md) - Migration guide
- [Inventory System](INVENTORY_SYSTEM_GUIDE.md) - Stock management

---

## 🆘 Support

**Common Issues:**
- Database migration not run → See `database/README.md`
- Configuration not visible → Verify owner login
- Slow queries → Reduce N value or check database indices

**Need Help?**
Check browser console for detailed error messages and stack traces.

