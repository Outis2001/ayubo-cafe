/**
 * Product Sorting Utilities
 * 
 * Utility functions for dynamic product sorting based on sales performance.
 * Includes sales data fetching, sorting logic, configuration management, and caching.
 * 
 * @module utils/productSorting
 */

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * In-memory cache for sales data with 5-minute TTL
 * @type {Object}
 * @property {Array|null} data - Cached sales data array
 * @property {number|null} timestamp - When cache was created (milliseconds)
 * @property {number|null} nValue - N value used for cached data
 * @property {number} TTL - Time-to-live in milliseconds (5 minutes)
 */
let salesCache = {
  data: null,
  timestamp: null,
  nValue: null,
  TTL: 300000 // 5 minutes in milliseconds
};

/**
 * Invalidates the sales data cache
 * Call this when new sales are made or N value changes
 * 
 * @returns {void}
 */
export const invalidateSalesCache = () => {
  console.log('🗑️ Sales cache invalidated');
  salesCache.data = null;
  salesCache.timestamp = null;
  salesCache.nValue = null;
};

/**
 * Checks if the cache is valid
 * Cache is valid if: data exists, timestamp is set, N value matches, and TTL hasn't expired
 * 
 * @param {number} nValue - Current N value to compare with cached N value
 * @returns {boolean} True if cache is valid and can be used
 */
const isCacheValid = (nValue) => {
  if (salesCache.data === null || salesCache.timestamp === null) {
    return false;
  }
  
  if (salesCache.nValue !== nValue) {
    return false; // N value changed, cache is invalid
  }
  
  const now = Date.now();
  const cacheAge = now - salesCache.timestamp;
  
  if (cacheAge >= salesCache.TTL) {
    return false; // Cache expired
  }
  
  return true;
};

// ============================================================================
// SALES DATA FETCHING
// ============================================================================

/**
 * Fetches aggregated sales data from the database
 * Supports two modes:
 * - N = -1: All-time sales (queries all order_items)
 * - N > 0: Last N orders (filters by most recent N orders)
 * 
 * Implements 5-minute caching to reduce database load
 * 
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} nValue - Sort window (-1 for all-time, or number of recent orders)
 * @returns {Promise<Array>} Array of objects: [{ product_id, total_sold }]
 * 
 * @example
 * // Fetch all-time sales
 * const salesData = await fetchSalesData(supabase, -1);
 * 
 * @example
 * // Fetch sales from last 10 orders
 * const salesData = await fetchSalesData(supabase, 10);
 */
export const fetchSalesData = async (supabaseClient, nValue) => {
  try {
    // Check cache first
    if (isCacheValid(nValue)) {
      console.log('✅ Using cached sales data (age: ' + 
        Math.round((Date.now() - salesCache.timestamp) / 1000) + 's)');
      return salesCache.data;
    }
    
    console.log('🔄 Fetching fresh sales data from database (N=' + nValue + ')');
    
    let salesData;
    
    if (nValue === -1) {
      // All-time sales: Query all order_items
      const { data, error } = await supabaseClient
        .from('order_items')
        .select('product_id, quantity');
      
      if (error) throw error;
      
      // Aggregate quantities by product_id
      const aggregated = {};
      data.forEach(item => {
        if (!aggregated[item.product_id]) {
          aggregated[item.product_id] = 0;
        }
        aggregated[item.product_id] += parseFloat(item.quantity);
      });
      
      // Convert to array format
      salesData = Object.entries(aggregated).map(([product_id, total_sold]) => ({
        product_id: parseInt(product_id),
        total_sold: total_sold
      }));
      
    } else {
      // Last N orders: Query order_items filtered by recent orders
      
      // Step 1: Get the IDs of the last N orders
      const { data: recentOrders, error: ordersError } = await supabaseClient
        .from('orders')
        .select('order_id')
        .order('order_date', { ascending: false })
        .limit(nValue);
      
      if (ordersError) throw ordersError;
      
      if (!recentOrders || recentOrders.length === 0) {
        // No orders exist, return empty data
        salesData = [];
      } else {
        // Step 2: Get order_items for those orders
        const orderIds = recentOrders.map(o => o.order_id);
        
        const { data, error } = await supabaseClient
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', orderIds);
        
        if (error) throw error;
        
        // Aggregate quantities by product_id
        const aggregated = {};
        data.forEach(item => {
          if (!aggregated[item.product_id]) {
            aggregated[item.product_id] = 0;
          }
          aggregated[item.product_id] += parseFloat(item.quantity);
        });
        
        // Convert to array format
        salesData = Object.entries(aggregated).map(([product_id, total_sold]) => ({
          product_id: parseInt(product_id),
          total_sold: total_sold
        }));
      }
    }
    
    // Update cache
    salesCache.data = salesData;
    salesCache.timestamp = Date.now();
    salesCache.nValue = nValue;
    
    console.log(`✅ Sales data fetched: ${salesData.length} products`);
    return salesData;
    
  } catch (error) {
    console.error('❌ Error fetching sales data:', error);
    
    // Fallback: Return cached data even if expired (better than nothing)
    if (salesCache.data !== null) {
      console.log('⚠️  Using expired cache as fallback');
      return salesCache.data;
    }
    
    // No cache available, return empty array
    return [];
  }
};

