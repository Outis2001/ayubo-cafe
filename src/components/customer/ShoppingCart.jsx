/**
 * Shopping Cart Component
 * 
 * Displays customer's shopping cart with:
 * - Cart items with product details, quantities, and prices
 * - Quantity adjustment controls
 * - Remove item functionality
 * - Cart totals (subtotal, deposit 40%, balance 60%)
 * - Proceed to checkout button
 * - Empty cart state
 * 
 * Mobile-first responsive design
 * 
 * @component
 */

import { useState } from 'react';
import { useCustomerOrder } from '../../context/CustomerOrderContext';

// Icons
const TrashIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const MinusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ShoppingBagIcon = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const InfoIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

/**
 * ShoppingCart Component
 * 
 * @param {Object} props
 * @param {Function} props.onCheckout - Callback when checkout button is clicked
 * @param {Function} props.onContinueShopping - Callback when continue shopping is clicked
 */
const ShoppingCart = ({ onCheckout, onContinueShopping }) => {
  const {
    cartItems,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    calculateCartTotals,
    isCartEmpty,
  } = useCustomerOrder();

  const [removingItemId, setRemovingItemId] = useState(null);
  const [updatingItemId, setUpdatingItemId] = useState(null);

  /**
   * Handle quantity increase
   */
  const handleIncreaseQuantity = (item) => {
    setUpdatingItemId(item.cart_item_id);
    const result = updateCartItemQuantity(item.cart_item_id, item.quantity + 1);
    
    if (!result.success) {
      alert(result.error || 'Failed to update quantity');
    }
    
    setTimeout(() => setUpdatingItemId(null), 300);
  };

  /**
   * Handle quantity decrease
   */
  const handleDecreaseQuantity = (item) => {
    if (item.quantity <= 1) {
      // Don't allow quantity below 1
      return;
    }
    
    setUpdatingItemId(item.cart_item_id);
    const result = updateCartItemQuantity(item.cart_item_id, item.quantity - 1);
    
    if (!result.success) {
      alert(result.error || 'Failed to update quantity');
    }
    
    setTimeout(() => setUpdatingItemId(null), 300);
  };

  /**
   * Handle remove item with confirmation
   */
  const handleRemoveItem = (item) => {
    if (confirm(`Remove ${item.product_name} from cart?`)) {
      setRemovingItemId(item.cart_item_id);
      
      setTimeout(() => {
        const result = removeFromCart(item.cart_item_id);
        
        if (!result.success) {
          alert(result.error || 'Failed to remove item');
        }
        
        setRemovingItemId(null);
      }, 300);
    }
  };

  /**
   * Handle clear cart with confirmation
   */
  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your entire cart?')) {
      const result = clearCart();
      
      if (!result.success) {
        alert(result.error || 'Failed to clear cart');
      }
    }
  };

  /**
   * Format currency
   */
  const formatPrice = (amount) => {
    return `Rs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // Calculate totals
  const totals = calculateCartTotals();

  // Empty cart state
  if (isCartEmpty()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Shopping Cart</h1>
            <p className="text-gray-600">Review your items and proceed to checkout</p>
          </div>

          {/* Empty state */}
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="flex justify-center mb-6 text-gray-300">
              <ShoppingBagIcon size={80} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-3">Your cart is empty</h2>
            <p className="text-gray-500 mb-8">
              Browse our delicious cakes and add items to your cart
            </p>
            {onContinueShopping && (
              <button
                onClick={onContinueShopping}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-xl font-medium hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Browse Products
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Shopping Cart</h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">{totals.totalItems} {totals.totalItems === 1 ? 'item' : 'items'} in your cart</p>
            <button
              onClick={handleClearCart}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Clear Cart
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Items - Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const isRemoving = removingItemId === item.cart_item_id;
              const isUpdating = updatingItemId === item.cart_item_id;
              const itemTotal = item.price * item.quantity;

              return (
                <div
                  key={item.cart_item_id}
                  className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                    isRemoving ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row p-4 gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="w-full sm:w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full sm:w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center">
                          <ShoppingBagIcon size={32} />
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 truncate">
                            {item.product_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {item.weight_option}
                            {item.servings && ` • ${item.servings} servings`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          disabled={isRemoving}
                          className="text-red-500 hover:text-red-700 transition-colors p-2 hover:bg-red-50 rounded-lg ml-2"
                          title="Remove item"
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>

                      {/* Price and Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDecreaseQuantity(item)}
                            disabled={item.quantity <= 1 || isUpdating}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg border-2 transition-all ${
                              item.quantity <= 1
                                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                : 'border-purple-500 text-purple-600 hover:bg-purple-50'
                            }`}
                          >
                            <MinusIcon size={16} />
                          </button>
                          
                          <span className={`w-12 text-center font-semibold text-gray-800 ${
                            isUpdating ? 'opacity-50' : ''
                          }`}>
                            {item.quantity}
                          </span>
                          
                          <button
                            onClick={() => handleIncreaseQuantity(item)}
                            disabled={isUpdating}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-purple-500 text-purple-600 hover:bg-purple-50 transition-all"
                          >
                            <PlusIcon size={16} />
                          </button>
                        </div>

                        {/* Item Price */}
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {formatPrice(item.price)} × {item.quantity}
                          </div>
                          <div className="text-lg font-bold text-purple-600">
                            {formatPrice(itemTotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Summary - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h2>

              {/* Subtotal */}
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
                </div>
              </div>

              {/* Deposit and Balance */}
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center gap-1">
                    Deposit (40%)
                    <div className="group relative">
                      <InfoIcon size={14} />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                        Pay 40% now to confirm your order
                      </div>
                    </div>
                  </span>
                  <span className="font-semibold text-green-600">{formatPrice(totals.depositAmount)}</span>
                </div>
                
                <div className="flex justify-between text-gray-700">
                  <span className="flex items-center gap-1">
                    Balance (60%)
                    <div className="group relative">
                      <InfoIcon size={14} />
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                        Pay remaining 60% at pickup
                      </div>
                    </div>
                  </span>
                  <span className="font-semibold text-blue-600">{formatPrice(totals.balanceAmount)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-purple-600">{formatPrice(totals.subtotal)}</span>
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> You'll pay the deposit (40%) now. The remaining balance is due at pickup.
                </p>
              </div>

              {/* Checkout Button */}
              <button
                onClick={onCheckout}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg mb-3"
              >
                Proceed to Checkout
              </button>

              {/* Continue Shopping */}
              {onContinueShopping && (
                <button
                  onClick={onContinueShopping}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Continue Shopping
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;

