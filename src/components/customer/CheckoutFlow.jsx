/**
 * Checkout Flow Component
 * 
 * Multi-step checkout process for customer orders:
 * 1. Pickup date and time selection
 * 2. Special instructions (optional)
 * 3. Order summary review
 * 4. Payment method selection
 * 5. Terms and conditions acceptance
 * 6. Order placement
 * 
 * Mobile-first responsive design
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useCustomerOrder } from '../../context/CustomerOrderContext';
import { supabaseClient } from '../../config/supabase';
import { validatePickupDate, getBlockedDates } from '../../utils/orderHolds';
import { createCustomerOrder, validateOrderData } from '../../utils/customerOrders';
import { Loader } from '../icons';

// Icons
const CalendarIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const AlertIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CheckCircleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CreditCardIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const BankIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

/**
 * CheckoutFlow Component
 * 
 * @param {Object} props
 * @param {Function} props.onBack - Callback to go back to cart
 * @param {Function} props.onOrderComplete - Callback when order is successfully placed
 */
const CheckoutFlow = ({ onBack, onOrderComplete }) => {
  const { currentCustomer } = useCustomerAuth();
  const { cartItems, calculateCartTotals, clearCart } = useCustomerOrder();

  // Configuration state
  const [config, setConfig] = useState({
    minAdvanceDays: 2,
    maxAdvanceDays: 90,
    depositPercentage: 40,
    pickupTimeSlots: [],
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form state
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(''); // 'online' or 'bank_transfer'
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Validation state
  const [dateError, setDateError] = useState('');
  const [blockedDates, setBlockedDates] = useState([]);
  const [holdsMap, setHoldsMap] = useState({});

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /**
   * Fetch system configuration on mount
   */
  useEffect(() => {
    fetchSystemConfig();
    fetchBlockedDates();
  }, []);

  /**
   * Fetch system configuration from database
   */
  const fetchSystemConfig = async () => {
    try {
      setLoadingConfig(true);

      const { data, error } = await supabaseClient
        .from('system_configuration')
        .select('config_key, config_value, data_type')
        .in('config_key', [
          'min_advance_order_days',
          'max_advance_order_days',
          'deposit_percentage',
          'pickup_time_slots'
        ]);

      if (error) throw error;

      // Parse configuration
      const configObj = {};
      data.forEach((item) => {
        let value = item.config_value;
        
        if (item.data_type === 'number') {
          value = parseInt(value, 10);
        } else if (item.data_type === 'json') {
          value = JSON.parse(value);
        }
        
        configObj[item.config_key] = value;
      });

      setConfig({
        minAdvanceDays: configObj.min_advance_order_days || 2,
        maxAdvanceDays: configObj.max_advance_order_days || 90,
        depositPercentage: configObj.deposit_percentage || 40,
        pickupTimeSlots: configObj.pickup_time_slots || [],
      });

    } catch (err) {
      console.error('[Checkout] Error fetching config:', err);
      setError('Failed to load configuration. Using defaults.');
    } finally {
      setLoadingConfig(false);
    }
  };

  /**
   * Fetch blocked dates from order holds
   */
  const fetchBlockedDates = async () => {
    try {
      const result = await getBlockedDates();
      
      if (result.success) {
        setBlockedDates(result.blockedDates);
        setHoldsMap(result.holdsMap);
      }
    } catch (err) {
      console.error('[Checkout] Error fetching blocked dates:', err);
    }
  };

  /**
   * Validate pickup date
   */
  const validateDate = async (dateString) => {
    if (!dateString) {
      setDateError('');
      return false;
    }

    const result = await validatePickupDate(
      dateString,
      config.minAdvanceDays,
      config.maxAdvanceDays
    );

    if (!result.success) {
      setDateError('Failed to validate date');
      return false;
    }

    if (!result.isValid) {
      setDateError(result.error);
      return false;
    }

    setDateError('');
    return true;
  };

  /**
   * Handle date change
   */
  const handleDateChange = async (e) => {
    const dateValue = e.target.value;
    setPickupDate(dateValue);
    await validateDate(dateValue);
  };

  /**
   * Get minimum selectable date (today + min advance days)
   */
  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + config.minAdvanceDays);
    return date.toISOString().split('T')[0];
  };

  /**
   * Get maximum selectable date (today + max advance days)
   */
  const getMaxDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + config.maxAdvanceDays);
    return date.toISOString().split('T')[0];
  };

  /**
   * Check if date is blocked
   */
  const isDateBlocked = (dateString) => {
    return !!holdsMap[dateString];
  };

  /**
   * Format currency
   */
  const formatPrice = (amount) => {
    return `Rs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  /**
   * Validate form before submission
   */
  const validateForm = () => {
    if (!pickupDate) {
      setError('Please select a pickup date');
      return false;
    }

    if (dateError) {
      setError('Please select a valid pickup date');
      return false;
    }

    if (!pickupTime) {
      setError('Please select a pickup time');
      return false;
    }

    if (!paymentMethod) {
      setError('Please select a payment method');
      return false;
    }

    if (!termsAccepted) {
      setError('Please accept the terms and conditions');
      return false;
    }

    return true;
  };

  /**
   * Handle order submission
   */
  const handleSubmitOrder = async () => {
    try {
      setError('');

      // Validate form
      if (!validateForm()) {
        return;
      }

      setSubmitting(true);

      // Validate date one more time before submission
      const dateValid = await validateDate(pickupDate);
      if (!dateValid) {
        setError('Selected date is no longer available. Please choose another date.');
        setSubmitting(false);
        return;
      }

      // Prepare order data
      const totals = calculateCartTotals();
      const orderData = {
        customer_id: currentCustomer.customer_id,
        pickup_date: pickupDate,
        pickup_time: pickupTime,
        special_instructions: specialInstructions || null,
        order_type: 'pre-made',
        deposit_percentage: config.depositPercentage,
        items: cartItems.map((item) => ({
          product_id: item.product_id,
          pricing_id: item.pricing_id,
          quantity: item.quantity,
          unit_price: item.price,
          product_name: item.product_name,
          weight_option: item.weight_option,
        })),
      };

      // Validate order data
      const validation = validateOrderData(orderData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        setSubmitting(false);
        return;
      }

      console.log('[Checkout] Submitting order:', orderData);

      // Create order using stored procedure
      const result = await createCustomerOrder(orderData);

      if (!result.success) {
        setError(result.error || 'Failed to create order. Please try again.');
        setSubmitting(false);
        return;
      }

      console.log('[Checkout] Order created successfully:', result.order_number);

      // Clear cart after successful order
      clearCart();

      // Call success callback with order details
      if (onOrderComplete) {
        onOrderComplete({
          success: true,
          orderId: result.order_id,
          orderNumber: result.order_number,
          order: result.order,
          paymentMethod: paymentMethod,
          depositAmount: totals.depositAmount,
        });
      }

    } catch (err) {
      console.error('[Checkout] Error submitting order:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate totals
  const totals = calculateCartTotals();

  // Loading state
  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader size={48} />
          <p className="mt-4 text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-purple-600 hover:text-purple-700 font-medium mb-4 flex items-center gap-2"
          >
            ← Back to Cart
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your order details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Form - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Pickup Date & Time Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarIcon />
                Pickup Details
              </h2>

              {/* Date Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={handleDateChange}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 ${
                    dateError
                      ? 'border-red-500 focus:ring-red-200'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
                  }`}
                  required
                />
                {dateError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertIcon size={14} />
                    {dateError}
                  </p>
                )}
                {pickupDate && isDateBlocked(pickupDate) && (
                  <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
                    <AlertIcon size={14} />
                    {holdsMap[pickupDate]?.reason}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Orders must be placed {config.minAdvanceDays} to {config.maxAdvanceDays} days in advance
                </p>
              </div>

              {/* Time Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Time <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {config.pickupTimeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setPickupTime(slot)}
                      className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        pickupTime === slot
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 text-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <ClockIcon size={16} className="inline mr-1" />
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Instructions (Optional)
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Any special requests or notes for your order..."
                  rows="3"
                  maxLength="500"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {specialInstructions.length}/500 characters
                </p>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Payment Method
              </h2>

              <div className="space-y-3">
                {/* Online Payment */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('online')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    paymentMethod === 'online'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCardIcon size={24} />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        Online Payment (Stripe)
                      </div>
                      <div className="text-sm text-gray-600">
                        Pay securely with credit/debit card
                      </div>
                    </div>
                    {paymentMethod === 'online' && (
                      <CheckCircleIcon size={24} className="text-purple-600" />
                    )}
                  </div>
                </button>

                {/* Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BankIcon size={24} />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        Bank Transfer
                      </div>
                      <div className="text-sm text-gray-600">
                        Transfer to our bank account (requires verification)
                      </div>
                    </div>
                    {paymentMethod === 'bank_transfer' && (
                      <CheckCircleIcon size={24} className="text-purple-600" />
                    )}
                  </div>
                </button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> You will pay {config.depositPercentage}% deposit now. 
                  The remaining balance is due at pickup.
                </p>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Terms & Conditions
              </h2>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto text-sm text-gray-700 space-y-2">
                <p><strong>No Cancellation Policy:</strong></p>
                <p>Orders cannot be cancelled once the deposit is paid. Please ensure your order details are correct before payment.</p>
                
                <p className="pt-2"><strong>No Refund Policy:</strong></p>
                <p>Deposits and payments are non-refundable. If you have concerns about your order, please contact us before placing it.</p>
                
                <p className="pt-2"><strong>Pickup Policy:</strong></p>
                <p>Orders must be picked up on the scheduled date and time. Late pickups may result in additional charges or order cancellation.</p>
                
                <p className="pt-2"><strong>Quality Guarantee:</strong></p>
                <p>We guarantee the quality of our products. If there are any issues with your order, please notify us immediately upon pickup.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">
                  I have read and agree to the terms and conditions, including the no cancellation and no refund policy
                  <span className="text-red-500"> *</span>
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
                <AlertIcon />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Order Summary - Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-3 mb-4 pb-4 border-b border-gray-200 max-h-48 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.cart_item_id} className="flex justify-between text-sm">
                    <div>
                      <div className="font-medium text-gray-800">{item.product_name}</div>
                      <div className="text-gray-500">{item.weight_option} × {item.quantity}</div>
                    </div>
                    <div className="font-semibold text-gray-800">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span>Deposit ({config.depositPercentage}%)</span>
                  <span className="font-semibold">{formatPrice(totals.depositAmount)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Balance at Pickup</span>
                  <span className="font-semibold">{formatPrice(totals.balanceAmount)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center mb-6">
                <span className="text-lg font-bold text-gray-800">Total</span>
                <span className="text-2xl font-bold text-purple-600">{formatPrice(totals.subtotal)}</span>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader size={20} />
                    Processing Order...
                  </span>
                ) : (
                  `Place Order - Pay ${formatPrice(totals.depositAmount)}`
                )}
              </button>

              <p className="mt-3 text-xs text-center text-gray-500">
                Secure checkout • Your payment information is protected
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutFlow;

