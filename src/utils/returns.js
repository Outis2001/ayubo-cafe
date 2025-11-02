/**
 * Returns Management Utilities
 * Handles return processing, batch management, and notifications
 */

import { incrementBatchAge, createBatch } from './batchTracking';

/**
 * Process a return to the bakery
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} userId - User ID who is processing the return
 * @param {Object} options - Return options
 * @param {Array} options.batchesToReturn - Array of batches to return
 * @param {Array} options.batchesToKeep - Array of batch IDs to keep for tomorrow
 * @returns {Promise<Object>} Result with data or error
 */
export const processReturn = async (supabaseClient, userId, { batchesToReturn, batchesToKeep }) => {
  try {
    if (!batchesToReturn || batchesToReturn.length === 0) {
      throw new Error('No batches selected for return');
    }

    // Calculate totals
    const totalQuantity = batchesToReturn.reduce((sum, batch) => sum + parseFloat(batch.quantity), 0);
    const totalValue = batchesToReturn.reduce((sum, batch) => {
      const returnValuePerUnit = parseFloat(batch.originalPrice) * (parseFloat(batch.returnPercentage) / 100);
      return sum + (returnValuePerUnit * parseFloat(batch.quantity));
    }, 0);
    const totalBatches = batchesToReturn.length;

    // Create return record
    const { data: returnRecord, error: returnError } = await supabaseClient
      .from('returns')
      .insert([{
        return_date: new Date().toISOString().split('T')[0],
        processed_by: userId,
        total_value: totalValue,
        total_quantity: totalQuantity,
        total_batches: totalBatches,
        notification_sent: false
      }])
      .select()
      .single();

    if (returnError) throw returnError;

    const returnId = returnRecord.id;

    // Create return items
    const returnItems = batchesToReturn.map(batch => {
      const returnValuePerUnit = parseFloat(batch.originalPrice) * (parseFloat(batch.returnPercentage) / 100);
      const totalReturnValue = returnValuePerUnit * parseFloat(batch.quantity);

      return {
        return_id: returnId,
        product_id: batch.productId,
        batch_id: batch.batchId,
        product_name: '', // Will fetch and store snapshot
        quantity: batch.quantity,
        age_at_return: batch.age,
        date_batch_added: batch.dateAdded,
        original_price: batch.originalPrice,
        sale_price: batch.salePrice,
        return_percentage: batch.returnPercentage,
        return_value_per_unit: returnValuePerUnit,
        total_return_value: totalReturnValue
      };
    });

    // Fetch product names for snapshots
    const productIds = [...new Set(batchesToReturn.map(b => b.productId))];
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('product_id, name')
      .in('product_id', productIds);

    if (productsError) throw productsError;

    // Add product names to return items
    returnItems.forEach(item => {
      const product = products.find(p => p.product_id === item.product_id);
      if (product) {
        item.product_name = product.name;
      }
    });

    // Insert return items
    const { error: itemsError } = await supabaseClient
      .from('return_items')
      .insert(returnItems);

    if (itemsError) throw itemsError;

    // Delete returned batches
    const batchIdsToReturn = batchesToReturn.map(b => b.batchId);
    const { error: deleteError } = await supabaseClient
      .from('inventory_batches')
      .delete()
      .in('id', batchIdsToReturn);

    if (deleteError) throw deleteError;

    // Increment age for kept batches (update date_added)
    const keepPromises = batchesToKeep.map(batchId =>
      incrementBatchAge(supabaseClient, batchId)
    );

    const keepResults = await Promise.all(keepPromises);
    const keepErrors = keepResults.filter(r => r.error);
    
    if (keepErrors.length > 0) {
      console.warn('Some batches failed to increment age:', keepErrors);
    }

    // Send email notification
    const emailSent = await sendReturnNotification(supabaseClient, returnId, returnRecord);

    // Update notification_sent flag only if email was successfully sent
    if (emailSent) {
      await supabaseClient
        .from('returns')
        .update({ notification_sent: true })
        .eq('id', returnId);
    }

    return {
      success: true,
      returnId,
      data: returnRecord,
      error: null
    };
  } catch (error) {
    console.error('Error processing return:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send email notification to owner
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} returnId - Return ID
 * @param {Object} returnRecord - Return record
 * @returns {Promise<void>}
 */
const sendReturnNotification = async (supabaseClient, returnId, returnRecord) => {
  try {
    // Fetch return details with items
    const { data: returnDetails, error: error2 } = await supabaseClient
      .from('return_items')
      .select('*')
      .eq('return_id', returnId);

    if (error2) throw error2;

    // Fetch processor name
    const { data: processor } = await supabaseClient
      .from('users')
      .select('first_name, last_name')
      .eq('user_id', returnRecord.processed_by)
      .single();

    // Fetch owner email
    const { data: owner, error: ownerError } = await supabaseClient
      .from('users')
      .select('email')
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
      .single();

    // If owner not found, skip email
    if (ownerError || !owner?.email) {
      console.warn('Owner email not found, skipping email notification');
      return false;
    }

    // Build email content
    const subject = `Return Processed - ${new Date(returnRecord.processed_at).toLocaleString()}`;
    const html = buildReturnEmailHTML(returnRecord, returnDetails || [], processor);

    // Send email via Netlify function
    const response = await fetch('/.netlify/functions/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: owner.email,
        subject,
        html,
        type: 'return_notification'
      })
    });

    if (!response.ok) {
      console.warn('Failed to send return notification email');
      return false;
    }
    
    console.log('Return notification email sent successfully to owner');
    return true;
  } catch (error) {
    console.error('Error sending return notification:', error);
    // Don't throw - email failure shouldn't block return processing
    return false;
  }
};

