/**
 * Payment Verification Component (Staff)
 * 
 * Allows staff to review and verify bank transfer payments.
 * 
 * Features:
 * - Display pending payment verifications
 * - View receipt images
 * - Approve or reject payments
 * - Record verification notes
 * - Filter by status
 * - Search by order number or customer
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../config/supabase';
import { useSession } from '../../hooks/useSession';
import {
  verifyBankTransferPayment,
  rejectBankTransferPayment,
  formatCurrency,
  getPaymentStatusColor,
  PAYMENT_STATUS,
} from '../../utils/payments';
import { Loader } from '../icons';

const PaymentVerification = () => {
  const { user } = useSession();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending_verification');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null); // 'approve' or 'reject'
  const [verificationNotes, setVerificationNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  // Real-time subscription for new payments
  useEffect(() => {
    const channel = supabaseClient
      .channel('payment-verification')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_payments',
          filter: 'payment_method=eq.bank_transfer',
        },
        () => {
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabaseClient
        .from('customer_payments')
        .select(`
          *,
          customer_orders!inner (
            order_number,
            order_type,
            total_amount,
            pickup_date,
            pickup_time,
            customers!inner (
              full_name,
              phone_number
            )
          )
        `)
        .eq('payment_method', 'bank_transfer')
        .order('payment_date', { ascending: false });

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setPayments(data || []);
    } catch (err) {
      console.error('[Payment Verification] Error fetching payments:', err);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (payment, type) => {
    setSelectedPayment(payment);
    setModalType(type);
    setVerificationNotes('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPayment(null);
    setModalType(null);
    setVerificationNotes('');
  };

  const handleApprove = async () => {
    if (!selectedPayment) return;

    setProcessing(true);
    try {
      await verifyBankTransferPayment(
        selectedPayment.payment_id,
        user.user_id,
        verificationNotes || null
      );

      // Refresh list
      await fetchPayments();

      handleCloseModal();
    } catch (err) {
      console.error('[Payment Verification] Error approving payment:', err);
      alert('Failed to approve payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !verificationNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      await rejectBankTransferPayment(
        selectedPayment.payment_id,
        user.user_id,
        verificationNotes
      );

      // Refresh list
      await fetchPayments();

      handleCloseModal();
    } catch (err) {
      console.error('[Payment Verification] Error rejecting payment:', err);
      alert('Failed to reject payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Filter payments by search query
  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      payment.customer_orders.order_number.toLowerCase().includes(query) ||
      payment.customer_orders.customers.full_name.toLowerCase().includes(query) ||
      payment.customer_orders.customers.phone_number.includes(query) ||
      (payment.transaction_reference && payment.transaction_reference.toLowerCase().includes(query))
    );
  });

  const getStatusBadge = (status) => {
    const colorClass = getPaymentStatusColor(status);
    const label = status.replace('_', ' ').toUpperCase();
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${colorClass}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Payment Verification
        </h1>
        <p className="text-gray-600">
          Review and verify bank transfer payments
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Status Filter */}
        <div className="flex-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending_verification">Pending Verification</option>
            <option value="success">Verified</option>
            <option value="failed">Rejected</option>
            <option value="all">All Statuses</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by order #, customer name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Payments List */}
      {!loading && !error && (
        <>
          {filteredPayments.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-600">No payments to display</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.payment_id}
                  className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Payment Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Order #{payment.customer_orders.order_number}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {payment.customer_orders.customers.full_name} •{' '}
                            {payment.customer_orders.customers.phone_number}
                          </p>
                        </div>
                        {getStatusBadge(payment.payment_status)}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Amount</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Type</p>
                          <p className="font-semibold text-gray-900 capitalize">
                            {payment.payment_type}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Date</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Pickup</p>
                          <p className="font-semibold text-gray-900">
                            {new Date(payment.customer_orders.pickup_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {payment.transaction_reference && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-600">
                            Ref: {payment.transaction_reference}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2">
                      {payment.payment_status === PAYMENT_STATUS.PENDING_VERIFICATION && (
                        <>
                          <button
                            onClick={() => handleOpenModal(payment, 'approve')}
                            className="flex-1 lg:flex-initial px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenModal(payment, 'reject')}
                            className="flex-1 lg:flex-initial px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleOpenModal(payment, 'view')}
                        className="flex-1 lg:flex-initial px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                      >
                        View Receipt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalType === 'approve' && 'Approve Payment'}
                {modalType === 'reject' && 'Reject Payment'}
                {modalType === 'view' && 'View Receipt'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Payment Details */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Payment Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order:</span>
                    <span className="font-medium">{selectedPayment.customer_orders.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{selectedPayment.customer_orders.customers.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-lg">{formatCurrency(selectedPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{selectedPayment.payment_type}</span>
                  </div>
                  {selectedPayment.transaction_reference && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-medium">{selectedPayment.transaction_reference}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receipt Image */}
              {selectedPayment.receipt_image_url && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Receipt Image</h4>
                  <img
                    src={selectedPayment.receipt_image_url}
                    alt="Payment receipt"
                    className="w-full border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              {/* Verification Notes (for approve/reject) */}
              {(modalType === 'approve' || modalType === 'reject') && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {modalType === 'reject' ? 'Rejection Reason (Required)' : 'Notes (Optional)'}
                  </label>
                  <textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={4}
                    placeholder={modalType === 'reject' ? 'e.g., Incorrect amount, unclear receipt...' : 'Add any notes about this verification...'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}

              {/* Existing Verification Notes (for view mode) */}
              {modalType === 'view' && selectedPayment.verification_notes && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Verification Notes</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-4">
                    {selectedPayment.verification_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex gap-3">
              <button
                onClick={handleCloseModal}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {modalType === 'view' ? 'Close' : 'Cancel'}
              </button>
              {modalType === 'approve' && (
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    'Approve Payment'
                  )}
                </button>
              )}
              {modalType === 'reject' && (
                <button
                  onClick={handleReject}
                  disabled={processing || !verificationNotes.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    'Reject Payment'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentVerification;

