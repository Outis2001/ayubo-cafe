/**
 * Order Details Component (Staff)
 * 
 * Detailed view of a single customer order with management capabilities.
 * 
 * Features:
 * - Display complete order information
 * - Show customer contact details
 * - Display pickup date, time, special instructions
 * - Show payment details and history
 * - Order status history timeline
 * - Update order status
 * - Add staff notes
 * - Cancel order with reason
 * - Print order receipt/label
 * - Send notifications on status changes
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../config/supabase';
import { useSession } from '../../hooks/useSession';
import { formatCurrency } from '../../utils/payments';
import { logAuditEvent } from '../../utils/auditLog';
import { Loader } from '../icons';

const OrderDetails = ({ order: initialOrder, onClose, onUpdate }) => {
  const { user } = useSession();

  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Status update
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Staff notes
  const [staffNotes, setStaffNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  
  // Cancellation
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  
  // Status history
  const [statusHistory, setStatusHistory] = useState([]);

  useEffect(() => {
    fetchOrderDetails();
    fetchStaffNotes();
    fetchStatusHistory();
  }, [order.order_id]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('customer_orders')
        .select(`
          *,
          customers!inner (
            full_name,
            phone_number,
            email
          ),
          customer_order_items (
            *
          ),
          customer_payments (
            *
          ),
          custom_cake_requests (
            request_number,
            occasion,
            reference_image_url
          )
        `)
        .eq('order_id', order.order_id)
        .single();

      if (fetchError) throw fetchError;

      setOrder(data);
    } catch (err) {
      console.error('[Order Details] Error fetching order:', err);
    }
  };

  const fetchStaffNotes = async () => {
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('customer_order_notes')
        .select(`
          *,
          users!inner (
            full_name
          )
        `)
        .eq('order_id', order.order_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setStaffNotes(data || []);
    } catch (err) {
      console.error('[Order Details] Error fetching notes:', err);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const { data, error: fetchError } = await supabaseClient
        .from('order_status_history')
        .select(`
          *,
          users (
            full_name
          )
        `)
        .eq('order_id', order.order_id)
        .order('changed_at', { ascending: false });

      if (fetchError) throw fetchError;

      setStatusHistory(data || []);
    } catch (err) {
      console.error('[Order Details] Error fetching status history:', err);
    }
  };

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!newStatus) {
      setError('Please select a status');
      return;
    }

    setUpdatingStatus(true);
    setError(null);

    try {
      // Call stored procedure to update status with history
      const { error: updateError } = await supabaseClient.rpc('update_order_status', {
        p_order_id: order.order_id,
        p_new_status: newStatus,
        p_changed_by: user.user_id,
        p_notes: statusNote || null,
      });

      if (updateError) throw updateError;

      // Send notification to customer
      try {
        await supabaseClient
          .from('customer_notifications')
          .insert([{
            customer_id: order.customer_id,
            notification_type: 'order_status_changed',
            title: 'Order Status Updated',
            message: `Your order ${order.order_number} status has been updated to: ${newStatus.replace('_', ' ')}`,
            related_type: 'customer_order',
            related_id: order.order_id,
            is_read: false,
          }]);
      } catch (notifError) {
        console.error('[Order Details] Error creating notification:', notifError);
      }

      // Log audit event
      await logAuditEvent({
        action: 'order_status_updated',
        target_type: 'customer_order',
        target_id: order.order_id,
        details: {
          old_status: order.status,
          new_status: newStatus,
          notes: statusNote,
        },
        status: 'success',
      });

      console.log('[Order Details] Status updated successfully');

      // Refresh data
      await fetchOrderDetails();
      await fetchStatusHistory();

      // Close modal and reset
      setShowStatusUpdate(false);
      setNewStatus('');
      setStatusNote('');

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[Order Details] Error updating status:', err);
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle add staff note
  const handleAddNote = async () => {
    if (!newNote.trim()) {
      return;
    }

    setAddingNote(true);

    try {
      const { error: insertError } = await supabaseClient
        .from('customer_order_notes')
        .insert([{
          order_id: order.order_id,
          note_text: newNote,
          created_by: user.user_id,
        }]);

      if (insertError) throw insertError;

      console.log('[Order Details] Note added successfully');

      // Refresh notes
      await fetchStaffNotes();

      // Reset
      setNewNote('');
    } catch (err) {
      console.error('[Order Details] Error adding note:', err);
      setError('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // Handle cancel order
  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      // Update order status to cancelled
      const { error: updateError } = await supabaseClient.rpc('update_order_status', {
        p_order_id: order.order_id,
        p_new_status: 'cancelled',
        p_changed_by: user.user_id,
        p_notes: `Cancelled: ${cancellationReason}`,
      });

      if (updateError) throw updateError;

      // Send notification to customer
      try {
        await supabaseClient
          .from('customer_notifications')
          .insert([{
            customer_id: order.customer_id,
            notification_type: 'order_cancelled',
            title: 'Order Cancelled',
            message: `Your order ${order.order_number} has been cancelled. Reason: ${cancellationReason}`,
            related_type: 'customer_order',
            related_id: order.order_id,
            is_read: false,
          }]);
      } catch (notifError) {
        console.error('[Order Details] Error creating notification:', notifError);
      }

      // Log audit event
      await logAuditEvent({
        action: 'order_cancelled',
        target_type: 'customer_order',
        target_id: order.order_id,
        details: {
          reason: cancellationReason,
          cancelled_by: user.user_id,
        },
        status: 'success',
      });

      console.log('[Order Details] Order cancelled successfully');

      // Refresh data
      await fetchOrderDetails();
      await fetchStatusHistory();

      // Close modal
      setShowCancelModal(false);
      setCancellationReason('');

      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[Order Details] Error cancelling order:', err);
      setError(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  // Handle print order
  const handlePrintOrder = () => {
    window.print();
  };

  // Get payment status
  const getPaymentStatus = () => {
    if (!order.customer_payments || order.customer_payments.length === 0) {
      return 'unpaid';
    }

    const successfulPayments = order.customer_payments.filter(p => p.payment_status === 'success');
    
    if (successfulPayments.length === 0) {
      return 'pending';
    }

    const paymentTypes = successfulPayments.map(p => p.payment_type);
    
    if (paymentTypes.includes('full')) {
      return 'fully_paid';
    }
    
    if (paymentTypes.includes('deposit') && paymentTypes.includes('balance')) {
      return 'fully_paid';
    }
    
    if (paymentTypes.includes('deposit')) {
      return 'deposit_paid';
    }

    return 'pending';
  };

  const paymentStatus = getPaymentStatus();

  return (
    <div className="h-full flex flex-col print:bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between print:border-none">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {order.order_number}
          </h2>
          <p className="text-sm text-gray-600">
            {order.customers.full_name}
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrintOrder}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 print:hidden">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Customer Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{order.customers.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Phone:</span>
              <span className="font-medium">{order.customers.phone_number}</span>
            </div>
            {order.customers.email && (
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{order.customers.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Information</h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-medium">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Date:</span>
              <span className="font-medium">
                {new Date(order.order_date).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Type:</span>
              <span className="font-medium capitalize">{order.order_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Date:</span>
              <span className="font-medium">
                {new Date(order.pickup_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Time:</span>
              <span className="font-medium">{order.pickup_time}</span>
            </div>
            {order.special_instructions && (
              <div>
                <p className="text-gray-600 mb-1">Special Instructions:</p>
                <p className="text-sm bg-white rounded p-2">{order.special_instructions}</p>
              </div>
            )}
          </div>
        </div>

        {/* Custom Cake Details (if applicable) */}
        {order.order_type === 'custom' && order.custom_cake_requests && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Custom Cake Details</h3>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-gray-600">Request:</span>{' '}
                  <span className="font-medium">{order.custom_cake_requests.request_number}</span>
                </p>
                <p className="text-sm">
                  <span className="text-gray-600">Occasion:</span>{' '}
                  <span className="font-medium">{order.custom_cake_requests.occasion}</span>
                </p>
                {order.custom_cake_requests.reference_image_url && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Reference Image:</p>
                    <img
                      src={order.custom_cake_requests.reference_image_url}
                      alt="Reference"
                      className="w-full max-w-sm h-48 object-cover rounded border border-gray-300"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Weight</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Price</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {order.customer_order_items?.map((item) => (
                  <tr key={item.item_id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.weight_option}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="4" className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    {formatCurrency(order.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`px-3 py-1 text-sm font-semibold rounded ${
                  paymentStatus === 'fully_paid' ? 'bg-green-100 text-green-800' :
                  paymentStatus === 'deposit_paid' ? 'bg-blue-100 text-blue-800' :
                  paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {paymentStatus === 'fully_paid' ? 'Fully Paid' :
                   paymentStatus === 'deposit_paid' ? 'Deposit Paid' :
                   paymentStatus === 'pending' ? 'Pending' :
                   'Unpaid'}
                </span>
              </div>

              {order.customer_payments && order.customer_payments.length > 0 && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Payment History:</p>
                  <div className="space-y-2">
                    {order.customer_payments.map((payment) => (
                      <div key={payment.payment_id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {new Date(payment.payment_date).toLocaleDateString()} - {payment.payment_type}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(payment.amount)} ({payment.payment_method})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between font-semibold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(order.total_amount)}</span>
                </div>
                {order.deposit_amount && (
                  <>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600">Deposit ({order.deposit_percentage}%):</span>
                      <span>{formatCurrency(order.deposit_amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Balance:</span>
                      <span>{formatCurrency(order.remaining_balance)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status History Timeline */}
        <div className="mb-6 print:break-before-page">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Status History</h3>
          <div className="space-y-3">
            {statusHistory.map((history, index) => (
              <div key={history.history_id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {index < statusHistory.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {history.new_status.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(history.changed_at).toLocaleString()}
                      </p>
                      {history.users && (
                        <p className="text-sm text-gray-600">
                          By: {history.users.full_name}
                        </p>
                      )}
                      {history.notes && (
                        <p className="text-sm text-gray-700 mt-1 bg-gray-100 rounded p-2">
                          {history.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Notes */}
        <div className="mb-6 print:hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Staff Notes (Internal)</h3>
          
          {/* Add Note Form */}
          <div className="mb-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Add internal staff note..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <button
              onClick={handleAddNote}
              disabled={addingNote || !newNote.trim()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {staffNotes.length === 0 ? (
              <p className="text-sm text-gray-600">No staff notes yet</p>
            ) : (
              staffNotes.map((note) => (
                <div key={note.note_id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-900 mb-2">{note.note_text}</p>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>By: {note.users.full_name}</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 print:hidden">
        {order.status !== 'cancelled' && order.status !== 'completed' && (
          <>
            <button
              onClick={() => setShowStatusUpdate(true)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Status
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Cancel Order
            </button>
          </>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Status Update Modal */}
      {showStatusUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Order Status</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select status...</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_preparation">In Preparation</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={3}
                placeholder="Add any notes about this status change..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowStatusUpdate(false);
                  setNewStatus('');
                  setStatusNote('');
                  setError(null);
                }}
                disabled={updatingStatus}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updatingStatus || !newStatus}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updatingStatus ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Order</h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for cancelling this order. The customer will be notified.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={4}
                placeholder="e.g., Out of stock, customer request, quality issue..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellationReason('');
                  setError(null);
                }}
                disabled={cancelling}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling || !cancellationReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;