/**
 * Build HTML email template for return notification
 */
const buildReturnEmailHTML = (returnRecord, returnItems, processor) => {
  const processorName = processor ? `${processor.first_name} ${processor.last_name}` : 'Staff';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .summary-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .summary-row:last-child { border-bottom: none; font-weight: bold; }
        .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .items-table th { background-color: #f3f4f6; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Product Return Processed</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>A product return has been processed by <strong>${processorName}</strong>.</p>
          
          <div class="summary-box">
            <h2 style="margin-top: 0;">Return Summary</h2>
            <div class="summary-row">
              <span>Date:</span>
              <span>${new Date(returnRecord.processed_at).toLocaleString()}</span>
            </div>
            <div class="summary-row">
              <span>Processed By:</span>
              <span>${processorName}</span>
            </div>
            <div class="summary-row">
              <span>Total Batches:</span>
              <span>${returnRecord.total_batches}</span>
            </div>
            <div class="summary-row">
              <span>Total Quantity:</span>
              <span>${returnRecord.total_quantity}</span>
            </div>
            <div class="summary-row">
              <span style="color: #16a34a; font-size: 18px;">Total Return Value:</span>
              <span style="color: #16a34a; font-size: 18px;">Rs. ${parseFloat(returnRecord.total_value).toFixed(2)}</span>
            </div>
          </div>

          ${returnItems.length > 0 ? `
          <h3>Returned Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Age (Days)</th>
                <th>Return %</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${returnItems.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.age_at_return}</td>
                  <td>${item.return_percentage}%</td>
                  <td>Rs. ${parseFloat(item.total_return_value).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
          
          <p style="margin-top: 30px;">
            <a href="${window.location.origin}/#returns" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Returns Log
            </a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated notification from Ayubo Cafe Returns Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Undo/Delete a return transaction
 * Recreates batches from return_items to restore inventory
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} returnId - Return ID to undo
 * @returns {Promise<Object>} Result with success status
 */
export const undoReturn = async (supabaseClient, returnId) => {
  try {
    // Fetch return items to restore
    const { data: returnItems, error: itemsError } = await supabaseClient
      .from('return_items')
      .select('*')
      .eq('return_id', returnId);

    if (itemsError) throw itemsError;

    if (!returnItems || returnItems.length === 0) {
      throw new Error('No items found for this return');
    }

    // Recreate batches for each item
    // Note: batch_id might be null if original batch was deleted
    // In that case, create new batches with preserved data
    const batchPromises = returnItems.map(async (item) => {
      // Recreate batch with original data
      const result = await createBatch(
        supabaseClient,
        item.product_id,
        item.quantity,
        item.date_batch_added // Preserve original date for age tracking
      );
      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    const failedBatches = batchResults.filter(r => !r.success);
    
    if (failedBatches.length > 0) {
      console.error('Some batches failed to recreate:', failedBatches);
      throw new Error(`${failedBatches.length} batches failed to recreate`);
    }

    // Delete return_items (they cascade, but explicit is better)
    const { error: deleteItemsError } = await supabaseClient
      .from('return_items')
      .delete()
      .eq('return_id', returnId);

    if (deleteItemsError) throw deleteItemsError;

    // Delete return record
    const { error: deleteReturnError } = await supabaseClient
      .from('returns')
      .delete()
      .eq('id', returnId);

    if (deleteReturnError) throw deleteReturnError;

    return {
      success: true,
      batchesRecreated: batchResults.length,
      error: null
    };
  } catch (error) {
    console.error('Error undoing return:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fetch returns by date range
 * @param {Object} supabaseClient - Supabase client instance
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Returns array
 */
export const fetchReturnsByDateRange = async (supabaseClient, startDate, endDate) => {
  try {
    const { data, error } = await supabaseClient
      .from('returns')
      .select(`
        *,
        users:processed_by (
          first_name,
          last_name
        )
      `)
      .gte('return_date', startDate.toISOString().split('T')[0])
      .lte('return_date', endDate.toISOString().split('T')[0])
      .order('processed_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching returns:', error);
    return [];
  }
};

/**
 * Fetch return details with items
 * @param {Object} supabaseClient - Supabase client instance
 * @param {number} returnId - Return ID
 * @returns {Promise<Object>} Return with items
 */
export const fetchReturnDetails = async (supabaseClient, returnId) => {
  try {
    // Fetch return
    const { data: returnRecord, error: returnError } = await supabaseClient
      .from('returns')
      .select(`
        *,
        users:processed_by (
          first_name,
          last_name
        )
      `)
      .eq('id', returnId)
      .single();

    if (returnError) throw returnError;

    // Fetch return items
    const { data: returnItems, error: itemsError } = await supabaseClient
      .from('return_items')
      .select('*')
      .eq('return_id', returnId)
      .order('id', { ascending: true });

    if (itemsError) throw itemsError;

    return {
      return: returnRecord,
      items: returnItems || []
    };
  } catch (error) {
    console.error('Error fetching return details:', error);
    return { return: null, items: [] };
  }
};

