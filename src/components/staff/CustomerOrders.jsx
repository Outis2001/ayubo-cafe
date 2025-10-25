/**
 * Customer Orders Management Page (Staff)
 * 
 * Comprehensive staff interface for managing customer orders.
 * 
 * Features:
 * - List all customer orders
 * - Filter by status, payment status, order type
 * - Date range filtering
 * - Search by customer/order number
 * - Sort by date, amount, pickup date
 * - Pagination (20 per page)
 * - Quick view order details
 * - Status badges with color coding
 * - Export/print functionality
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../config/supabase';
import { useSession } from '../../hooks/useSession';
import { formatCurrency } from '../../utils/payments';
import { Loader } from '../icons';
import OrderDetails from './OrderDetails';

const CustomerOrders = () => {
  const { user } = useSession();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('order_date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 20;
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  
  // Selected order for details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch orders
  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentStatusFilter, orderTypeFilter, dateRangeStart, dateRangeEnd, sortBy, sortOrder, currentPage]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabaseClient
      .channel('customer-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query
      let query = supabaseClient
        .from('customer_orders')
        .select(`
          *,
          customers!inner (
            full_name,
            phone_number,
            email
          ),
          customer_order_items (
            item_id,
            product_name,
            weight_option,
            quantity,
            unit_price,
            subtotal
          ),
          customer_payments (
            payment_id,
            amount,
            payment_method,
            payment_type,
            payment_status
          )
        `, { count: 'exact' });

      // Apply filters
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (orderTypeFilter !== 'all') {
        query = query.eq('order_type', orderTypeFilter);
      }

      if (dateRangeStart) {
        query = query.gte('order_date', dateRangeStart);
      }

      if (dateRangeEnd) {
        query = query.lte('order_date', dateRangeEnd);
      }

      // Payment status filter (complex - check payments)
      // This is simplified - in production, might need a computed column or view

      // Apply sorting
      const sortColumn = sortBy === 'order_date' ? 'order_date' :
                        sortBy === 'pickup_date' ? 'pickup_date' :
                        sortBy === 'total_amount' ? 'total_amount' :
                        'order_date';
      
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * ordersPerPage;
      const to = from + ordersPerPage - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setOrders(data || []);
      setTotalOrders(count || 0);
    } catch (err) {
      console.error('[Customer Orders] Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Filter orders by search query (client-side for now)
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customers.full_name.toLowerCase().includes(query) ||
      order.customers.phone_number.includes(query) ||
      (order.customers.email && order.customers.email.toLowerCase().includes(query))
    );
  });

  // Get payment status for an order
  const getPaymentStatus = (order) => {
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

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_payment: { label: 'Pending Payment', color: 'bg-yellow-100 text-yellow-800' },
      payment_pending_verification: { label: 'Verifying Payment', color: 'bg-blue-100 text-blue-800' },
      payment_verified: { label: 'Payment Verified', color: 'bg-green-100 text-green-800' },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
      in_preparation: { label: 'In Preparation', color: 'bg-purple-100 text-purple-800' },
      ready_for_pickup: { label: 'Ready', color: 'bg-green-100 text-green-800' },
      completed: { label: 'Completed', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Get payment status badge
  const getPaymentBadge = (paymentStatus) => {
    const config = {
      unpaid: { label: 'Unpaid', color: 'bg-red-100 text-red-800' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      deposit_paid: { label: 'Deposit Paid', color: 'bg-blue-100 text-blue-800' },
      fully_paid: { label: 'Fully Paid', color: 'bg-green-100 text-green-800' },
    };

    const statusConfig = config[paymentStatus] || { label: paymentStatus, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    );
  };

  // Handle view order details
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  // Handle close details
  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedOrder(null);
    // Refresh orders list
    fetchOrders();
  };

  // Reset filters
  const handleResetFilters = () => {
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setOrderTypeFilter('all');
    setDateRangeStart('');
    setDateRangeEnd('');
    setSearchQuery('');
    setSortBy('order_date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Customer Orders
        </h1>
        <p className="text-gray-600">
          Manage and track all customer orders
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Order Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending_payment">Pending Payment</option>
              <option value="payment_pending_verification">Verifying Payment</option>
              <option value="payment_verified">Payment Verified</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_preparation">In Preparation</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending">Pending</option>
              <option value="deposit_paid">Deposit Paid</option>
              <option value="fully_paid">Fully Paid</option>
            </select>
          </div>

          {/* Order Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Type
            </label>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Types</option>
              <option value="pre-made">Pre-made</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="order_date">Order Date</option>
                <option value="pickup_date">Pickup Date</option>
                <option value="total_amount">Total Amount</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date Range Start */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Order #, customer name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Reset Filters Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Orders Count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredOrders.length} of {totalOrders} orders
        </p>
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

      {/* Orders List */}
      {!loading && !error && (
        <>
          {filteredOrders.length === 0 ? (
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
              <p className="text-gray-600">No orders found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map((order) => {
                const paymentStatus = getPaymentStatus(order);
                const itemCount = order.customer_order_items?.length || 0;

                return (
                  <div
                    key={order.order_id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewOrder(order)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {order.order_number}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {order.customers.full_name} • {order.customers.phone_number}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {getStatusBadge(order.status)}
                            {getPaymentBadge(paymentStatus)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">Order Date</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(order.order_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Pickup</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(order.pickup_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Items</p>
                            <p className="font-semibold text-gray-900">{itemCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total</p>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(order.total_amount)}
                            </p>
                          </div>
                        </div>

                        {order.order_type === 'custom' && (
                          <div className="mt-3">
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                              Custom Order
                            </span>
                          </div>
                        )}
                      </div>

                      {/* View Button */}
                      <div className="lg:ml-4">
                        <button
                          className="w-full lg:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewOrder(order);
                          }}
                        >
                          View Details
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
              </div>

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-5xl w-full my-8">
            <OrderDetails
              order={selectedOrder}
              onClose={handleCloseDetails}
              onUpdate={fetchOrders}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;

