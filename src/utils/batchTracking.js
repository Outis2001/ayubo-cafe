/**
 * Batch Tracking Utilities
 * Handles batch-level inventory management, FIFO logic, and age calculations
 */

/**
 * Calculate the age of a batch in days
 * @param {string|Date} dateAdded - The date when the batch was added
 * @returns {number} Age in days (0 for today, 1 for yesterday, etc.)
 */
export const calculateBatchAge = (dateAdded) => {
  if (!dateAdded) {
    return 0;
  }

  const batchDate = new Date(dateAdded);
  const today = new Date();
  
  // Reset time portion to compare dates only
  batchDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today - batchDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays); // Never return negative
};

/**
 * Get batch age category for color-coding
 * @param {number} ageInDays - Age of the batch in days
 * @returns {string} 'fresh' (0-2 days), 'medium' (3-7 days), or 'old' (7+ days)
 */
export const getBatchAgeCategory = (ageInDays) => {
  if (ageInDays <= 2) {
    return 'fresh';
  } else if (ageInDays <= 7) {
    return 'medium';
  } else {
    return 'old';
  }
};

/**
 * Get color classes for batch age badge
 * @param {number} ageInDays - Age of the batch in days
 * @returns {Object} Color classes for the age category
 */
export const getBatchAgeColors = (ageInDays) => {
  const category = getBatchAgeCategory(ageInDays);
  
  switch (category) {
    case 'fresh':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
        badge: 'bg-green-500'
      };
    case 'medium':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
        badge: 'bg-yellow-500'
      };
    case 'old':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
        badge: 'bg-red-500'
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        badge: 'bg-gray-500'
      };
  }
};

/**
 * Sort batches by age (oldest first for FIFO)
 * @param {Array} batches - Array of batch objects with date_added
 * @returns {Array} Sorted batches (oldest first)
 */
export const sortBatchesByAge = (batches) => {
  if (!Array.isArray(batches) || batches.length === 0) {
    return [];
  }

  return [...batches].sort((a, b) => {
    const dateA = new Date(a.date_added);
    const dateB = new Date(b.date_added);
    
    // Oldest first (ascending order)
    return dateA - dateB;
  });
};

/**
 * Create a new batch (for Daily Stock Check-In)
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} productId - Product ID
 * @param {number} quantity - Quantity to add
 * @param {string} dateAdded - Date when batch was added (defaults to today)
 * @returns {Promise<Object>} Created batch or error
 */
export const createBatch = async (supabaseClient, productId, quantity, dateAdded = null) => {
  try {
    if (!productId || quantity <= 0) {
      throw new Error('Invalid product ID or quantity');
    }

    const batchDate = dateAdded || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseClient
      .from('inventory_batches')
      .insert([{
        product_id: productId,
        quantity: parseFloat(quantity),
        date_added: batchDate
      }])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creating batch:', error);
    return { data: null, error };
  }
};

/**
 * Get all batches for a specific product
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} Array of batches sorted by age (oldest first)
 */
