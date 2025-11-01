/**
 * useReturns Hook
 * Custom React hook for managing returns history
 * Provides state management for fetching and displaying returns log
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '../config/supabase';
import { fetchReturnsByDateRange, fetchReturnDetails } from '../utils/returns';

/**
 * Custom hook for returns history management
 * @returns {Object} Returns state and methods
 */
export const useReturns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReturn, setSelectedReturn] = useState(null);

  /**
   * Fetch returns by date range
   */
  const fetchReturns = useCallback(async (startDate, endDate) => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchReturnsByDateRange(supabaseClient, startDate, endDate);
      setReturns(data);
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError(err.message);
      return { data: [], error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch return details with items
   */
  const fetchReturn = useCallback(async (returnId) => {
    try {
      setLoading(true);
      setError(null);

      const { return: returnRecord, items } = await fetchReturnDetails(supabaseClient, returnId);
      setSelectedReturn({ return: returnRecord, items });
      return { return: returnRecord, items, error: null };
    } catch (err) {
      console.error('Error fetching return details:', err);
      setError(err.message);
      return { return: null, items: [], error: err };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get returns grouped by date
   */
  const getReturnsGroupedByDate = useCallback(() => {
    const grouped = {};
    
    returns.forEach(ret => {
      const dateStr = ret.return_date;
      if (!grouped[dateStr]) {
        grouped[dateStr] = {
          date: dateStr,
          returns: [],
          totalValue: 0,
          totalQuantity: 0,
          totalBatches: 0
        };
      }
      grouped[dateStr].returns.push(ret);
      grouped[dateStr].totalValue += parseFloat(ret.total_value);
      grouped[dateStr].totalQuantity += parseFloat(ret.total_quantity);
      grouped[dateStr].totalBatches += ret.total_batches;
    });

    return Object.values(grouped).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  }, [returns]);

  /**
   * Calculate analytics
   */
  const calculateAnalytics = useCallback(() => {
    if (returns.length === 0) {
      return {
        totalReturnValue: 0,
        averageReturnValue: 0,
        totalReturns: 0,
        productBreakdown: {},
        averageAge: 0
      };
    }

    const totalReturnValue = returns.reduce((sum, ret) => sum + parseFloat(ret.total_value), 0);
    const averageReturnValue = totalReturnValue / returns.length;
    const productBreakdown = {};
    let totalAge = 0;
    let ageCount = 0;

    returns.forEach(ret => {
      // This will be enhanced when we load full details
      // For now, just aggregate top-level data
    });

    return {
      totalReturnValue,
      averageReturnValue,
      totalReturns: returns.length,
      productBreakdown,
      averageAge: ageCount > 0 ? totalAge / ageCount : 0
    };
  }, [returns]);

  return {
    // State
    returns,
    loading,
    error,
    selectedReturn,
    
    // Methods
    fetchReturns,
    fetchReturn,
    getReturnsGroupedByDate,
    calculateAnalytics
  };
};

export default useReturns;

