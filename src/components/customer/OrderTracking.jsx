/**
 * Order Tracking Component (Customer)
 * 
 * Displays detailed order information and tracking for a specific order.
 * 
 * Features:
 * - Detailed order information
 * - Visual status progress indicator
 * - Order status history timeline
 * - Pickup details
 * - Payment information
 * - Pay balance button
 * - Custom cake request details
 * - Order modification (before payment)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { getOrderById } from '../../utils/customerOrders';
import { Loader } from '../icons';

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (customer && orderId) {
      fetchOrder();
    }
  }, [customer, orderId]);

  const fetchOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getOrderById(orderId);

      if (result.success) {
        // Verify order belongs to logged-in customer
        if (result.order.customer_id !== customer.customer_id) {
          setError('You do not have permission to view this order');
          return;
        }

        setOrder(result.order);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Order Tracking] Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'pending', label: 'Order Placed' },
      { key: 'confirmed', label: 'Confirmed' },
      { key: 'in_preparation', label: 'In Preparation' },
      { key: 'ready_for_pickup', label: 'Ready for Pickup' },
      { key: 'completed', label: 'Completed' },
    ];

    if (!order) return steps;

    const statusOrder = ['pending', 'confirmed', 'in_preparation', 'ready_for_pickup', 'completed'];
    const currentIndex = statusOrder.indexOf(order.order_status);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      current: index === currentIndex,
      cancelled: order.order_status === 'cancelled',
    }));
  };

  const formatStatus = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canModifyOrder = () => {
    if (!order) return false;
    return order.order_status === 'pending' && order.payment_status === 'pending';
  };

  const canPayBalance = () => {
    if (!order) return false;
    return (
      order.payment_status === 'partial' &&
      ['confirmed', 'in_preparation', 'ready_for_pickup'].includes(order.order_status)
    );
  };

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Please log in to view order details</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 mb-4">{error || 'Order not found'}</p>
          <button
            onClick={() => navigate('/customer/orders')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/customer/orders')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Orders
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {order.order_number}
            </h1>
            <p className="text-gray-600">
              Placed on {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div className="mt-4 sm:mt-0 text-right">
            <p className="text-3xl font-bold text-gray-900">
              Rs. {order.order_total?.toLocaleString() || '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Status Progress */}
      {order.order_status !== 'cancelled' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status</h2>
          
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200">
              <div
                className="h-full bg-blue-600 transition-all duration-500"
                style={{
                  width: `${(getStatusSteps().filter(s => s.completed).length - 1) / (getStatusSteps().length - 1) * 100}%`
                }}
              />
            </div>

            {/* Status Steps */}
            <div className="relative grid grid-cols-5 gap-2">
              {getStatusSteps().map((step, index) => (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      step.completed
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step.completed ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <p className={`text-xs text-center ${step.completed ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Status */}
      {order.order_status === 'cancelled' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Order Cancelled</h3>
              <p className="text-sm text-red-700 mt-1">
                This order has been cancelled. If you have questions, please contact us.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pickup Information</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Pickup Date</p>
            <p className="font-medium text-gray-900">
              {new Date(order.pickup_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Pickup Time</p>
            <p className="font-medium text-gray-900">{order.pickup_time}</p>
          </div>

          {order.customer_name && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Customer Name</p>
              <p className="font-medium text-gray-900">{order.customer_name}</p>
            </div>
          )}

          {order.customer_phone && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Contact Number</p>
              <p className="font-medium text-gray-900">{order.customer_phone}</p>
            </div>
          )}
        </div>

        {order.special_instructions && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Special Instructions: </span>
              {order.special_instructions}
            </p>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
        
        {order.items && order.items.length > 0 ? (
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start pb-3 border-b border-gray-200 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.product_name}</p>
                  {item.size && (
                    <p className="text-sm text-gray-600">Size: {item.size}</p>
                  )}
                  {item.customization_notes && (
                    <p className="text-sm text-gray-600">Notes: {item.customization_notes}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="font-medium text-gray-900">
                    Rs. {item.unit_price?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    Rs. {(item.unit_price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            {/* Totals */}
            <div className="pt-3 border-t-2 border-gray-300">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">Rs. {order.subtotal?.toLocaleString() || '0'}</span>
              </div>
              {order.tax_amount > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium text-gray-900">Rs. {order.tax_amount?.toLocaleString()}</span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-medium text-green-600">-Rs. {order.discount_amount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">Rs. {order.order_total?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No items in this order</p>
        )}
      </div>

      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h2>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Payment Status</span>
            <span className={`px-3 py-1 text-sm font-semibold rounded ${getPaymentStatusColor(order.payment_status)}`}>
              {formatStatus(order.payment_status)}
            </span>
          </div>

          {order.payment_method && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium text-gray-900">{formatStatus(order.payment_method)}</span>
            </div>
          )}

          {order.deposit_amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Deposit Paid</span>
              <span className="font-medium text-green-600">Rs. {order.deposit_amount?.toLocaleString()}</span>
            </div>
          )}

          {order.balance_due > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Balance Due</span>
              <span className="font-medium text-orange-600">Rs. {order.balance_due?.toLocaleString()}</span>
            </div>
          )}

          {canPayBalance() && (
            <button
              onClick={() => navigate(`/customer/orders/${order.order_id}/payment`)}
              className="w-full mt-4 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Pay Balance Now
            </button>
          )}
        </div>
      </div>

      {/* Custom Cake Request Details */}
      {order.order_type === 'custom' && order.custom_request_id && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Custom Cake Request</h2>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Request ID</span>
              <span className="font-medium text-gray-900">#{order.custom_request_id}</span>
            </div>

            <button
              onClick={() => navigate(`/customer/custom-requests/${order.custom_request_id}`)}
              className="w-full mt-4 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              View Request Details
            </button>
          </div>
        </div>
      )}

      {/* Order Status History */}
      {order.status_history && order.status_history.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
          
          <div className="space-y-4">
            {order.status_history.map((history, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-600 rounded-full" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{formatStatus(history.status)}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(history.changed_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {history.notes && (
                    <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {canModifyOrder() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need to Make Changes?</h3>
          <p className="text-sm text-blue-700 mb-4">
            You can modify your order before payment is completed.
          </p>
          <button
            onClick={() => {
              // TODO: Implement order modification
              alert('Order modification coming soon!');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Modify Order
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;