export const getBatchesByProduct = async (supabaseClient, productId) => {
  try {
    if (!productId) {
      throw new Error('Product ID is required');
    }

    const { data, error } = await supabaseClient
      .from('inventory_batches')
      .select('*')
      .eq('product_id', productId)
      .gt('quantity', 0)
      .order('date_added', { ascending: true }); // Oldest first

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
};

/**
 * Get total stock for a product from all its batches
 * @param {Array} batches - Array of batch objects
 * @returns {number} Total quantity across all batches
 */
export const getTotalStockForProduct = (batches) => {
  if (!Array.isArray(batches) || batches.length === 0) {
    return 0;
  }

  return batches.reduce((total, batch) => {
    return total + (parseFloat(batch.quantity) || 0);
  }, 0);
};

/**
 * Deduct quantity from oldest batches first (FIFO logic)
 * Used when processing sales
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} productId - Product ID
 * @param {number} quantityToDeduct - Total quantity to deduct
 * @param {Array} batches - Array of available batches (sorted oldest first)
 * @returns {Promise<Object>} Result of deduction or error
 */
export const deductFromOldestBatches = async (supabaseClient, productId, quantityToDeduct, batches) => {
  try {
    if (!productId || quantityToDeduct <= 0) {
      throw new Error('Invalid product ID or quantity to deduct');
    }

    if (!batches || batches.length === 0) {
      throw new Error('No batches available for this product');
    }

    // Ensure batches are sorted oldest first
    const sortedBatches = sortBatchesByAge(batches);
    
    let remainingToDeduct = parseFloat(quantityToDeduct);
    const updates = [];
    const deletions = [];

    // Deduct from oldest batches first
    for (const batch of sortedBatches) {
      if (remainingToDeduct <= 0) break;

      const batchQuantity = parseFloat(batch.quantity);
      
      if (batchQuantity <= remainingToDeduct) {
        // Entire batch is consumed - mark for deletion
        deletions.push(batch.id);
        remainingToDeduct -= batchQuantity;
      } else {
        // Partial deduction - update quantity
        const newQuantity = batchQuantity - remainingToDeduct;
        updates.push({
          id: batch.id,
          quantity: newQuantity
        });
        remainingToDeduct = 0;
      }
    }

    // Check if we have enough stock
    if (remainingToDeduct > 0) {
      throw new Error(`Insufficient stock. Still need to deduct ${remainingToDeduct} units.`);
    }

    // Execute updates
    const updatePromises = updates.map(({ id, quantity }) =>
      supabaseClient
        .from('inventory_batches')
        .update({ 
          quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    );

    // Execute deletions
    const deletePromises = deletions.map(id =>
      supabaseClient
        .from('inventory_batches')
        .delete()
        .eq('id', id)
    );

    const results = await Promise.all([...updatePromises, ...deletePromises]);
    
    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Errors during batch deduction:', errors);
      throw new Error('Failed to update some batches');
    }

    return {
      success: true,
      batchesUpdated: updates.length,
      batchesDeleted: deletions.length,
      error: null
    };
  } catch (error) {
    console.error('Error deducting from batches:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Increment batch age by updating date_added (for "Keep for tomorrow" feature)
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} batchId - Batch ID to update
 * @returns {Promise<Object>} Result of update
 */
export const incrementBatchAge = async (supabaseClient, batchId) => {
  try {
    if (!batchId) {
      throw new Error('Batch ID is required');
    }

    // Increment date_added by 1 day to maintain age tracking
    const { data: batch, error: fetchError } = await supabaseClient
      .from('inventory_batches')
      .select('date_added')
      .eq('id', batchId)
      .single();

    if (fetchError) throw fetchError;

    const currentDate = new Date(batch.date_added);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 1); // Decrement date by 1 to increase age

    const { data, error } = await supabaseClient
      .from('inventory_batches')
      .update({
        date_added: newDate.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error incrementing batch age:', error);
    return { data: null, error };
  }
};

/**
 * Calculate total stock across all products from batches
 * @param {Object} supabaseClient - Supabase client instance
 * @returns {Promise<Object>} Map of product_id to total quantity
 */
export const calculateTotalStockByProduct = async (supabaseClient) => {
  try {
    const { data, error } = await supabaseClient
      .from('inventory_batches')
      .select('product_id, quantity');

    if (error) throw error;

    const stockByProduct = {};
    
    data.forEach(batch => {
      const productId = batch.product_id;
      const quantity = parseFloat(batch.quantity) || 0;
      
      if (!stockByProduct[productId]) {
        stockByProduct[productId] = 0;
      }
      stockByProduct[productId] += quantity;
    });

    return { data: stockByProduct, error: null };
  } catch (error) {
    console.error('Error calculating total stock:', error);
    return { data: {}, error };
  }
};

/**
 * Validate batch quantity (must be non-negative)
 * @param {number} quantity - Quantity to validate
 * @returns {boolean} True if valid
 */
export const isValidBatchQuantity = (quantity) => {
  const qty = parseFloat(quantity);
  return !isNaN(qty) && qty >= 0;
};

