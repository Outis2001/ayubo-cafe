/**
 * Order Holds Management Component (Staff - Owner Only)
 * 
 * Allows owners to manage blocked dates when orders cannot be accepted.
 * 
 * Features:
 * - View all active and inactive holds
 * - Calendar view of holds
 * - Create new holds with date and reason
 * - Deactivate holds
 * - Delete holds
 * - Role restriction (owner only)
 * - Audit logging
 */

import { useState, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import {
  getAllOrderHolds,
  createOrderHold,
  deactivateOrderHold,
  deleteOrderHold,
} from '../../utils/orderHolds';
import { logAuditEvent } from '../../utils/auditLog';
import { Loader } from '../icons';

const OrderHoldsManagement = () => {
  const { user } = useSession();

  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Create hold form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [holdDate, setHoldDate] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Delete/deactivate modals
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedHold, setSelectedHold] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Filter
  const [showInactive, setShowInactive] = useState(false);

  // Check if user is owner
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (isOwner) {
      fetchHolds();
    }
  }, [isOwner]);

  const fetchHolds = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAllOrderHolds();
      
      if (result.success) {
        setHolds(result.holds);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Order Holds Management] Error fetching holds:', err);
      setError('Failed to load order holds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHold = async (e) => {
    e.preventDefault();

    if (!holdDate || !holdReason.trim()) {
      setError('Please provide both date and reason');
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(holdDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setError('Cannot create hold for past dates');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await createOrderHold(holdDate, holdReason, user.user_id);

      if (result.success) {
        console.log('[Order Holds Management] Hold created successfully');

        // Log audit event
        await logAuditEvent({
          action: 'order_hold_created',
          target_type: 'order_hold',
          target_id: result.hold.hold_id,
          details: {
            hold_date: holdDate,
            reason: holdReason,
          },
          status: 'success',
        });

        // Reset form
        setHoldDate('');
        setHoldReason('');
        setShowCreateForm(false);

        // Refresh holds
        await fetchHolds();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Order Holds Management] Error creating hold:', err);
      setError('Failed to create order hold');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivateHold = async () => {
    if (!selectedHold) return;

    setProcessing(true);
    setError(null);

    try {
      const result = await deactivateOrderHold(selectedHold.hold_id);

      if (result.success) {
        console.log('[Order Holds Management] Hold deactivated successfully');

        // Log audit event
        await logAuditEvent({
          action: 'order_hold_deactivated',
          target_type: 'order_hold',
          target_id: selectedHold.hold_id,
          details: {
            hold_date: selectedHold.hold_date,
            reason: selectedHold.reason,
          },
          status: 'success',
        });

        // Close modal
        setShowDeactivateModal(false);
        setSelectedHold(null);

        // Refresh holds
        await fetchHolds();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Order Holds Management] Error deactivating hold:', err);
      setError('Failed to deactivate order hold');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteHold = async () => {
    if (!selectedHold) return;

    setProcessing(true);
    setError(null);

    try {
      const result = await deleteOrderHold(selectedHold.hold_id);

      if (result.success) {
        console.log('[Order Holds Management] Hold deleted successfully');

        // Log audit event
        await logAuditEvent({
          action: 'order_hold_deleted',
          target_type: 'order_hold',
          target_id: selectedHold.hold_id,
          details: {
            hold_date: selectedHold.hold_date,
            reason: selectedHold.reason,
          },
          status: 'success',
        });

        // Close modal
        setShowDeleteModal(false);
        setSelectedHold(null);

        // Refresh holds
        await fetchHolds();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Order Holds Management] Error deleting hold:', err);
      setError('Failed to delete order hold');
    } finally {
      setProcessing(false);
    }
  };

  // Filter holds
  const filteredHolds = holds.filter(hold => {
    if (showInactive) {
      return true;
    }
    return hold.is_active;
  });

  // Group holds by month
  const groupedHolds = filteredHolds.reduce((acc, hold) => {
    const date = new Date(hold.hold_date);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(hold);
    
    return acc;
  }, {});

  // Access control
  if (!isOwner) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg
            className="w-16 h-16 text-red-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">
            Only the owner can manage order holds. Please contact the owner if you need to block dates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Order Holds Management
        </h1>
        <p className="text-gray-600">
          Block specific dates when orders cannot be accepted
        </p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Show inactive holds</span>
          </label>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Hold
        </button>
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

      {/* Holds List */}
      {!loading && (
        <>
          {filteredHolds.length === 0 ? (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-600">No order holds found</p>
              <p className="text-gray-500 text-sm mt-1">
                Create a hold to block dates when orders cannot be accepted
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedHolds).map(([monthYear, monthHolds]) => (
                <div key={monthYear}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {monthYear}
                  </h3>
                  <div className="grid gap-4">
                    {monthHolds.map((hold) => (
                      <div
                        key={hold.hold_id}
                        className={`bg-white border rounded-lg p-6 ${
                          hold.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-lg font-semibold text-gray-900">
                                {new Date(hold.hold_date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                              {hold.is_active ? (
                                <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600">{hold.reason}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Created: {new Date(hold.created_at).toLocaleString()}
                            </p>
                          </div>

                          {/* Actions */}
                          {hold.is_active && (
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => {
                                  setSelectedHold(hold);
                                  setShowDeactivateModal(true);
                                }}
                                className="px-3 py-2 text-sm border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors"
                              >
                                Deactivate
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedHold(hold);
                                  setShowDeleteModal(true);
                                }}
                                className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Hold Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create Order Hold
            </h3>

            <form onSubmit={handleCreateHold}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date to Block
                </label>
                <input
                  type="date"
                  value={holdDate}
                  onChange={(e) => setHoldDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  rows={3}
                  placeholder="e.g., Fully Booked, Holiday, Maintenance"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setHoldDate('');
                    setHoldReason('');
                    setError(null);
                  }}
                  disabled={creating}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && selectedHold && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Deactivate Order Hold
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to deactivate this hold? This will allow orders to be placed on this date.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium text-gray-900">
                {new Date(selectedHold.hold_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1">{selectedHold.reason}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeactivateModal(false);
                  setSelectedHold(null);
                  setError(null);
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivateHold}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedHold && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Delete Order Hold
            </h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to permanently delete this hold? This action cannot be undone.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="font-medium text-gray-900">
                {new Date(selectedHold.hold_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600 mt-1">{selectedHold.reason}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedHold(null);
                  setError(null);
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteHold}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHoldsManagement;

