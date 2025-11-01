/**
 * Returns Page Component
 * 
 * Main interface for processing product returns to bakery
 * Features:
 * - Display all batches with stock > 0
 * - Color-coded age indicators (Green/Yellow/Red)
 * - Select batches to keep for tomorrow
 * - Override return percentage per batch
 * - Real-time return value calculation
 * - Process returns with confirmation
 * 
 * Accessible to owners and cashiers
 * 
 * @component
 */

import { useState, useEffect, useMemo } from 'react';
import { supabaseClient } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { useBatches } from '../hooks/useBatches';
import { Loader, Search } from './icons';
import BatchAgeIndicator from './BatchAgeIndicator';
import ReturnedLog from './ReturnedLog';

const ReturnsPage = () => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState('all'); // 'all', 'fresh', 'medium', 'old'
  const [selectedBatches, setSelectedBatches] = useState({}); // batchId -> boolean (keep for tomorrow)
  const [returnPercentages, setReturnPercentages] = useState({}); // batchId -> percentage override
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [processingReturn, setProcessingReturn] = useState(false);
  const [showReturnedLog, setShowReturnedLog] = useState(false);

  // Use batches hook to fetch all batches
  const { batches, loading, error, fetchBatches } = useBatches({ enableRealtime: true });

  // Load batches on mount and reload
  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  /**
   * Filter batches based on search and age filter
   */
  const filteredBatches = useMemo(() => {
    let filtered = batches;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(batch => 
        batch.products?.name?.toLowerCase().includes(query)
      );
    }

    // Filter by age
    if (ageFilter !== 'all') {
      filtered = filtered.filter(batch => batch.ageCategory === ageFilter);
    }

    return filtered;
  }, [batches, searchQuery, ageFilter]);

  /**
   * Calculate return summary
   */
  const returnSummary = useMemo(() => {
    const batchesToReturn = filteredBatches.filter(batch => !selectedBatches[batch.id]);
    
    const summary = batchesToReturn.reduce((acc, batch) => {
      const product = batch.products || {};
      const overridePercentage = returnPercentages[batch.id];
      const effectivePercentage = overridePercentage || product.default_return_percentage || 20;
      const originalPrice = product.original_price || 0;
      const returnValuePerUnit = originalPrice * (effectivePercentage / 100);
      const totalReturnValue = returnValuePerUnit * batch.quantity;

      acc.totalBatches += 1;
      acc.totalQuantity += batch.quantity;
      acc.totalValue += totalReturnValue;

      // Add to product breakdown
      const productId = batch.product_id;
      if (!acc.productBreakdown[productId]) {
        acc.productBreakdown[productId] = {
          name: product.name || 'Unknown Product',
          batches: 0,
          quantity: 0,
          value: 0
        };
      }
      acc.productBreakdown[productId].batches += 1;
      acc.productBreakdown[productId].quantity += batch.quantity;
      acc.productBreakdown[productId].value += totalReturnValue;

      return acc;
    }, {
      totalBatches: 0,
      totalQuantity: 0,
      totalValue: 0,
      productBreakdown: {}
    });

    return summary;
  }, [filteredBatches, selectedBatches, returnPercentages]);

  /**
   * Handle keeping a batch for tomorrow
   */
  const handleKeepToggle = (batchId, kept) => {
    setSelectedBatches(prev => ({
      ...prev,
      [batchId]: kept
    }));
  };

  /**
   * Handle return percentage override
   */
  const handlePercentageChange = (batchId, percentage) => {
    setReturnPercentages(prev => ({
      ...prev,
      [batchId]: parseInt(percentage)
    }));
  };

  /**
   * Process the return
   */
  const handleProcessReturn = async () => {
    setProcessingReturn(true);
    try {
      // Import returns utility
      const { processReturn } = await import('../utils/returns');

      // Get batches to return
      const batchesToReturn = filteredBatches
        .filter(batch => !selectedBatches[batch.id])
        .map(batch => ({
          batchId: batch.id,
          productId: batch.product_id,
          quantity: batch.quantity,
          age: batch.age,
          dateAdded: batch.date_added,
          originalPrice: batch.products?.original_price || 0,
          salePrice: batch.products?.sale_price || 0,
          returnPercentage: returnPercentages[batch.id] || batch.products?.default_return_percentage || 20
        }));

      // Get batches to keep
      const batchesToKeep = filteredBatches
        .filter(batch => selectedBatches[batch.id])
        .map(batch => batch.id);

      // Process return
      const result = await processReturn(supabaseClient, currentUser.id, {
        batchesToReturn,
        batchesToKeep
      });

      if (result.error) {
        throw new Error(result.error);
      }

      alert('✅ Return processed successfully! Email notification sent to owner.');
      
      // Reset selections and reload
      setSelectedBatches({});
      setReturnPercentages({});
      fetchBatches();
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Error processing return:', error);
      alert(`❌ Error processing return: ${error.message}`);
    } finally {
      setProcessingReturn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <p className="ml-4 text-gray-600">Loading batches...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center py-12 text-red-600">
              <p className="text-lg font-semibold">Error loading batches</p>
              <p className="text-sm mt-2">{error}</p>
              <button
                onClick={fetchBatches}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 flex items-center gap-2">
              📦 Returns Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Process returns to bakery, keep items for tomorrow
            </p>
          </div>
          <button
            onClick={() => setShowReturnedLog(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition text-sm flex items-center gap-2"
          >
            📋 Returned Log
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            {/* Age Filter */}
            <div>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="all">All Ages</option>
                <option value="fresh">Fresh (0-2 days)</option>
                <option value="medium">Medium (3-7 days)</option>
                <option value="old">Old (7+ days)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Returns Summary Footer (Sticky) */}
        {filteredBatches.length > 0 && (
          <div className="sticky bottom-0 bg-blue-600 text-white rounded-lg shadow-xl p-4 mb-6 z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{returnSummary.totalBatches}</div>
                  <div className="text-xs opacity-90">Batches</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{returnSummary.totalQuantity.toFixed(1)}</div>
                  <div className="text-xs opacity-90">Quantity</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">Rs. {returnSummary.totalValue.toFixed(2)}</div>
                  <div className="text-xs opacity-90">Total Value</div>
                </div>
              </div>

              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={returnSummary.totalBatches === 0}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingReturn && <Loader className="w-5 h-5 animate-spin" />}
                {processingReturn ? 'Processing...' : 'Process Return'}
              </button>
            </div>
          </div>
        )}

        {/* Batch List */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-4">
            Batches to Return ({filteredBatches.length})
          </h2>

          {filteredBatches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {batches.length === 0 
                ? 'No batches with stock available. Stock check-in may be needed.' 
                : 'No batches match your filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-blue-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Keep</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Product</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Age</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Original Price</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Sale Price</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700">Return %</th>
                    <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Return Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch) => {
                    const product = batch.products || {};
                    const overridePercentage = returnPercentages[batch.id];
                    const effectivePercentage = overridePercentage || product.default_return_percentage || 20;
                    const originalPrice = product.original_price || 0;
                    const returnValuePerUnit = originalPrice * (effectivePercentage / 100);
                    const totalReturnValue = returnValuePerUnit * batch.quantity;
                    const isKept = selectedBatches[batch.id];

                    return (
                      <tr 
                        key={batch.id}
                        className={`border-b border-gray-200 hover:bg-gray-50 ${
                          isKept ? 'bg-gray-100 opacity-70' : ''
                        }`}
                      >
                        {/* Keep Checkbox */}
                        <td className="py-3 px-2">
                          <input
                            type="checkbox"
                            checked={isKept || false}
                            onChange={(e) => handleKeepToggle(batch.id, e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>

                        {/* Product Name */}
                        <td className="py-3 px-2">
                          <div className="font-medium text-gray-900">{product.name || 'Unknown Product'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Added: {new Date(batch.date_added).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Age Badge */}
                        <td className="py-3 px-2 text-center">
                          <BatchAgeIndicator age={batch.age} />
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-2 text-center font-medium">
                          {batch.quantity.toFixed(1)}
                        </td>

                        {/* Original Price */}
                        <td className="py-3 px-2 text-right text-gray-700">
                          Rs. {originalPrice.toFixed(2)}
                        </td>

                        {/* Sale Price */}
                        <td className="py-3 px-2 text-right text-gray-700">
                          Rs. {(product.sale_price || 0).toFixed(2)}
                        </td>

                        {/* Return Percentage */}
                        <td className="py-3 px-2">
                          <select
                            value={effectivePercentage}
                            onChange={(e) => handlePercentageChange(batch.id, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                            disabled={isKept}
                          >
                            <option value="20">20%</option>
                            <option value="100">100%</option>
                          </select>
                        </td>

                        {/* Return Value */}
                        <td className="py-3 px-2 text-right font-semibold text-green-700">
                          Rs. {totalReturnValue.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Product Breakdown Summary */}
        {Object.keys(returnSummary.productBreakdown).length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mt-6">
            <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-4">Return Summary by Product</h2>
            <div className="space-y-2">
              {Object.entries(returnSummary.productBreakdown).map(([productId, summary]) => (
                <div key={productId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{summary.name}</div>
                    <div className="text-sm text-gray-600">
                      {summary.batches} batch{summary.batches !== 1 ? 'es' : ''}, {summary.quantity.toFixed(1)} units
                    </div>
                  </div>
                  <div className="font-bold text-green-700">
                    Rs. {summary.value.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Return Processing</h3>
                
                <div className="mb-6 space-y-3">
                  <p className="text-gray-700">
                    You are about to process returns for <strong>{returnSummary.totalBatches}</strong> batch{returnSummary.totalBatches !== 1 ? 'es' : ''}:
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Total Quantity:</span>
                        <span className="ml-2 font-bold">{returnSummary.totalQuantity.toFixed(1)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Value:</span>
                        <span className="ml-2 font-bold text-green-700">Rs. {returnSummary.totalValue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Items marked "Keep for tomorrow" will remain in inventory. An email notification will be sent to the owner.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    disabled={processingReturn}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProcessReturn}
                    disabled={processingReturn}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processingReturn && <Loader className="w-4 h-4 animate-spin" />}
                    {processingReturn ? 'Processing...' : 'Confirm & Process'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Returned Log Modal */}
        {showReturnedLog && (
          <ReturnedLog 
            isOpen={showReturnedLog} 
            onClose={() => setShowReturnedLog(false)} 
          />
        )}
      </div>
    </div>
  );
};

export default ReturnsPage;

