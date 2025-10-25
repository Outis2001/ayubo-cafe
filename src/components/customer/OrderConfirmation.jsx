/**
 * Order Confirmation Component
 * 
 * Displays order confirmation after successful order placement.
 * Shows order number, details, and next steps.
 * 
 * Mobile-first responsive design
 * 
 * @component
 */

import { useState } from 'react';

// Icons
const CheckCircleIcon = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

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

const CreditCardIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const PackageIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const PhoneIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

/**
 * OrderConfirmation Component
 * 
 * @param {Object} props
 * @param {string} props.orderNumber - Order number
 * @param {Object} props.orderDetails - Full order details
 * @param {Function} props.onViewOrder - Callback to view order details
 * @param {Function} props.onContinueShopping - Callback to continue shopping
 * @param {Function} props.onProceedToPayment - Callback to proceed to payment
 */
const OrderConfirmation = ({
  orderNumber,
  orderDetails,
  onViewOrder,
  onContinueShopping,
  onProceedToPayment,
}) => {
  const [copied, setCopied] = useState(false);

  /**
   * Format currency
   */
  const formatPrice = (amount) => {
    return `Rs. ${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  /**
   * Copy order number to clipboard
   */
  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Determine payment method display
   */
  const getPaymentMethodDisplay = () => {
    if (!orderDetails) return 'Not specified';
    
    // This will be set when the order is created
    const method = orderDetails.payment_method || 'online';
    
    if (method === 'online') {
      return 'Online Payment (Stripe)';
    } else if (method === 'bank_transfer') {
      return 'Bank Transfer';
    }
    return method;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
          <div className="flex justify-center mb-6 text-green-500">
            <CheckCircleIcon size={80} />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Order Placed Successfully!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for your order. We've received your request and will prepare your delicious treats.
          </p>

          {/* Order Number */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-6">
            <p className="text-sm text-gray-600 mb-2">Your Order Number</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-bold text-purple-600 tracking-wider">
                {orderNumber}
              </span>
              <button
                onClick={handleCopyOrderNumber}
                className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 transition-colors shadow-sm"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Save this number to track your order
            </p>
          </div>

          {/* Next Steps - Payment Required */}
          {orderDetails && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <CreditCardIcon size={24} className="text-blue-600 flex-shrink-0 mt-1" />
                <div className="text-left">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Complete Your Payment
                  </h3>
                  <p className="text-sm text-blue-800 mb-3">
                    To confirm your order, please complete the deposit payment of{' '}
                    <strong>{formatPrice(orderDetails.deposit_amount)}</strong>.
                  </p>
                  {onProceedToPayment && (
                    <button
                      onClick={onProceedToPayment}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
                    >
                      Proceed to Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Order Details */}
        {orderDetails && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Order Details</h2>

            {/* Pickup Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <CalendarIcon size={24} className="text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Pickup Date</p>
                  <p className="font-semibold text-gray-800">
                    {formatDate(orderDetails.pickup_date)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <ClockIcon size={24} className="text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Pickup Time</p>
                  <p className="font-semibold text-gray-800">
                    {orderDetails.pickup_time}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CreditCardIcon />
                Payment Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatPrice(orderDetails.subtotal)}</span>
                </div>
                
                <div className="flex justify-between text-green-700 bg-green-50 p-3 rounded-lg">
                  <span className="font-medium">
                    Deposit ({orderDetails.deposit_percentage}%) - Pay Now
                  </span>
                  <span className="font-bold">{formatPrice(orderDetails.deposit_amount)}</span>
                </div>
                
                <div className="flex justify-between text-blue-700 bg-blue-50 p-3 rounded-lg">
                  <span className="font-medium">Balance - Pay at Pickup</span>
                  <span className="font-bold">{formatPrice(orderDetails.remaining_balance)}</span>
                </div>

                <div className="flex justify-between text-lg font-bold text-gray-800 pt-3 border-t border-gray-200">
                  <span>Total Amount</span>
                  <span className="text-purple-600">{formatPrice(orderDetails.total_amount)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Payment Method:</strong> {getPaymentMethodDisplay()}
                </p>
              </div>
            </div>

            {/* Special Instructions */}
            {orderDetails.special_instructions && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <PackageIcon />
                  Special Instructions
                </h3>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {orderDetails.special_instructions}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Important Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Important Information</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Complete Payment</h4>
                <p className="text-sm text-gray-600">
                  Please complete your deposit payment to confirm your order. Your order will be processed once payment is received.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Pickup Instructions</h4>
                <p className="text-sm text-gray-600">
                  Please arrive on your scheduled pickup date and time. Bring your order number for quick service.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Balance Payment</h4>
                <p className="text-sm text-gray-600">
                  The remaining balance of {orderDetails && formatPrice(orderDetails.remaining_balance)} is due at pickup. You can pay with cash or card.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <PhoneIcon size={16} className="text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Questions?</h4>
                <p className="text-sm text-gray-600">
                  Contact us if you have any questions about your order. We're here to help!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {onViewOrder && (
            <button
              onClick={onViewOrder}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              View Order Details
            </button>
          )}
          
          {onContinueShopping && (
            <button
              onClick={onContinueShopping}
              className="flex-1 bg-white border-2 border-purple-600 text-purple-600 py-4 rounded-xl font-semibold hover:bg-purple-50 transition-colors shadow-md"
            >
              Continue Shopping
            </button>
          )}
        </div>

        {/* Footer Message */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            You will receive order updates via SMS. Thank you for choosing Ayubo Cafe! 🎂
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;

