/**
 * Quote Approval Component (Customer)
 * 
 * Customer-facing component to view and respond to custom cake quotes.
 * 
 * Features:
 * - Display received quote with all price options
 * - Show quote expiration date
 * - Approve/reject buttons
 * - Create order from approved quote
 * - Convert custom request to order with quoted price
 * - Record rejection reason
 * - Update request status
 * - Response time tracking
 * - Expired quote handling
 */

import { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { supabaseClient } from '../../config/supabase';
import { logAuditEvent } from '../../utils/auditLog';
import { Loader } from '../icons';

const QuoteApproval = ({ request, onApprove, onReject, onClose }) => {
  const { currentCustomer, isAuthenticated } = useCustomerAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedPriceOption, setSelectedPriceOption] = useState(null);

  // Check if quote is expired
  const isQuoteExpired = () => {
    if (!request?.quote_expires_at) return false;
    return new Date(request.quote_expires_at) < new Date();
  };

  // Initialize selected price option
  useEffect(() => {
    if (request?.quote_details?.price_options?.length > 0) {
      setSelectedPriceOption(request.quote_details.price_options[0]);
    }
  }, [request]);

  // Handle approve quote
  const handleApprove = async () => {
    if (!isAuthenticated) {
      setError('Please log in to approve this quote');
      return;
    }

    if (!selectedPriceOption) {
      setError('Please select a price option');
      return;
    }

    if (isQuoteExpired()) {
      setError('This quote has expired. Please request a new quote.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate deposit (40%) and totals
      const depositPercentage = 40;
      const subtotal = parseFloat(selectedPriceOption.price);
      const depositAmount = (subtotal * depositPercentage) / 100;
      const remainingBalance = subtotal - depositAmount;

      // Create order from custom request
      const orderData = {
        customer_id: currentCustomer.customer_id,
        order_type: 'custom',
        pickup_date: request.pickup_date,
        pickup_time: request.pickup_time,
        special_instructions: request.additional_notes || null,
        subtotal: subtotal,
        deposit_percentage: depositPercentage,
        deposit_amount: depositAmount,
        remaining_balance: remainingBalance,
        total_amount: subtotal,
        status: 'pending_payment',
        custom_request_id: request.request_id,
      };

      // Create order record
      const { data: order, error: orderError } = await supabaseClient
        .from('customer_orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order item
      const orderItem = {
        order_id: order.order_id,
        product_name: `Custom Cake - ${request.occasion}`,
        weight_option: selectedPriceOption.weight,
        quantity: 1,
        unit_price: selectedPriceOption.price,
        subtotal: selectedPriceOption.price,
        servings_estimate: selectedPriceOption.servings_estimate || null,
      };

      const { error: itemError } = await supabaseClient
        .from('customer_order_items')
        .insert([orderItem]);

      if (itemError) throw itemError;

      // Update custom request status to 'approved'
      const { error: updateError } = await supabaseClient
        .from('custom_cake_requests')
        .update({
          status: 'approved',
          order_id: order.order_id,
          approved_at: new Date().toISOString(),
        })
        .eq('request_id', request.request_id);

      if (updateError) throw updateError;

      console.log('[Quote Approval] Quote approved, order created:', order);

      // Log audit event
      await logAuditEvent({
        action: 'quote_approved',
        target_type: 'custom_cake_request',
        target_id: request.request_id,
        details: {
          customer_id: currentCustomer.customer_id,
          order_id: order.order_id,
          order_number: order.order_number,
          selected_option: selectedPriceOption,
          total_amount: subtotal,
        },
        status: 'success',
      });

      // Create notification for staff
      try {
        await supabaseClient
          .from('customer_notifications')
          .insert([{
            customer_id: null, // Staff notification
            notification_type: 'quote_approved',
            title: 'Quote Approved',
            message: `Customer approved quote for ${request.request_number}. Order ${order.order_number} created.`,
            related_type: 'customer_order',
            related_id: order.order_id,
            is_read: false,
          }]);
      } catch (notifError) {
        console.error('[Quote Approval] Error creating staff notification:', notifError);
      }

      // Call success callback
      if (onApprove) {
        onApprove({
          order,
          request: { ...request, status: 'approved', order_id: order.order_id },
        });
      }

    } catch (err) {
      console.error('[Quote Approval] Error approving quote:', err);
      setError(err.message || 'Failed to approve quote. Please try again.');

      await logAuditEvent({
        action: 'quote_approval_failed',
        target_type: 'custom_cake_request',
        target_id: request?.request_id,
        details: {
          error: err.message,
          customer_id: currentCustomer.customer_id,
        },
        status: 'failure',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle reject quote
  const handleReject = async () => {
    if (!isAuthenticated) {
      setError('Please log in to reject this quote');
      return;
    }

    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Update custom request status to 'rejected'
      const { error: updateError } = await supabaseClient
        .from('custom_cake_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectReason,
        })
        .eq('request_id', request.request_id);

      if (updateError) throw updateError;

      console.log('[Quote Approval] Quote rejected');

      // Log audit event
      await logAuditEvent({
        action: 'quote_rejected',
        target_type: 'custom_cake_request',
        target_id: request.request_id,
        details: {
          customer_id: currentCustomer.customer_id,
          rejection_reason: rejectReason,
        },
        status: 'success',
      });

      // Create notification for staff
      try {
        await supabaseClient
          .from('customer_notifications')
          .insert([{
            customer_id: null, // Staff notification
            notification_type: 'quote_rejected',
            title: 'Quote Rejected',
            message: `Customer rejected quote for ${request.request_number}. Reason: ${rejectReason}`,
            related_type: 'custom_cake_request',
            related_id: request.request_id,
            is_read: false,
          }]);
      } catch (notifError) {
        console.error('[Quote Approval] Error creating staff notification:', notifError);
      }

      // Call success callback
      if (onReject) {
        onReject({
          request: { ...request, status: 'rejected', rejection_reason: rejectReason },
        });
      }

      setShowRejectModal(false);

    } catch (err) {
      console.error('[Quote Approval] Error rejecting quote:', err);
      setError(err.message || 'Failed to reject quote. Please try again.');

      await logAuditEvent({
        action: 'quote_rejection_failed',
        target_type: 'custom_cake_request',
        target_id: request?.request_id,
        details: {
          error: err.message,
          customer_id: currentCustomer.customer_id,
        },
        status: 'failure',
      });
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate days until expiration
  const getDaysUntilExpiration = () => {
    if (!request?.quote_expires_at) return null;
    const expiresAt = new Date(request.quote_expires_at);
    const now = new Date();
    const diffTime = expiresAt - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate deposit amount
  const calculateDeposit = (price) => {
    const depositPercentage = 40;
    return (parseFloat(price) * depositPercentage) / 100;
  };

  if (!request) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">No quote available</p>
        </div>
      </div>
    );
  }

  const expired = isQuoteExpired();
  const daysUntilExpiration = getDaysUntilExpiration();

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Your Custom Cake Quote
        </h1>
        <p className="text-gray-600">
          Request #{request.request_number}
        </p>
      </div>

      {/* Expiration Warning */}
      {expired ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-600 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-red-800 font-medium">Quote Expired</p>
              <p className="text-red-600 text-sm mt-1">
                This quote expired on {formatDate(request.quote_expires_at)}. Please submit a new request if you're still interested.
              </p>
            </div>
          </div>
        </div>
      ) : daysUntilExpiration !== null && daysUntilExpiration <= 2 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-yellow-600 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-yellow-800 font-medium">Quote Expiring Soon</p>
              <p className="text-yellow-600 text-sm mt-1">
                This quote expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''} on {formatDate(request.quote_expires_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quote Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quote Details
        </h2>

        {/* Your Request */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Your Request</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-600">Occasion:</span>{' '}
              <span className="font-medium">{request.occasion}</span>
            </p>
            <p>
              <span className="text-gray-600">Pickup Date:</span>{' '}
              <span className="font-medium">{formatDate(request.pickup_date)} at {request.pickup_time}</span>
            </p>
            {request.age && (
              <p>
                <span className="text-gray-600">Age:</span>{' '}
                <span className="font-medium">{request.age}</span>
              </p>
            )}
            {request.colors && (
              <p>
                <span className="text-gray-600">Colors:</span>{' '}
                <span className="font-medium">{request.colors}</span>
              </p>
            )}
            {request.writing_text && (
              <p>
                <span className="text-gray-600">Writing:</span>{' '}
                <span className="font-medium">{request.writing_text}</span>
              </p>
            )}
          </div>

          {/* Reference Image */}
          {request.reference_image_url && (
            <div className="mt-4">
              <img
                src={request.reference_image_url}
                alt="Your reference"
                className="w-full max-w-sm h-48 object-cover rounded-lg border border-gray-300"
              />
            </div>
          )}
        </div>

        {/* Price Options */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Available Price Options
          </h3>
          <div className="space-y-3">
            {request.quote_details?.price_options?.map((option, index) => (
              <div
                key={index}
                onClick={() => !expired && setSelectedPriceOption(option)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedPriceOption === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${expired ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedPriceOption === option && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                      <h4 className="font-semibold text-gray-900">{option.weight}</h4>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">
                      {formatCurrency(option.price)}
                    </p>
                    {option.servings_estimate && (
                      <p className="text-sm text-gray-600">
                        Serves approximately {option.servings_estimate} people
                      </p>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Deposit (40%): <span className="font-medium">{formatCurrency(calculateDeposit(option.price))}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Balance at pickup: <span className="font-medium">{formatCurrency(option.price - calculateDeposit(option.price))}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preparation Time */}
        {request.quote_details?.preparation_time_minutes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Estimated Preparation Time:</span>{' '}
              {Math.floor(request.quote_details.preparation_time_minutes / 60)} hours{' '}
              {request.quote_details.preparation_time_minutes % 60 > 0 && 
                `${request.quote_details.preparation_time_minutes % 60} minutes`
              }
            </p>
          </div>
        )}

        {/* Additional Notes */}
        {request.quote_details?.additional_notes && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Note from our team:</p>
            <p className="text-sm text-gray-600">{request.quote_details.additional_notes}</p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      {!expired && request.status === 'quoted' && (
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reject Quote
          </button>
          <button
            onClick={handleApprove}
            disabled={loading || !selectedPriceOption}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Approve & Create Order'
            )}
          </button>
        </div>
      )}

      {/* Close Button */}
      {onClose && (
        <div className="text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Info Box */}
      {!expired && request.status === 'quoted' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Important:</strong> By approving this quote, an order will be created and you'll need to pay a 40% deposit. 
            The remaining 60% will be due at pickup. Once approved, the order cannot be cancelled, and deposits are non-refundable.
          </p>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Quote
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please let us know why you're rejecting this quote. This helps us improve our service.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g., Price too high, different design needed, changed my mind..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setError(null);
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteApproval;

