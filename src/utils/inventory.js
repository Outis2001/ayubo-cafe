/**
 * Inventory Management Utilities
 * Handles stock validation, calculations, and deduction logic
 * Now supports batch-based inventory tracking
 */

import { getBatchesByProduct, getTotalStockForProduct } from './batchTracking';

/**
 * Get total stock quantity for a product from batches
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} productId - Product ID
 * @returns {Promise<number>} Total stock quantity
 */
export const getProductStockFromBatches = async (supabaseClient, productId) => {
  try {
    const batches = await getBatchesByProduct(supabaseClient, productId);
    return getTotalStockForProduct(batches);
  } catch (error) {
    console.error('Error getting product stock from batches:', error);
    return 0;
  }
};

/**
 * Validates if there's sufficient stock for all items in the cart
 * Now checks batch-based inventory instead of stock_quantity column
 * @param {Array} cart - Array of cart items with {product_id, quantity, name}
 * @param {Array} products - Array of all products with stock information
 * @param {Object} supabaseClient - Supabase client instance (optional for batch checking)
 * @returns {Promise<Object>} { isValid: boolean, insufficientItems: Array }
 */
export const validateStock = async (cart, products, supabaseClient = null) => {
  const insufficientItems = [];

  for (const cartItem of cart) {
    const product = products.find(p => p.product_id === cartItem.product_id);
    
    if (!product) {
      insufficientItems.push({
        name: cartItem.name,
        requested: cartItem.quantity,
        available: 0
      });
      continue;
    }

    let availableStock = 0;

    // If supabaseClient is provided, check batch-based stock
    if (supabaseClient) {
      availableStock = await getProductStockFromBatches(supabaseClient, product.product_id);
    } else {
      // Fallback to stock_quantity for backward compatibility
      availableStock = product.stock_quantity || 0;
    }

    // Check if requested quantity exceeds available stock
    if (cartItem.quantity > availableStock) {
      insufficientItems.push({
        name: product.name,
        requested: cartItem.quantity,
        available: availableStock
      });
    }
  }

  return {
    isValid: insufficientItems.length === 0,
    insufficientItems
  };
};

/**
 * Calculates how much stock to deduct for each product in the cart
 * @param {Array} cart - Array of cart items
 * @returns {Array} Array of {product_id, deductAmount}
 */
export const calculateStockDeductions = (cart) => {
  return cart.map(item => ({
    product_id: item.product_id,
    deductAmount: item.quantity
  }));
};

/**
 * Generates an insufficient stock error message
 * @param {Array} insufficientItems - Array of items with insufficient stock
 * @returns {string} Error message
 */
export const generateInsufficientStockMessage = (insufficientItems) => {
  if (insufficientItems.length === 0) {
    return '';
  }

  if (insufficientItems.length === 1) {
    const item = insufficientItems[0];
    return `Insufficient stock for ${item.name}. Requested: ${item.requested}, Available: ${item.available}`;
  }

  const itemList = insufficientItems
    .map(item => `${item.name} (need ${item.requested}, have ${item.available})`)
    .join(', ');

  return `Insufficient stock for multiple items: ${itemList}`;
};

/**
 * Determines the stock status of a product
 * Can use either stock_quantity (legacy) or batch-based stock
 * @param {Object} product - Product object with stock_quantity and low_stock_threshold
 * @param {number} batchStock - Optional: total stock from batches (if already calculated)
 * @returns {string} 'out' | 'low' | 'adequate'
 */
export const getStockStatus = (product, batchStock = null) => {
  if (!product) {
    return 'adequate';
  }

  // Use batch stock if provided, otherwise fall back to stock_quantity
  const stockQuantity = batchStock !== null ? batchStock : (product.stock_quantity || 0);

  if (stockQuantity === 0) {
    return 'out';
  }

  const threshold = product.low_stock_threshold || 5;
  if (stockQuantity <= threshold) {
    return 'low';
  }

  return 'adequate';
};

/**
 * Gets color classes based on stock status
 * @param {string} status - Stock status ('out' | 'low' | 'adequate')
 * @returns {Object} { bg, text, border, badge } color classes
 */
export const getStockStatusColors = (status) => {
  switch (status) {
    case 'out':
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-300',
        badge: 'bg-red-100 text-red-700'
      };
    case 'low':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        badge: 'bg-yellow-100 text-yellow-700'
      };
    case 'adequate':
      return {
        bg: 'bg-white',
        text: 'text-gray-900',
        border: 'border-gray-200',
        badge: 'bg-green-100 text-green-700'
      };
    default:
      return {
        bg: 'bg-white',
        text: 'text-gray-900',
        border: 'border-gray-200',
        badge: 'bg-gray-100 text-gray-700'
      };
  }
};

/**
 * Get stock quantities for all products from batches
 * @param {Object} supabaseClient - Supabase client instance
 * @returns {Promise<Object>} Map of product_id to stock quantity
 */
export const getAllProductStockFromBatches = async (supabaseClient) => {
  try {
    const { data, error } = await supabaseClient
      .from('inventory_batches')
      .select('product_id, quantity');

    if (error) throw error;

    const stockByProduct = {};
    
    (data || []).forEach(batch => {
      const productId = batch.product_id;
      const quantity = parseFloat(batch.quantity) || 0;
      
      if (!stockByProduct[productId]) {
        stockByProduct[productId] = 0;
      }
      stockByProduct[productId] += quantity;
    });

    return stockByProduct;
  } catch (error) {
    console.error('Error getting all product stock from batches:', error);
    return {};
  }
};

/**
 * Enrich products with batch-based stock quantities
 * @param {Array} products - Array of products
 * @param {Object} supabaseClient - Supabase client instance
 * @returns {Promise<Array>} Products with updated stock_quantity from batches
 */
export const enrichProductsWithBatchStock = async (products, supabaseClient) => {
  try {
    const stockByProduct = await getAllProductStockFromBatches(supabaseClient);
    
    return products.map(product => ({
      ...product,
      stock_quantity: stockByProduct[product.product_id] || 0
    }));
  } catch (error) {
    console.error('Error enriching products with batch stock:', error);
    return products;
  }
};

