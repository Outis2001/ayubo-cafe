/**
 * Order History Component (Customer)
 * 
 * Displays all orders for the logged-in customer with filtering and search.
 * 
 * Features:
 * - List all customer orders
 * - Filter by order status
 * - Search by order number or items
 * - Sort by date (newest first)
 * - View order details
 * - Quick actions (track, pay balance, reorder)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { getCustomerOrders } from '../../utils/customerOrders';
import { Loader } from '../icons';

const OrderHistory = () => {
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (customer) {
      fetchOrders();
    }
  }, [customer]);

  useEffect(() => {
    applyFilters();
  }, [orders, statusFilter, searchQuery]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCustomerOrders(customer.customer_id);

      if (result.success) {
        setOrders(result.orders);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Order History] Error fetching orders:', err);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.order_status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => {
        return (
          order.order_number?.toLowerCase().includes(query) ||
          order.order_type?.toLowerCase().includes(query) ||
          order.items?.some(item => item.product_name?.toLowerCase().includes(query))
        );
      });
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_preparation':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ready_for_pickup':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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

  const formatStatus = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Please log in to view your order history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Order History
        </h1>
        <p className="text-gray-600">
          View and track all your orders
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_preparation">In Preparation</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Orders
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number or items..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* Orders List */}
      {!loading && (
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
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <p className="text-gray-600 mb-1">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No orders found matching your filters'
                  : 'No orders yet'
                }
              </p>
              <p className="text-gray-500 text-sm">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start browsing our menu to place your first order'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="mb-4 text-sm text-gray-600">
                Showing {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
              </div>

              {/* Orders Grid */}
              <div className="grid gap-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.order_id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                      <div className="mb-4 sm:mb-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {order.order_number}
                          </h3>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(order.order_status)}`}>
                            {formatStatus(order.order_status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Ordered: {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          Pickup: {new Date(order.pickup_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })} at {order.pickup_time}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          Rs. {order.order_total?.toLocaleString() || '0'}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded ${getPaymentStatusColor(order.payment_status)}`}>
                          {formatStatus(order.payment_status)}
                        </span>
                      </div>
                    </div>

                    {/* Order Type */}
                    <div className="mb-3">
                      <span className="text-sm text-gray-600">
                        Type: <span className="font-medium text-gray-900">{formatStatus(order.order_type)}</span>
                      </span>
                    </div>

                    {/* Order Items Summary */}
                    {order.items && order.items.length > 0 && (
                      <div className="mb-4 text-sm text-gray-600">
                        <span className="font-medium">Items: </span>
                        {order.items.slice(0, 3).map((item, index) => (
                          <span key={index}>
                            {item.product_name} x{item.quantity}
                            {index < Math.min(order.items.length - 1, 2) && ', '}
                          </span>
                        ))}
                        {order.items.length > 3 && ` and ${order.items.length - 3} more`}
                      </div>
                    )}

                    {/* Payment Info */}
                    {order.payment_status === 'partial' && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          Balance Due: <span className="font-semibold">Rs. {order.balance_due?.toLocaleString()}</span>
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/customer/orders/${order.order_id}`)}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Details
                      </button>

                      {order.payment_status === 'partial' && order.order_status === 'confirmed' && (
                        <button
                          onClick={() => navigate(`/customer/orders/${order.order_id}/payment`)}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Pay Balance
                        </button>
                      )}

                      {order.order_status === 'completed' && (
                        <button
                          onClick={() => {
                            // TODO: Implement reorder functionality
                            alert('Reorder functionality coming soon!');
                          }}
                          className="flex-1 sm:flex-initial px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          Reorder
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default OrderHistory;