// ============================================================================
// PRODUCT SORTING
// ============================================================================

/**
 * Sorts products array by sales quantity (descending order)
 * 
 * Sorting rules:
 * 1. Products with higher sales appear first
 * 2. Tie-breaking: Alphabetically by product name
 * 3. Products with 0 sales appear at bottom, maintaining product_id order
 * 
 * @param {Array} products - Array of product objects
 * @param {Array} salesData - Array of sales data: [{ product_id, total_sold }]
 * @returns {Array} Sorted array of products
 * 
 * @example
 * const sortedProducts = sortProductsBySales(products, salesData);
 */
export const sortProductsBySales = (products, salesData) => {
  if (!products || products.length === 0) {
    return [];
  }
  
  if (!salesData || salesData.length === 0) {
    // No sales data, return products in original order (by product_id)
    return [...products].sort((a, b) => a.product_id - b.product_id);
  }
  
  // Create a map for quick lookup of sales quantities
  const salesMap = {};
  salesData.forEach(item => {
    salesMap[item.product_id] = item.total_sold;
  });
  
  // Merge products with sales data
  const productsWithSales = products.map(product => ({
    ...product,
    total_sold: salesMap[product.product_id] || 0
  }));
  
  // Sort products
  const sorted = productsWithSales.sort((a, b) => {
    // Rule 1: Sort by sales quantity (descending)
    if (b.total_sold !== a.total_sold) {
      return b.total_sold - a.total_sold;
    }
    
    // Rule 2: Tie-breaking - alphabetically by name
    if (a.total_sold > 0) {
      return a.name.localeCompare(b.name);
    }
    
    // Rule 3: Products with 0 sales - maintain product_id order
    return a.product_id - b.product_id;
  });
  
  return sorted;
};

// ============================================================================
// CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * Fetches the product sort configuration (N value) from the database
 * 
 * @param {Object} supabaseClient - Supabase client instance
 * @returns {Promise<number>} N value (-1 for all-time, or positive integer)
 * 
 * @example
 * const nValue = await fetchSortConfig(supabase);
 * // Returns: -1 (all-time) or 10 (last 10 orders)
 */
export const fetchSortConfig = async (supabaseClient) => {
  try {
    const { data, error } = await supabaseClient
      .from('settings')
      .select('setting_value')
      .eq('setting_key', 'product_sort_window')
      .single();
    
    if (error) throw error;
    
    const nValue = parseInt(data.setting_value);
    
    // Validate N value
    if (isNaN(nValue) || (nValue < -1)) {
      console.warn('⚠️  Invalid N value in database, using default -1');
      return -1;
    }
    
    console.log(`📊 Sort config loaded: N=${nValue}`);
    return nValue;
    
  } catch (error) {
    console.error('❌ Error fetching sort config:', error);
    // Fallback to default: all-time sales
    return -1;
  }
};

/**
 * Updates the product sort configuration (N value) in the database
 * Also invalidates the sales cache since configuration changed
 * 
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} nValue - New N value (-1 for all-time, or positive integer)
 * @returns {Promise<boolean>} True if successful, false otherwise
 * 
 * @example
 * const success = await updateSortConfig(supabase, 10);
 * if (success) {
 *   console.log('Configuration saved!');
 * }
 */
export const updateSortConfig = async (supabaseClient, nValue) => {
  try {
    // Validate N value
    const parsedN = parseInt(nValue);
    if (isNaN(parsedN) || parsedN < -1) {
      console.error('❌ Invalid N value:', nValue);
      return false;
    }
    
    const { error } = await supabaseClient
      .from('settings')
      .update({ 
        setting_value: parsedN.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'product_sort_window');
    
    if (error) throw error;
    
    // Invalidate cache since configuration changed
    invalidateSalesCache();
    
    console.log(`✅ Sort config updated: N=${parsedN}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error updating sort config:', error);
    return false;
  }
};

