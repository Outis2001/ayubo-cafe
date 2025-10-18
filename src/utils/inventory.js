/**
 * Inventory Management Utilities
 * Handles stock validation, calculations, and deduction logic
 */

/**
 * Validates if there's sufficient stock for all items in the cart
 * @param {Array} cart - Array of cart items with {product_id, quantity, name}
 * @param {Array} products - Array of all products with stock information
 * @returns {Object} { isValid: boolean, insufficientItems: Array }
 */
export const validateStock = (cart, products) => {
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

    // Check if requested quantity exceeds available stock
    if (cartItem.quantity > product.stock_quantity) {
      insufficientItems.push({
        name: product.name,
        requested: cartItem.quantity,
        available: product.stock_quantity
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
 * @param {Object} product - Product object with stock_quantity and low_stock_threshold
 * @returns {string} 'out' | 'low' | 'adequate'
 */
export const getStockStatus = (product) => {
  if (!product || product.stock_quantity === undefined) {
    return 'adequate';
  }

  if (product.stock_quantity === 0) {
    return 'out';
  }

  if (product.stock_quantity <= product.low_stock_threshold) {
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

