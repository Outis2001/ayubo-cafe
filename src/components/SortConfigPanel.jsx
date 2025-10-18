/**
 * SortConfigPanel Component
 * 
 * Configuration panel for owners to adjust the product sort window (N value).
 * Allows setting N=-1 (all-time sales) or N>0 (last N orders).
 * 
 * @component
 */

import { useState } from 'react';

/**
 * SortConfigPanel - UI for configuring product sort window
 * 
 * @param {Object} props
 * @param {number} props.currentN - Current N value from database
 * @param {Function} props.onSave - Callback when save is clicked: (newN) => Promise<boolean>
 * @param {boolean} props.loading - Whether data is being loaded/saved
 * @returns {JSX.Element}
 */
const SortConfigPanel = ({ currentN, onSave, loading = false }) => {
  const [nValue, setNValue] = useState(currentN);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ show: false, type: '', message: '' });

  // Update local state when prop changes
  useState(() => {
    setNValue(currentN);
  }, [currentN]);

  /**
   * Validates N value input
   * Must be -1 or a positive integer
   */
  const validateNValue = (value) => {
    const num = parseInt(value);
    
    if (isNaN(num)) {
      return { valid: false, message: 'Please enter a valid number' };
    }
    
    if (num < -1) {
      return { valid: false, message: 'Value must be -1 or greater' };
    }
    
    if (num === 0) {
      return { valid: false, message: 'Value cannot be 0. Use -1 for all-time or a positive number' };
    }
    
    return { valid: true, message: '' };
  };

  /**
   * Handles save button click
   */
  const handleSave = async () => {
    // Validate input
    const validation = validateNValue(nValue);
    if (!validation.valid) {
      setFeedback({
        show: true,
        type: 'error',
        message: validation.message
      });
      return;
    }

    // Check if value actually changed
    if (parseInt(nValue) === currentN) {
      setFeedback({
        show: true,
        type: 'info',
        message: 'No changes to save'
      });
      return;
    }

    // Save configuration
    setSaving(true);
    setFeedback({ show: false, type: '', message: '' });

    try {
      const success = await onSave(parseInt(nValue));
      
      if (success) {
        setFeedback({
          show: true,
          type: 'success',
          message: '✅ Configuration saved! Products will resort automatically.'
        });
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setFeedback({ show: false, type: '', message: '' });
        }, 3000);
      } else {
        setFeedback({
          show: true,
          type: 'error',
          message: '❌ Failed to save configuration. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error saving sort config:', error);
      setFeedback({
        show: true,
        type: 'error',
        message: '❌ Error saving configuration. Please check your connection.'
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handles input change
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNValue(value);
    
    // Clear feedback when user starts typing
    if (feedback.show) {
      setFeedback({ show: false, type: '', message: '' });
    }
  };

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
      <h3 className="text-base sm:text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
        <span>🔄</span>
        <span>Product Sort Configuration</span>
      </h3>
      
      <div className="bg-white p-3 sm:p-4 rounded-lg border border-blue-200">
        {/* Input Section */}
        <div className="mb-3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Sort Window (N Value)
          </label>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="number"
              value={nValue}
              onChange={handleInputChange}
              disabled={loading || saving}
              placeholder="-1 for all-time"
              className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
            
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-xs sm:text-sm">
          <p className="font-semibold text-blue-900 mb-1">ℹ️ How it works:</p>
          <ul className="text-blue-800 space-y-1 ml-4 list-disc">
            <li>
              <strong>N = -1:</strong> Sort by all-time sales (default)
            </li>
            <li>
              <strong>N = 10:</strong> Sort by sales from last 10 orders only
            </li>
            <li>
              Higher N values consider more historical data
            </li>
            <li>
              Lower N values (e.g., 5) focus on recent trends
            </li>
          </ul>
        </div>

        {/* Feedback Messages */}
        {feedback.show && (
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              feedback.type === 'success'
                ? 'bg-green-100 border-2 border-green-300 text-green-800'
                : feedback.type === 'error'
                ? 'bg-red-100 border-2 border-red-300 text-red-800'
                : 'bg-yellow-100 border-2 border-yellow-300 text-yellow-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Current Configuration Display */}
        <div className="mt-3 pt-3 border-t border-blue-200">
          <p className="text-xs text-gray-600">
            <strong>Current:</strong> {currentN === -1 ? 'All-time sales' : `Last ${currentN} orders`}
            {loading && <span className="ml-2 text-blue-600 animate-pulse">(Loading...)</span>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SortConfigPanel;

