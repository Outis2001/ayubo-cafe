/**
 * Quote Form Component (Staff - Owner Only)
 * 
 * Form for staff (owner role) to send quotes for custom cake requests.
 * 
 * Features:
 * - Display customer request details and uploaded image
 * - Show customer notes and delivery details
 * - Add multiple price/weight options
 * - Add servings estimate and preparation time
 * - Additional notes for quote
 * - Send quote function with status update
 * - Store quote details in database
 * - Record staff member who sent quote
 * - Send notification to customer
 * - Set quote expiration (1 week)
 * - Owner-only access restriction
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { logAuditEvent } from '../../utils/auditLog';
import { sendOTPSMS } from '../../utils/sms';
import { Loader } from '../icons';

const QuoteForm = ({ request, onSuccess, onCancel }) => {
  const { currentUser } = useAuth();

  // Check if user is owner
  const isOwner = currentUser?.role === 'owner';

  // Quote data state
  const [quoteData, setQuoteData] = useState({
    priceOptions: [
      { weight: '', price: '', servings: '', display_order: 1 },
    ],
    preparation_time_minutes: '',
    additional_notes: '',
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Initialize form if request is provided
  useEffect(() => {
    if (!isOwner) {
      setErrors({ permission: 'Only owners can send quotes' });
    }
  }, [isOwner]);

  // Add new price option
  const addPriceOption = () => {
    setQuoteData(prev => ({
      ...prev,
      priceOptions: [
        ...prev.priceOptions,
        {
          weight: '',
          price: '',
          servings: '',
          display_order: prev.priceOptions.length + 1,
        },
      ],
    }));
  };

  // Remove price option
  const removePriceOption = (index) => {
    if (quoteData.priceOptions.length === 1) {
      setErrors({ priceOptions: 'At least one price option is required' });
      return;
    }

    setQuoteData(prev => ({
      ...prev,
      priceOptions: prev.priceOptions.filter((_, i) => i !== index),
    }));
  };

  // Update price option
  const updatePriceOption = (index, field, value) => {
    setQuoteData(prev => ({
      ...prev,
      priceOptions: prev.priceOptions.map((option, i) =>
        i === index ? { ...option, [field]: value } : option
      ),
    }));

    // Clear errors for this field
    if (errors[`priceOption_${index}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`priceOption_${index}_${field}`];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Validate price options
    if (quoteData.priceOptions.length === 0) {
      newErrors.priceOptions = 'At least one price option is required';
    } else {
      quoteData.priceOptions.forEach((option, index) => {
        if (!option.weight || !option.weight.trim()) {
          newErrors[`priceOption_${index}_weight`] = 'Weight is required';
        }
        if (!option.price || parseFloat(option.price) <= 0) {
          newErrors[`priceOption_${index}_price`] = 'Valid price is required';
        }
        if (option.servings && (isNaN(option.servings) || parseInt(option.servings) < 1)) {
          newErrors[`priceOption_${index}_servings`] = 'Valid servings estimate is required';
        }
      });
    }

    // Validate preparation time
    if (!quoteData.preparation_time_minutes) {
      newErrors.preparation_time = 'Preparation time is required';
    } else if (isNaN(quoteData.preparation_time_minutes) || parseInt(quoteData.preparation_time_minutes) < 1) {
      newErrors.preparation_time = 'Valid preparation time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Send notification to customer
  const sendCustomerNotification = async (customerPhone, requestNumber) => {
    try {
      const message = `Your custom cake quote for request ${requestNumber} is ready! Please check your account to view and approve the quote. Quote expires in 7 days.`;
      
      await sendOTPSMS(customerPhone, message);
      
      console.log('[Quote] Notification sent to customer');
    } catch (error) {
      console.error('[Quote] Error sending notification:', error);
      // Don't fail the quote sending if notification fails
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isOwner) {
      setErrors({ permission: 'Only owners can send quotes' });
      return;
    }

    if (!request) {
      setErrors({ submit: 'No request data available' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      // Calculate quote expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Prepare quote data for storage
      const quoteDetails = {
        price_options: quoteData.priceOptions.map(option => ({
          weight: option.weight,
          price: parseFloat(option.price),
          servings: option.servings ? parseInt(option.servings) : null,
          display_order: option.display_order,
        })),
        preparation_time_minutes: parseInt(quoteData.preparation_time_minutes),
        additional_notes: quoteData.additional_notes || null,
      };

      // Update custom request with quote
      const { data: updatedRequest, error: updateError } = await supabaseClient
        .from('custom_cake_requests')
        .update({
          status: 'quoted',
          quote_details: quoteDetails,
          quoted_by: currentUser.user_id,
          quoted_at: new Date().toISOString(),
          quote_expires_at: expiresAt.toISOString(),
        })
        .eq('request_id', request.request_id)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('[Quote] Quote sent successfully:', updatedRequest);

      // Log audit event
      await logAuditEvent({
        action: 'quote_sent',
        target_type: 'custom_cake_request',
        target_id: request.request_id,
        details: {
          request_number: request.request_number,
          customer_id: request.customer_id,
          quoted_by: currentUser.user_id,
          price_options_count: quoteData.priceOptions.length,
          expires_at: expiresAt.toISOString(),
        },
        status: 'success',
      });

      // Send notification to customer
      if (request.customer?.phone_number) {
        await sendCustomerNotification(
          request.customer.phone_number,
          request.request_number
        );
      }

      // Create notification record in database
      try {
        await supabaseClient
          .from('customer_notifications')
          .insert([{
            customer_id: request.customer_id,
            notification_type: 'quote_ready',
            title: 'Quote Ready',
            message: `Your quote for custom cake request ${request.request_number} is ready for review.`,
            related_type: 'custom_cake_request',
            related_id: request.request_id,
            is_read: false,
          }]);
      } catch (notifError) {
        console.error('[Quote] Error creating notification record:', notifError);
        // Don't fail the quote sending if notification creation fails
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(updatedRequest);
      }

    } catch (error) {
      console.error('[Quote] Error sending quote:', error);
      setErrors({
        submit: error.message || 'Failed to send quote. Please try again.',
      });

      await logAuditEvent({
        action: 'quote_send_failed',
        target_type: 'custom_cake_request',
        target_id: request?.request_id,
        details: {
          error: error.message,
          customer_id: request?.customer_id,
        },
        status: 'failure',
      });
    } finally {
      setSubmitting(false);
    }
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

  // Format currency
  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!isOwner) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium">Access Denied</p>
          <p className="text-red-600 text-sm mt-2">
            Only owners can send quotes for custom cake requests.
          </p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">No request selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Send Quote
        </h1>
        <p className="text-gray-600">
          Create a quote for custom cake request {request.request_number}
        </p>
      </div>

      {/* Customer Request Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Request Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Customer Information
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-600">Name:</span>{' '}
                <span className="font-medium">{request.customer?.name || 'N/A'}</span>
              </p>
              <p>
                <span className="text-gray-600">Phone:</span>{' '}
                <span className="font-medium">{request.customer?.phone_number || 'N/A'}</span>
              </p>
              {request.customer?.email && (
                <p>
                  <span className="text-gray-600">Email:</span>{' '}
                  <span className="font-medium">{request.customer.email}</span>
                </p>
              )}
            </div>
          </div>

          {/* Delivery Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Delivery Details
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-600">Pickup Date:</span>{' '}
                <span className="font-medium">{formatDate(request.pickup_date)}</span>
              </p>
              <p>
                <span className="text-gray-600">Pickup Time:</span>{' '}
                <span className="font-medium">{request.pickup_time}</span>
              </p>
            </div>
          </div>

          {/* Customer Notes */}
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Customer Notes
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-600">Occasion:</span>{' '}
                <span className="font-medium">{request.occasion}</span>
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
              {request.additional_notes && (
                <p>
                  <span className="text-gray-600">Additional Notes:</span>{' '}
                  <span className="font-medium">{request.additional_notes}</span>
                </p>
              )}
            </div>
          </div>

          {/* Reference Image */}
          {request.reference_image_url && (
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Reference Image
              </h3>
              <img
                src={request.reference_image_url}
                alt="Customer reference"
                className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-300"
              />
            </div>
          )}
        </div>
      </div>

      {/* Quote Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Price Options */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Price Options
            </h2>
            <button
              type="button"
              onClick={addPriceOption}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Option
            </button>
          </div>

          {errors.priceOptions && (
            <p className="text-red-600 text-sm mb-4">{errors.priceOptions}</p>
          )}

          <div className="space-y-4">
            {quoteData.priceOptions.map((option, index) => (
              <div
                key={index}
                className="border border-gray-300 rounded-lg p-4 relative"
              >
                {/* Remove button */}
                {quoteData.priceOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePriceOption(index)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                    aria-label="Remove option"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Weight */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={option.weight}
                      onChange={(e) => updatePriceOption(index, 'weight', e.target.value)}
                      placeholder="e.g., 1kg, 2lb"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[`priceOption_${index}_weight`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`priceOption_${index}_weight`] && (
                      <p className="text-red-600 text-xs mt-1">
                        {errors[`priceOption_${index}_weight`]}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (Rs.) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={option.price}
                      onChange={(e) => updatePriceOption(index, 'price', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[`priceOption_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`priceOption_${index}_price`] && (
                      <p className="text-red-600 text-xs mt-1">
                        {errors[`priceOption_${index}_price`]}
                      </p>
                    )}
                  </div>

                  {/* Servings */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Servings (Optional)
                    </label>
                    <input
                      type="number"
                      value={option.servings}
                      onChange={(e) => updatePriceOption(index, 'servings', e.target.value)}
                      placeholder="e.g., 8"
                      min="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors[`priceOption_${index}_servings`] ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors[`priceOption_${index}_servings`] && (
                      <p className="text-red-600 text-xs mt-1">
                        {errors[`priceOption_${index}_servings`]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preparation Time */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Preparation Time
          </h2>

          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preparation Time (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={quoteData.preparation_time_minutes}
              onChange={(e) =>
                setQuoteData(prev => ({
                  ...prev,
                  preparation_time_minutes: e.target.value,
                }))
              }
              placeholder="e.g., 120"
              min="1"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.preparation_time ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.preparation_time && (
              <p className="text-red-600 text-sm mt-1">{errors.preparation_time}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Estimated time to prepare this custom cake
            </p>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Notes (Optional)
          </h2>

          <textarea
            value={quoteData.additional_notes}
            onChange={(e) =>
              setQuoteData(prev => ({
                ...prev,
                additional_notes: e.target.value,
              }))
            }
            rows={4}
            placeholder="Any additional information or special instructions for the customer..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> The customer will receive a notification when you send this quote. 
            The quote will expire in 7 days from now. The customer can approve or reject the quote 
            from their account.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Sending Quote...
              </>
            ) : (
              'Send Quote'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuoteForm;

