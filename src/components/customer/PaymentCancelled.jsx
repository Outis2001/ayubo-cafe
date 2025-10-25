/**
 * Payment Cancelled Page
 * 
 * Displayed when user cancels the Stripe payment process.
 */

import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentCancelled = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get('order_id');

  const handleRetryPayment = () => {
    if (orderId) {
      // Navigate to order details where user can retry payment
      navigate(`/customer/orders/${orderId}`);
    } else {
      navigate('/customer/orders');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Cancelled Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
            <svg
              className="w-10 h-10 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Payment Cancelled
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6">
            Your payment was cancelled and no charges were made to your card.
            Your order is still pending payment.
          </p>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              What happens now?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your order is still in our system</li>
              <li>• No payment has been processed</li>
              <li>• You can retry payment anytime</li>
              <li>• Order will be confirmed once payment is complete</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetryPayment}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry Payment
            </button>

            <button
              onClick={() => navigate('/customer/orders')}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View My Orders
            </button>

            <button
              onClick={() => navigate('/customer/products')}
              className="w-full px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Having trouble? Contact us at support@ayubocafe.lk or call +94 77 123 4567
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelled;

