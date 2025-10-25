/**
 * Payment Success Page
 * 
 * Displayed after successful Stripe payment.
 * Retrieves payment details and updates order status.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabaseClient } from '../../config/supabase';
import { formatCurrency } from '../../utils/payments';
import { Loader } from '../icons';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [error, setError] = useState(null);

  const sessionId = searchParams.get('session_id');
  const paymentId = searchParams.get('payment_id');

  useEffect(() => {
    if (paymentId) {
      fetchPaymentInfo();
    } else {
      setError('Payment information not found');
      setLoading(false);
    }
  }, [paymentId]);

  const fetchPaymentInfo = async () => {
    try {
      // Fetch payment and order details
      const { data, error: fetchError } = await supabaseClient
        .from('customer_payments')
        .select(`
          *,
          customer_orders (
            order_number,
            order_type,
            total_amount,
            pickup_date,
            pickup_time
          )
        `)
        .eq('payment_id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      setPaymentInfo(data);
    } catch (err) {
      console.error('[Payment Success] Error fetching payment:', err);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Confirming your payment...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg
              className="w-16 h-16 text-red-600 mx-auto mb-4"
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
            <h2 className="text-xl font-semibold text-red-900 mb-2">Payment Information Not Found</h2>
            <p className="text-red-700 mb-6">{error || 'Unable to retrieve payment details'}</p>
            <button
              onClick={() => navigate('/customer/orders')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              View My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <svg
                className="w-10 h-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-600">
              Thank you for your payment. Your order has been confirmed.
            </p>
          </div>

          {/* Payment Details */}
          <div className="border-t border-b border-gray-200 py-6 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order Number</p>
                <p className="font-semibold text-gray-900">
                  {paymentInfo.customer_orders.order_number}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Type</p>
                <p className="font-semibold text-gray-900 capitalize">
                  {paymentInfo.payment_type}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(paymentInfo.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Method</p>
                <p className="font-semibold text-gray-900">
                  Credit/Debit Card
                </p>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Order Type:</span>
                <span className="font-medium text-gray-900 capitalize">
                  {paymentInfo.customer_orders.order_type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pickup Date:</span>
                <span className="font-medium text-gray-900">
                  {new Date(paymentInfo.customer_orders.pickup_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pickup Time:</span>
                <span className="font-medium text-gray-900">
                  {paymentInfo.customer_orders.pickup_time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(paymentInfo.customer_orders.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Remaining Balance (if deposit payment) */}
          {paymentInfo.payment_type === 'deposit' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">Remaining Balance</p>
                  <p className="text-2xl font-bold text-blue-900 mb-2">
                    {formatCurrency(paymentInfo.customer_orders.total_amount - paymentInfo.amount)}
                  </p>
                  <p className="text-sm text-blue-700">
                    Please pay the remaining balance when you collect your order.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">What's Next?</h4>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-semibold">1.</span>
                <span>You will receive an SMS confirmation shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-semibold">2.</span>
                <span>We'll notify you when your order is ready for pickup</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-semibold">3.</span>
                <span>Collect your order on {new Date(paymentInfo.customer_orders.pickup_date).toLocaleDateString()}</span>
              </li>
              {paymentInfo.payment_type === 'deposit' && (
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-semibold">4.</span>
                  <span>Pay the remaining balance at pickup</span>
                </li>
              )}
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/customer/orders')}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View My Orders
            </button>
            <button
              onClick={() => navigate('/customer/products')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Support Info */}
        <div className="text-center text-sm text-gray-600">
          <p>Need help? Contact us at support@ayubocafe.lk or call +94 77 123 4567</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

