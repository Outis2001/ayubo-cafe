/**
 * Pickup Time Slots Management Component (Staff - Owner Only)
 * 
 * Allows owners to configure available pickup time slots for customer orders.
 * 
 * Features:
 * - View current time slots
 * - Add new time slots
 * - Remove time slots
 * - Enable/disable time slots
 * - Validate for overlaps
 * - Role restriction (owner only)
 * - Audit logging
 */

import { useState, useEffect } from 'react';
import { useSession } from '../../hooks/useSession';
import {
  getPickupTimeSlots,
  savePickupTimeSlots,
  formatTimeRange,
  validateTimeSlots,
} from '../../utils/pickupTimeSlots';
import { logAuditEvent } from '../../utils/auditLog';
import { Loader } from '../icons';

const PickupTimeSlots = () => {
  const { user } = useSession();

  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Add slot form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newLabel, setNewLabel] = useState('');

  // Check if user is owner
  const isOwner = user?.role === 'owner';

  useEffect(() => {
    if (isOwner) {
      fetchTimeSlots();
    }
  }, [isOwner]);

  const fetchTimeSlots = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getPickupTimeSlots();

      if (result.success) {
        setTimeSlots(result.timeSlots);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Pickup Time Slots] Error fetching slots:', err);
      setError('Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlot = (e) => {
    e.preventDefault();

    if (!newStartTime || !newEndTime) {
      setError('Please provide both start and end times');
      return;
    }

    // Create new slot
    const newSlot = {
      id: Date.now().toString(),
      startTime: newStartTime,
      endTime: newEndTime,
      label: newLabel.trim() || formatTimeRange(newStartTime, newEndTime),
      enabled: true,
    };

    // Add to time slots
    const updatedSlots = [...timeSlots, newSlot];

    // Validate
    const validation = validateTimeSlots(updatedSlots);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setTimeSlots(updatedSlots);
    setHasChanges(true);

    // Reset form
    setNewStartTime('');
    setNewEndTime('');
    setNewLabel('');
    setShowAddForm(false);
    setError(null);
  };

  const handleRemoveSlot = (slotId) => {
    const updatedSlots = timeSlots.filter(slot => slot.id !== slotId);
    
    if (updatedSlots.length === 0) {
      setError('At least one time slot is required');
      return;
    }

    setTimeSlots(updatedSlots);
    setHasChanges(true);
    setError(null);
  };

  const handleToggleSlot = (slotId) => {
    const updatedSlots = timeSlots.map(slot =>
      slot.id === slotId ? { ...slot, enabled: !slot.enabled } : slot
    );

    // Check if at least one slot is enabled
    const hasEnabled = updatedSlots.some(slot => slot.enabled);
    if (!hasEnabled) {
      setError('At least one time slot must be enabled');
      return;
    }

    setTimeSlots(updatedSlots);
    setHasChanges(true);
    setError(null);
  };

  const handleSave = async () => {
    // Validate
    const validation = validateTimeSlots(timeSlots);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await savePickupTimeSlots(timeSlots);

      if (result.success) {
        console.log('[Pickup Time Slots] Saved successfully');

        // Log audit event
        await logAuditEvent({
          action: 'pickup_timeslots_updated',
          target_type: 'system_configuration',
          target_id: 'pickup_time_slots',
          details: {
            time_slots: timeSlots,
          },
          status: 'success',
        });

        setHasChanges(false);

        // Show success message
        const successMsg = result.message || 'Time slots saved successfully';
        setError(null);
        
        // Optionally show success toast (you might want to add a toast system)
        alert(successMsg);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Pickup Time Slots] Error saving:', err);
      setError('Failed to save time slots');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    fetchTimeSlots();
    setHasChanges(false);
    setError(null);
  };

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
            Only the owner can manage pickup time slots.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Pickup Time Slots Configuration
        </h1>
        <p className="text-gray-600">
          Configure available time slots for customer order pickup
        </p>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            You have unsaved changes. Click "Save Changes" to apply your updates.
          </p>
        </div>
      )}

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

      {/* Time Slots List */}
      {!loading && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Current Time Slots</h3>
            </div>

            <div className="p-6">
              {timeSlots.length === 0 ? (
                <p className="text-gray-600 text-center py-4">
                  No time slots configured. Add at least one time slot.
                </p>
              ) : (
                <div className="space-y-3">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-4 border-2 rounded-lg transition-colors ${
                        slot.enabled
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold text-gray-900">
                            {slot.label || formatTimeRange(slot.startTime, slot.endTime)}
                          </p>
                          {slot.enabled ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                              Enabled
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {slot.startTime} - {slot.endTime}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSlot(slot.id)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            slot.enabled
                              ? 'border border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                              : 'border border-green-300 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {slot.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="px-3 py-2 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Slot Button */}
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Time Slot
                </button>
              )}

              {/* Add Slot Form */}
              {showAddForm && (
                <form onSubmit={handleAddSlot} className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Add New Time Slot</h4>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g., Morning, Afternoon, Evening"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewStartTime('');
                        setNewEndTime('');
                        setNewLabel('');
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Slot
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset Changes
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving || timeSlots.length === 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Important Notes:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Time slots must not overlap</li>
              <li>At least one time slot must be enabled</li>
              <li>Customers will see these time slots when placing orders</li>
              <li>Disabled slots are hidden from customers but can be re-enabled</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default PickupTimeSlots;

