import { useState, useEffect } from 'react';
import { X, Loader, Search } from './icons';

/**
 * DailyStockCheckIn Component
 * Modal for daily stock quantity updates
 * Allows bulk editing of all product stock levels
 * 
 * @param {Array} products - List of all products
 * @param {Function} onSave - Callback when save is clicked
 * @param {Function} onSkip - Callback when skip is clicked
 * @param {Function} onClose - Callback when modal is closed
 * @param {Object} supabaseClient - Supabase client instance
 */
const DailyStockCheckIn = ({ products, onSave, onSkip, onClose, supabaseClient }) => {
  const [stockUpdates, setStockUpdates] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Initialize stock updates with current values
  useEffect(() => {
    const initialStock = {};
    products.forEach(product => {
      initialStock[product.product_id] = product.stock_quantity || 0;
    });
    setStockUpdates(initialStock);
  }, [products]);

  /**
   * Handle stock quantity change for a product
   * Validates input and updates state
   */
  const handleStockChange = (productId, value) => {
    // Allow empty string for clearing input
    if (value === '') {
      setStockUpdates(prev => ({ ...prev, [productId]: '' }));
      return;
    }

    const numValue = parseFloat(value);
    
    // Validate non-negative number
    if (!isNaN(numValue) && numValue >= 0) {
      setStockUpdates(prev => ({ ...prev, [productId]: numValue }));
    }
  };

  /**
   * Save all stock updates to database
   * Updates stock_quantity and updated_time for each product
   */
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Prepare updates array
      const updates = Object.entries(stockUpdates).map(([productId, quantity]) => ({
        product_id: parseInt(productId),
        stock_quantity: parseFloat(quantity) || 0
      }));

      // Update each product in the database
      const updatePromises = updates.map(update =>
        supabaseClient
          .from('products')
          .update({ 
            stock_quantity: update.stock_quantity,
            updated_time: new Date().toISOString()
          })
          .eq('product_id', update.product_id)
      );

      const results = await Promise.all(updatePromises);

      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Update errors:', errors);
        throw new Error(`Failed to update ${errors.length} products`);
      }

      alert('✅ Stock quantities updated successfully!');
      onSave(); // Trigger parent callback to reload products
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('❌ Error updating stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Format stock display based on product type
   */
  const formatStockDisplay = (product) => {
    const quantity = product.stock_quantity || 0;
    return product.is_weight_based ? `${quantity} kg` : quantity.toString();
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📦 Daily Stock Check-In</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update inventory quantities for all products
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Product List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.product_id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      Rs. {product.price.toFixed(2)}
                      {product.is_weight_based && ' / kg'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {formatStockDisplay(product)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    New Stock:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={product.is_weight_based ? "0.1" : "1"}
                    value={stockUpdates[product.product_id] ?? ''}
                    onChange={(e) => handleStockChange(product.product_id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={product.is_weight_based ? "0.0 kg" : "0"}
                    disabled={saving}
                  />
                  <span className="text-sm text-gray-600 min-w-[40px]">
                    {product.is_weight_based ? 'kg' : 'pcs'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No products found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between gap-4">
          <button
            onClick={onSkip}
            disabled={saving}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Skip for Now
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyStockCheckIn;

