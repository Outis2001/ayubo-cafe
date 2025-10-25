/**
 * Custom Requests Management Page (Staff)
 * 
 * Staff-facing page for viewing and managing custom cake requests.
 * Accessible by owner and cashier roles.
 * 
 * Features:
 * - Display all custom requests
 * - Filter by status (pending, quoted, approved, rejected)
 * - Sort by delivery date and creation date
 * - Search by customer name/phone
 * - Highlight urgent requests (within 3 days)
 * - View request details
 * - Send quotes (owner only)
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import { Loader } from '../icons';
import { formatCurrency } from '../../utils/helpers';

const CustomRequestsPage = ({ onViewRequest, onSendQuote }) => {
  const { currentUser } = useAuth();

  // State
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('pickup_date');
  const [searchTerm, setSearchTerm] = useState('');

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    quoted: 0,
    approved: 0,
    rejected: 0,
    urgent: 0,
  });

  // Fetch custom requests
  useEffect(() => {
    fetchCustomRequests();
  }, []);

  // Apply filters whenever they change
  useEffect(() => {
    applyFilters();
  }, [requests, statusFilter, sortBy, searchTerm]);

  const fetchCustomRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabaseClient
        .from('custom_cake_requests')
        .select(`
          *,
          customer:customers(
            customer_id,
            name,
            phone_number,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRequests(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('[Custom Requests] Error fetching requests:', err);
      setError('Failed to load custom requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const now = new Date();
    const urgentThreshold = new Date();
    urgentThreshold.setDate(urgentThreshold.getDate() + 3);

    const newStats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending_review').length,
      quoted: data.filter(r => r.status === 'quoted').length,
      approved: data.filter(r => r.status === 'approved').length,
      rejected: data.filter(r => r.status === 'rejected').length,
      urgent: data.filter(r => {
        const pickupDate = new Date(r.pickup_date);
        return pickupDate >= now && pickupDate <= urgentThreshold && 
               ['pending_review', 'quoted'].includes(r.status);
      }).length,
    };

    setStats(newStats);
  };

  const applyFilters = () => {
    let filtered = [...requests];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r => {
        const customerName = r.customer?.name?.toLowerCase() || '';
        const customerPhone = r.customer?.phone_number?.toLowerCase() || '';
        const requestNumber = r.request_number?.toLowerCase() || '';
        const occasion = r.occasion?.toLowerCase() || '';

        return customerName.includes(search) ||
               customerPhone.includes(search) ||
               requestNumber.includes(search) ||
               occasion.includes(search);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'pickup_date') {
        return new Date(a.pickup_date) - new Date(b.pickup_date);
      } else if (sortBy === 'pickup_date_desc') {
        return new Date(b.pickup_date) - new Date(a.pickup_date);
      } else if (sortBy === 'created_at') {
        return new Date(a.created_at) - new Date(b.created_at);
      } else if (sortBy === 'created_at_desc') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
    });

    setFilteredRequests(filtered);
  };

  // Check if request is urgent (pickup within 3 days)
  const isUrgent = (pickupDate, status) => {
    if (!['pending_review', 'quoted'].includes(status)) return false;

    const now = new Date();
    const pickup = new Date(pickupDate);
    const urgentThreshold = new Date();
    urgentThreshold.setDate(urgentThreshold.getDate() + 3);

    return pickup >= now && pickup <= urgentThreshold;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'quoted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get status display name
  const getStatusDisplayName = (status) => {
    switch (status) {
      case 'pending_review':
        return 'Pending Review';
      case 'quoted':
        return 'Quoted';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Custom Cake Requests
        </h1>
        <p className="text-gray-600">
          Manage custom cake requests from customers
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Quoted</p>
          <p className="text-2xl font-bold text-blue-600">{stats.quoted}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
          <p className="text-sm text-red-600 mb-1">Urgent</p>
          <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="quoted">Quoted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pickup_date">Pickup Date (Earliest)</option>
              <option value="pickup_date_desc">Pickup Date (Latest)</option>
              <option value="created_at">Created (Oldest)</option>
              <option value="created_at_desc">Created (Newest)</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Customer name, phone, or request #"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No custom requests found</p>
          <p className="text-gray-400 text-sm mt-2">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Custom requests will appear here when customers submit them'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.request_id}
              className={`bg-white rounded-lg shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow ${
                isUrgent(request.pickup_date, request.status)
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              {/* Urgent Badge */}
              {isUrgent(request.pickup_date, request.status) && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-300">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    URGENT - Pickup within 3 days
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Request Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    {/* Reference Image Thumbnail */}
                    {request.reference_image_url && (
                      <img
                        src={request.reference_image_url}
                        alt="Reference"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                      />
                    )}

                    <div className="flex-1">
                      {/* Request Number and Status */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.request_number}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {getStatusDisplayName(request.status)}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <p>
                          <span className="font-medium">Customer:</span>{' '}
                          {request.customer?.name || 'N/A'}
                        </p>
                        <p>
                          <span className="font-medium">Phone:</span>{' '}
                          {request.customer?.phone_number || 'N/A'}
                        </p>
                        <p>
                          <span className="font-medium">Occasion:</span>{' '}
                          {request.occasion}
                        </p>
                      </div>

                      {/* Pickup Details */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center text-gray-700">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="font-medium">
                            {formatDate(request.pickup_date)} at {request.pickup_time}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>Created {formatTimeAgo(request.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex sm:flex-col gap-2">
                  <button
                    onClick={() => onViewRequest && onViewRequest(request)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
                  {request.status === 'pending_review' && currentUser?.role === 'owner' && (
                    <button
                      onClick={() => onSendQuote && onSendQuote(request)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Send Quote
                    </button>
                  )}
                </div>
              </div>

              {/* Additional Notes (if any) */}
              {request.additional_notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Notes:</span>{' '}
                    {request.additional_notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchCustomRequests}
          disabled={loading}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
};

export default CustomRequestsPage;

