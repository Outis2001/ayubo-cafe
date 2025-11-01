/**
 * useBatches Hook
 * Custom React hook for managing inventory batches
 * Provides state management and real-time updates for batch operations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '../config/supabase';
import {
  createBatch as createBatchUtil,
  getBatchesByProduct,
  sortBatchesByAge,
  calculateBatchAge,
  getBatchAgeCategory,
  getTotalStockForProduct,
  deductFromOldestBatches as deductFromOldestBatchesUtil,
  incrementBatchAge as incrementBatchAgeUtil,
  calculateTotalStockByProduct
} from '../utils/batchTracking';

/**
 * Custom hook for batch management
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableRealtime - Enable real-time subscriptions (default: false)
 * @param {number} options.productId - Filter batches by product ID
 * @returns {Object} Batch state and methods
 */
export const useBatches = (options = {}) => {
  const { enableRealtime = false, productId = null } = options;

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockByProduct, setStockByProduct] = useState({});

  /**
   * Fetch all batches or batches for a specific product
   */
  const fetchBatches = useCallback(async (filterProductId = null) => {
    try {
      setLoading(true);
      setError(null);

      const targetProductId = filterProductId || productId;

      let query = supabaseClient
        .from('inventory_batches')
        .select(`
          *,
          products (
            product_id,
            name,
            price,
            original_price,
            sale_price,
            default_return_percentage,
            is_weight_based
          )
        `)
        .gt('quantity', 0);

      // Filter by product if specified
      if (targetProductId) {
        query = query.eq('product_id', targetProductId);
      }

      // Order by date (oldest first for FIFO)
      query = query.order('date_added', { ascending: true });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Add calculated age to each batch
      const batchesWithAge = (data || []).map(batch => ({
        ...batch,
        age: calculateBatchAge(batch.date_added),
        ageCategory: getBatchAgeCategory(calculateBatchAge(batch.date_added))
      }));

      setBatches(batchesWithAge);
      return { data: batchesWithAge, error: null };
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError(err.message);
      return { data: [], error: err };
    } finally {
      setLoading(false);
    }
  }, [productId]);

  /**
   * Fetch total stock by product
   */
  const fetchStockByProduct = useCallback(async () => {
    try {
      const { data, error } = await calculateTotalStockByProduct(supabaseClient);
      if (error) throw error;
      setStockByProduct(data);
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching stock by product:', err);
      return { data: {}, error: err };
    }
  }, []);

  /**
   * Create a new batch
   */
  const createBatch = useCallback(async (productId, quantity, dateAdded = null) => {
    try {
      setLoading(true);
      setError(null);

      const result = await createBatchUtil(supabaseClient, productId, quantity, dateAdded);
      
      if (result.error) throw result.error;

      // Refresh batches after creation
      await fetchBatches();
      await fetchStockByProduct();

      return result;
    } catch (err) {
      console.error('Error creating batch:', err);
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [fetchBatches, fetchStockByProduct]);

  /**
   * Update a batch quantity
   */
  const updateBatch = useCallback(async (batchId, quantity) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: updateError } = await supabaseClient
        .from('inventory_batches')
        .update({ 
          quantity: parseFloat(quantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Refresh batches after update
      await fetchBatches();
      await fetchStockByProduct();

      return { data, error: null };
    } catch (err) {
      console.error('Error updating batch:', err);
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [fetchBatches, fetchStockByProduct]);

  /**
   * Delete a batch
   */
  const deleteBatch = useCallback(async (batchId) => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabaseClient
        .from('inventory_batches')
        .delete()
        .eq('id', batchId);

      if (deleteError) throw deleteError;

      // Refresh batches after deletion
      await fetchBatches();
      await fetchStockByProduct();

      return { error: null };
    } catch (err) {
      console.error('Error deleting batch:', err);
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, [fetchBatches, fetchStockByProduct]);

  /**
   * Deduct quantity from oldest batches (FIFO logic)
   */
  const deductFromOldestBatches = useCallback(async (productId, quantityToDeduct) => {
    try {
      setLoading(true);
      setError(null);

      // Get batches for this product
      const productBatches = await getBatchesByProduct(supabaseClient, productId);
      
      if (productBatches.length === 0) {
        throw new Error('No batches available for this product');
      }

      const result = await deductFromOldestBatchesUtil(
        supabaseClient,
        productId,
        quantityToDeduct,
        productBatches
      );

      if (!result.success) throw new Error(result.error);

      // Refresh batches after deduction
      await fetchBatches();
      await fetchStockByProduct();

      return result;
    } catch (err) {
      console.error('Error deducting from batches:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchBatches, fetchStockByProduct]);

  /**
   * Increment batch age (for "Keep for tomorrow")
   */
  const incrementBatchAge = useCallback(async (batchId) => {
    try {
      setLoading(true);
      setError(null);

      const result = await incrementBatchAgeUtil(supabaseClient, batchId);
      
      if (result.error) throw result.error;

      // Refresh batches after age increment
      await fetchBatches();

      return result;
    } catch (err) {
      console.error('Error incrementing batch age:', err);
      setError(err.message);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  }, [fetchBatches]);

  /**
   * Get batches grouped by product
   */
  const getBatchesByProductGrouped = useCallback(() => {
    const grouped = {};
    
    batches.forEach(batch => {
      const pid = batch.product_id;
      if (!grouped[pid]) {
        grouped[pid] = {
          product: batch.products,
          batches: [],
          totalQuantity: 0
        };
      }
      grouped[pid].batches.push(batch);
      grouped[pid].totalQuantity += parseFloat(batch.quantity) || 0;
    });

    return grouped;
  }, [batches]);

  /**
   * Set up real-time subscription
   */
  useEffect(() => {
    if (!enableRealtime) return;

    const channel = supabaseClient
      .channel('inventory_batches_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_batches'
        },
        (payload) => {
          console.log('Batch change detected:', payload);
          // Refresh batches when changes occur
          fetchBatches();
          fetchStockByProduct();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [enableRealtime, fetchBatches, fetchStockByProduct]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchBatches();
    fetchStockByProduct();
  }, [fetchBatches, fetchStockByProduct]);

  return {
    // State
    batches,
    loading,
    error,
    stockByProduct,
    
    // Methods
    fetchBatches,
    fetchStockByProduct,
    createBatch,
    updateBatch,
    deleteBatch,
    deductFromOldestBatches,
    incrementBatchAge,
    getBatchesByProductGrouped,
    
    // Utility methods (re-exported for convenience)
    sortBatchesByAge,
    calculateBatchAge,
    getBatchAgeCategory,
    getTotalStockForProduct
  };
};

export default useBatches;

