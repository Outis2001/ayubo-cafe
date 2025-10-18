/**
 * useSortConfig Hook
 * 
 * Custom React hook for managing product sort configuration (N value).
 * Fetches configuration from database on mount and provides update functionality.
 * 
 * @module hooks/useSortConfig
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import { fetchSortConfig, updateSortConfig } from '../utils/productSorting';

/**
 * Custom hook for managing sort configuration state
 * 
 * Handles:
 * - Fetching N value from database on mount
 * - Managing loading and error states
 * - Providing update function with error handling
 * 
 * @returns {Object} Sort configuration state and functions
 * @returns {number} sortN - Current N value (-1 for all-time, or positive integer)
 * @returns {Function} updateSortN - Function to update N value: (newN) => Promise<boolean>
 * @returns {boolean} loading - Whether configuration is being loaded or saved
 * @returns {string|null} error - Error message if fetch/save failed, null otherwise
 * 
 * @example
 * function MyComponent() {
 *   const { sortN, updateSortN, loading, error } = useSortConfig();
 *   
 *   const handleSave = async (newN) => {
 *     const success = await updateSortN(newN);
 *     if (success) {
 *       console.log('Configuration saved!');
 *     }
 *   };
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   
 *   return <div>Current N: {sortN}</div>;
 * }
 */
const useSortConfig = () => {
  const [sortN, setSortN] = useState(-1); // Default: all-time sales
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetches sort configuration from database on component mount
   */
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const nValue = await fetchSortConfig(supabaseClient);
        setSortN(nValue);
        
        console.log('✅ Sort config loaded:', nValue);
      } catch (err) {
        console.error('❌ Error loading sort config:', err);
        setError('Failed to load configuration');
        // Keep default value (-1) on error
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []); // Run once on mount

  /**
   * Updates sort configuration in database
   * 
   * @param {number} newN - New N value to save (-1 or positive integer)
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  const updateSortN = async (newN) => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await updateSortConfig(supabaseClient, newN);
      
      if (success) {
        setSortN(newN);
        console.log('✅ Sort config updated:', newN);
        return true;
      } else {
        setError('Failed to save configuration');
        return false;
      }
    } catch (err) {
      console.error('❌ Error updating sort config:', err);
      setError('Error saving configuration');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sortN,
    updateSortN,
    loading,
    error
  };
};

export default useSortConfig;

