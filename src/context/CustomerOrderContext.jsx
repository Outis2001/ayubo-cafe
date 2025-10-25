/**
 * Customer Order Context
 * 
 * Provides global shopping cart and order state management for customer portal.
 * Manages cart items, order creation, and cart persistence.
 * Handles cart operations (add, update, remove) and total calculations.
 * 
 * @module context/CustomerOrderContext
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { useCustomerAuth } from './CustomerAuthContext';

// Create the customer order context
const CustomerOrderContext = createContext(null);

// Storage key for cart persistence
const CART_STORAGE_KEY = 'ayubo_customer_cart';

/**
 * CustomerOrderProvider Component
 * 
 * Wraps the customer portal to provide cart and order state management
 * to all child components via React Context.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const CustomerOrderProvider = ({ children }) => {
  // Get customer authentication state
  const { currentCustomer, isAuthenticated } = useCustomerAuth();

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(false);
  
  // Order state
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);

  /**
   * Load cart from localStorage on mount and when auth state changes
   * Cart is persisted per customer using phone number as identifier
   */
  useEffect(() => {
    if (isAuthenticated && currentCustomer) {
      loadCartFromStorage();
    } else {
      // Clear cart if user logs out
      setCartItems([]);
    }
  }, [isAuthenticated, currentCustomer]);

  /**
   * Save cart to localStorage whenever it changes
   */
  useEffect(() => {
    if (isAuthenticated && currentCustomer && cartItems.length >= 0) {
      saveCartToStorage();
    }
  }, [cartItems, isAuthenticated, currentCustomer]);

  /**
   * Load cart from localStorage
   * Cart is stored per customer to prevent cart mixing between accounts
   */
  const loadCartFromStorage = () => {
    try {
      const storageKey = `${CART_STORAGE_KEY}_${currentCustomer.customer_id}`;
      const savedCart = localStorage.getItem(storageKey);
      
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        
        // Validate cart structure and expiry
        if (Array.isArray(parsedCart) && parsedCart.length > 0) {
          // Check if cart has expired (older than 7 days)
          const cartTimestamp = localStorage.getItem(`${storageKey}_timestamp`);
          if (cartTimestamp) {
            const daysSinceCreation = (Date.now() - parseInt(cartTimestamp)) / (1000 * 60 * 60 * 24);
            
            if (daysSinceCreation > 7) {
              // Cart expired, clear it
              console.log('[Cart] Cart expired (>7 days), clearing...');
              clearCartStorage();
              return;
            }
          }
          
          setCartItems(parsedCart);
          console.log('[Cart] Loaded cart from storage:', parsedCart.length, 'items');
        }
      }
    } catch (error) {
      console.error('[Cart] Error loading cart from storage:', error);
      // If there's an error parsing, clear the corrupted data
      clearCartStorage();
    }
  };

  /**
   * Save cart to localStorage
   */
  const saveCartToStorage = () => {
    try {
      const storageKey = `${CART_STORAGE_KEY}_${currentCustomer.customer_id}`;
      localStorage.setItem(storageKey, JSON.stringify(cartItems));
      localStorage.setItem(`${storageKey}_timestamp`, Date.now().toString());
    } catch (error) {
      console.error('[Cart] Error saving cart to storage:', error);
    }
  };

  /**
   * Clear cart from localStorage
   */
  const clearCartStorage = () => {
    try {
      const storageKey = `${CART_STORAGE_KEY}_${currentCustomer?.customer_id}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_timestamp`);
    } catch (error) {
      console.error('[Cart] Error clearing cart storage:', error);
    }
  };

  /**
   * Add item to cart or update quantity if already exists
   * 
   * @param {Object} item - Cart item to add
   * @param {string} item.product_id - Product ID
   * @param {string} item.product_name - Product name
   * @param {string} item.pricing_id - Selected pricing option ID
   * @param {string} item.weight_option - Weight/size option (e.g., "1kg", "500g")
   * @param {number} item.price - Unit price for selected option
   * @param {number} item.quantity - Quantity to add
   * @param {string} item.product_image - Product image URL (optional)
   * @param {number} item.servings - Estimated servings (optional)
   * @returns {Object} Result with success status
   */
  const addToCart = (item) => {
    try {
      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Please login to add items to cart',
        };
      }

      // Validate required fields
      if (!item.product_id || !item.pricing_id || !item.product_name || !item.price || !item.quantity) {
        return {
          success: false,
          error: 'Invalid item data',
        };
      }

      // Check if item already exists in cart (same product + same pricing option)
      const existingItemIndex = cartItems.findIndex(
        (cartItem) => 
          cartItem.product_id === item.product_id && 
          cartItem.pricing_id === item.pricing_id
      );

      if (existingItemIndex !== -1) {
        // Item exists, update quantity
        const updatedCart = [...cartItems];
        updatedCart[existingItemIndex].quantity += item.quantity;
        setCartItems(updatedCart);
        
        console.log('[Cart] Updated item quantity:', item.product_name, 'to', updatedCart[existingItemIndex].quantity);
      } else {
        // New item, add to cart
        const newItem = {
          cart_item_id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
          product_id: item.product_id,
          product_name: item.product_name,
          pricing_id: item.pricing_id,
          weight_option: item.weight_option || '',
          price: item.price,
          quantity: item.quantity,
          product_image: item.product_image || null,
          servings: item.servings || null,
          added_at: new Date().toISOString(),
        };
        
        setCartItems([...cartItems, newItem]);
        console.log('[Cart] Added new item:', item.product_name);
      }

      return {
        success: true,
        message: 'Item added to cart',
      };
    } catch (error) {
      console.error('[Cart] Error adding to cart:', error);
      return {
        success: false,
        error: 'Failed to add item to cart',
      };
    }
  };

  /**
   * Update quantity of cart item
   * 
   * @param {string} cartItemId - Cart item ID
   * @param {number} newQuantity - New quantity (must be >= 1)
   * @returns {Object} Result with success status
   */
  const updateCartItemQuantity = (cartItemId, newQuantity) => {
    try {
      if (newQuantity < 1) {
        return {
          success: false,
          error: 'Quantity must be at least 1',
        };
      }

      const updatedCart = cartItems.map((item) =>
        item.cart_item_id === cartItemId
          ? { ...item, quantity: newQuantity }
          : item
      );

      setCartItems(updatedCart);
      
      console.log('[Cart] Updated item quantity:', cartItemId, 'to', newQuantity);

      return {
        success: true,
        message: 'Quantity updated',
      };
    } catch (error) {
      console.error('[Cart] Error updating quantity:', error);
      return {
        success: false,
        error: 'Failed to update quantity',
      };
    }
  };

  /**
   * Remove item from cart
   * 
   * @param {string} cartItemId - Cart item ID to remove
   * @returns {Object} Result with success status
   */
  const removeFromCart = (cartItemId) => {
    try {
      const updatedCart = cartItems.filter((item) => item.cart_item_id !== cartItemId);
      setCartItems(updatedCart);
      
      console.log('[Cart] Removed item:', cartItemId);

      return {
        success: true,
        message: 'Item removed from cart',
      };
    } catch (error) {
      console.error('[Cart] Error removing from cart:', error);
      return {
        success: false,
        error: 'Failed to remove item',
      };
    }
  };

  /**
   * Clear entire cart
   * 
   * @returns {Object} Result with success status
   */
  const clearCart = () => {
    try {
      setCartItems([]);
      clearCartStorage();
      
      console.log('[Cart] Cart cleared');

      return {
        success: true,
        message: 'Cart cleared',
      };
    } catch (error) {
      console.error('[Cart] Error clearing cart:', error);
      return {
        success: false,
        error: 'Failed to clear cart',
      };
    }
  };

  /**
   * Calculate cart totals
   * 
   * @returns {Object} Cart totals
   * @returns {number} subtotal - Total before deposit calculation
   * @returns {number} depositAmount - 40% deposit required
   * @returns {number} balanceAmount - 60% balance due at pickup
   * @returns {number} totalItems - Total number of items in cart
   */
  const calculateCartTotals = () => {
    const subtotal = cartItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);

    // Calculate deposit (40% of total)
    const depositAmount = subtotal * 0.4;
    
    // Calculate balance (60% of total)
    const balanceAmount = subtotal * 0.6;

    const totalItems = cartItems.reduce((total, item) => {
      return total + item.quantity;
    }, 0);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      depositAmount: parseFloat(depositAmount.toFixed(2)),
      balanceAmount: parseFloat(balanceAmount.toFixed(2)),
      totalItems,
    };
  };

  /**
   * Get cart item count (total number of items)
   * 
   * @returns {number} Total items in cart
   */
  const getCartItemCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  /**
   * Check if cart is empty
   * 
   * @returns {boolean} True if cart is empty
   */
  const isCartEmpty = () => {
    return cartItems.length === 0;
  };

  /**
   * Get specific cart item by ID
   * 
   * @param {string} cartItemId - Cart item ID
   * @returns {Object|null} Cart item or null if not found
   */
  const getCartItem = (cartItemId) => {
    return cartItems.find((item) => item.cart_item_id === cartItemId) || null;
  };

  /**
   * Check if product with specific pricing is in cart
   * 
   * @param {string} productId - Product ID
   * @param {string} pricingId - Pricing option ID
   * @returns {boolean} True if item is in cart
   */
  const isInCart = (productId, pricingId) => {
    return cartItems.some(
      (item) => item.product_id === productId && item.pricing_id === pricingId
    );
  };

  /**
   * Get quantity of specific product/pricing in cart
   * 
   * @param {string} productId - Product ID
   * @param {string} pricingId - Pricing option ID
   * @returns {number} Quantity in cart (0 if not in cart)
   */
  const getItemQuantity = (productId, pricingId) => {
    const item = cartItems.find(
      (item) => item.product_id === productId && item.pricing_id === pricingId
    );
    return item ? item.quantity : 0;
  };

  // Context value
  const value = {
    // State
    cartItems,
    cartLoading,
    currentOrder,
    orderHistory,

    // Cart operations
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,

    // Cart queries
    calculateCartTotals,
    getCartItemCount,
    isCartEmpty,
    getCartItem,
    isInCart,
    getItemQuantity,

    // Order operations (to be implemented in subsequent tasks)
    setCurrentOrder,
    setOrderHistory,
  };

  return (
    <CustomerOrderContext.Provider value={value}>
      {children}
    </CustomerOrderContext.Provider>
  );
};

/**
 * useCustomerOrder Hook
 * 
 * Custom hook to access customer order context.
 * Must be used within CustomerOrderProvider.
 * 
 * @returns {Object} Customer order context
 * @throws {Error} If used outside of CustomerOrderProvider
 * 
 * @example
 * const { cartItems, addToCart, calculateCartTotals } = useCustomerOrder();
 * 
 * // Add item to cart
 * addToCart({
 *   product_id: '123',
 *   product_name: 'Chocolate Cake',
 *   pricing_id: 'price_456',
 *   weight_option: '1kg',
 *   price: 2500,
 *   quantity: 1
 * });
 * 
 * // Get cart totals
 * const { subtotal, depositAmount } = calculateCartTotals();
 */
export const useCustomerOrder = () => {
  const context = useContext(CustomerOrderContext);

  if (context === null) {
    throw new Error('useCustomerOrder must be used within a CustomerOrderProvider');
  }

  return context;
};

export default CustomerOrderContext;

