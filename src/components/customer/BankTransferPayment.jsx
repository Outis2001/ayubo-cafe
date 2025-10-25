/**
 * Bank Transfer Payment Component
 * 
 * Allows customers to complete bank transfer payments by:
 * - Viewing bank account details
 * - Uploading payment receipt
 * - Entering transaction reference
 * - Submitting for staff verification
 */

import { useState } from 'react';
import { usePayments } from '../../hooks/usePayments';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { formatCurrency } from '../../utils/payments';
import { Loader } from '../icons';

const BankTransferPayment = ({
  order,
  paymentType,
  paymentAmount,
  bankDetails,
  onSuccess,
  onCancel,
}) => {
  const { currentCustomer } = useCustomerAuth();
  const { processBankTransferPayment, loading, error } = usePayments();

  const [receiptImage, setReceiptImage] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [uploadError, setUploadError] = useState(null);

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setUploadError(null);

    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setUploadError('Image size must be less than 10MB');
      return;
    }

    setReceiptImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const handleRemoveImage = () => {
    setReceiptImage(null);
    setReceiptPreview(null);
    setUploadError(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!receiptImage) {
      setUploadError('Please upload a payment receipt');
      return;
    }

    try {
      const result = await processBankTransferPayment({
        order_id: order.order_id,
        customer_id: currentCustomer.customer_id,
        amount: paymentAmount,
        payment_type: paymentType,
        receipt_image: receiptImage,
        transaction_reference: transactionReference.trim() || null,
      });

      if (result.success && onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      console.error('[Bank Transfer] Submission error:', err);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  if (!bankDetails) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to payment methods
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Bank Transfer Payment
        </h2>
        <p className="text-gray-600">
          Order #{order.order_number} - {formatCurrency(paymentAmount)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bank Account Details */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Bank Account Details
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Bank Name:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">{bankDetails.bank_name}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankDetails.bank_name)}
                  className="p-1 hover:bg-blue-100 rounded"
                  title="Copy"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Account Name:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">{bankDetails.account_name}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankDetails.account_name)}
                  className="p-1 hover:bg-blue-100 rounded"
                  title="Copy"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Account Number:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-blue-900">{bankDetails.account_number}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankDetails.account_number)}
                  className="p-1 hover:bg-blue-100 rounded"
                  title="Copy"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">Branch:</span>
              <span className="font-medium text-blue-900">{bankDetails.branch}</span>
            </div>

            <div className="pt-3 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-800">Amount to Transfer:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-900">{formatCurrency(paymentAmount)}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentAmount.toString())}
                    className="p-1 hover:bg-blue-100 rounded"
                    title="Copy"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-900 mb-2">Important Instructions:</h4>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>Transfer the exact amount to the bank account above</li>
            <li>Keep your bank receipt or transaction confirmation</li>
            <li>Take a clear photo of your receipt</li>
            <li>Upload the receipt below</li>
            <li>Your payment will be verified within 2-4 hours</li>
          </ol>
        </div>

        {/* Transaction Reference (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Reference (Optional)
          </label>
          <input
            type="text"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
            placeholder="e.g., TXN123456789"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter your bank transaction reference number if available
          </p>
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Payment Receipt <span className="text-red-500">*</span>
          </label>

          {!receiptPreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-600 mb-1">Click to upload receipt image</p>
                <p className="text-sm text-gray-500">JPG, PNG or WEBP (max 10MB)</p>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="w-full h-64 object-contain border border-gray-300 rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {uploadError && (
            <p className="text-red-600 text-sm mt-2">{uploadError}</p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !receiptImage}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              'Submit for Verification'
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          Once submitted, our team will verify your payment and confirm your order within 2-4 hours during business hours.
        </p>
      </div>
    </div>
  );
};

export default BankTransferPayment;

