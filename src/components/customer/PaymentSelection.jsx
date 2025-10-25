/**
 * Payment Selection Component
 * 
 * Allows customers to choose between online payment (Stripe) and bank transfer.
 * Handles both deposit (40%) and balance (60%) payments.
 */

import { useState, useEffect } from 'react';
import { usePayments } from '../../hooks/usePayments';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  getBankAccountDetails,
  calculateDepositAmount,
  calculateBalanceAmount,
  formatCurrency,
  PAYMENT_TYPES,
} from '../../utils/payments';
import BankTransferPayment from './BankTransferPayment';
import { Loader } from '../icons';

const PaymentSelection = ({ order, paymentType, onSuccess, onCancel }) => {
  const { currentCustomer } = useCustomerAuth();
  const { processStripePayment, loading, error } = usePayments();

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [fetchingBankDetails, setFetchingBankDetails] = useState(false);

  // Stripe enabled from environment
  const stripeEnabled = import.meta.env.VITE_STRIPE_ENABLED === 'true';

  // Calculate payment amount based on type
  const getPaymentAmount = () => {
    if (!order) return 0;

    switch (paymentType) {
      case PAYMENT_TYPES.DEPOSIT:
        return calculateDepositAmount(order.total_amount);
      case PAYMENT_TYPES.BALANCE:
        return calculateBalanceAmount(order.total_amount);
      case PAYMENT_TYPES.FULL:
        return order.total_amount;
      default:
        return 0;
    }
  };

  const paymentAmount = getPaymentAmount();

  // Fetch bank details when bank transfer is selected
  useEffect(() => {
    if (selectedMethod === 'bank_transfer' && !bankDetails) {
      fetchBankDetails();
    }
  }, [selectedMethod]);

  const fetchBankDetails = async () => {
    setFetchingBankDetails(true);
    try {
      const details = await getBankAccountDetails();
      setBankDetails(details);
    } catch (err) {
      console.error('[Payment Selection] Error fetching bank details:', err);
    } finally {
      setFetchingBankDetails(false);
    }
  };

  // Handle Stripe payment
  const handleStripePayment = async () => {
    try {
      const result = await processStripePayment({
        order_id: order.order_id,
        customer_id: currentCustomer.customer_id,
        amount: paymentAmount,
        payment_type: paymentType,
        order_number: order.order_number,
        customer_email: currentCustomer.email,
      });

      if (result.success) {
        // User will be redirected to Stripe checkout
        // On return, we'll handle success on payment-success page
      }
    } catch (err) {
      console.error('[Payment Selection] Stripe payment error:', err);
    }
  };

  // Handle bank transfer success
  const handleBankTransferSuccess = (result) => {
    if (onSuccess) {
      onSuccess(result);
    }
  };

  // Get payment type label
  const getPaymentTypeLabel = () => {
    switch (paymentType) {
      case PAYMENT_TYPES.DEPOSIT:
        return 'Deposit Payment (40%)';
      case PAYMENT_TYPES.BALANCE:
        return 'Balance Payment (60%)';
      case PAYMENT_TYPES.FULL:
        return 'Full Payment';
      default:
        return 'Payment';
    }
  };

  if (!order || !currentCustomer) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Missing order or customer information</p>
        </div>
      </div>
    );
  }

  // If bank transfer is selected, show bank transfer form
  if (selectedMethod === 'bank_transfer') {
    return (
      <BankTransferPayment
        order={order}
        paymentType={paymentType}
        paymentAmount={paymentAmount}
        bankDetails={bankDetails}
        onSuccess={handleBankTransferSuccess}
        onCancel={() => setSelectedMethod(null)}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {getPaymentTypeLabel()}
        </h2>
        <p className="text-gray-600">
          Order #{order.order_number}
        </p>
      </div>

      {/* Payment Amount */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-800 mb-1">Amount to Pay</p>
            <p className="text-3xl font-bold text-blue-900">
              {formatCurrency(paymentAmount)}
            </p>
          </div>
          {paymentType === PAYMENT_TYPES.DEPOSIT && (
            <div className="text-right">
              <p className="text-sm text-blue-600">Remaining Balance</p>
              <p className="text-xl font-semibold text-blue-900">
                {formatCurrency(calculateBalanceAmount(order.total_amount))}
              </p>
              <p className="text-xs text-blue-600 mt-1">Due at pickup</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Choose Payment Method
        </h3>

        <div className="space-y-4">
          {/* Stripe Payment */}
          {stripeEnabled && (
            <button
              onClick={() => setSelectedMethod('stripe')}
              className="w-full border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Credit / Debit Card
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Pay securely with your credit or debit card via Stripe
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      Instant Confirmation
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Secure
                    </span>
                  </div>
                </div>
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          )}

          {/* Bank Transfer */}
          <button
            onClick={() => setSelectedMethod('bank_transfer')}
            disabled={fetchingBankDetails}
            className="w-full border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                    />
                  </svg>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Bank Transfer
                  </h4>
                </div>
                <p className="text-sm text-gray-600">
                  Transfer directly to our bank account and upload receipt
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                    Verification Required
                  </span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    2-4 Hours
                  </span>
                </div>
              </div>
              {fetchingBankDetails ? (
                <Loader className="w-6 h-6 text-blue-600 animate-spin" />
              ) : (
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Stripe Payment Action */}
      {selectedMethod === 'stripe' && (
        <div className="mb-6">
          <button
            onClick={handleStripePayment}
            disabled={loading}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Proceed to Secure Payment
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <div className="text-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Payment Security Note */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          🔒 Your payment information is secure and encrypted. We never store your card details.
        </p>
      </div>
    </div>
  );
};

export default PaymentSelection;

