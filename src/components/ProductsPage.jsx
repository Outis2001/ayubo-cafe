/**
 * Products Page Component
 * 
 * Comprehensive product management including:
 * - Add/Edit/Delete products
 * - Stock management
 * - Product sorting configuration (owner only)
 * - Bulk stock updates
 * 
 * Accessible to owners and cashiers
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { supabaseClient } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import useSortConfig from '../hooks/useSortConfig';
import useStockCheckIn from '../hooks/useStockCheckIn';
import { Settings, Trash2, Weight } from './icons';
import StockBadge from './StockBadge';
import SalesBadge from './SalesBadge';
import SortConfigPanel from './SortConfigPanel';
import DailyStockCheckIn from './DailyStockCheckIn';
import { fetchSalesData, invalidateSalesCache } from '../utils/productSorting';

const ProductsPage = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSalesData, setLoadingSalesData] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: '', 
    isWeightBased: false, 
    stockQuantity: 0, 
    lowStockThreshold: 5 
  });

  // Sort configuration hook
  const {
    sortN,
    updateSortN,
    loading: loadingSortConfig
  } = useSortConfig();

  // Stock check-in hook
  const {
    shouldShowCheckIn,
    completeCheckIn,
    skipCheckIn,
    showCheckInManually
  } = useStockCheckIn(currentUser?.role);

  useEffect(() => {
    loadProducts();
    if (currentUser?.role === 'owner') {
      loadSalesData();
    }
  }, [sortN, currentUser]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('products')
        .select('product_id, name, price, is_weight_based, stock_quantity, low_stock_threshold, updated_time')
        .order('product_id', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Error loading products. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesData = async () => {
    try {
      setLoadingSalesData(true);
      const data = await fetchSalesData(supabaseClient, sortN);
      setSalesData(data);
    } catch (error) {
      console.error('Error loading sales data:', error);
      setSalesData([]);
    } finally {
      setLoadingSalesData(false);
    }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Please fill all fields');
      return;
    }

    try {
      const product = {
        product_id: Date.now(),
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        is_weight_based: newProduct.isWeightBased,
        stock_quantity: parseFloat(newProduct.stockQuantity) || 0,
        low_stock_threshold: parseFloat(newProduct.lowStockThreshold) || 5
      };

      const { error } = await supabaseClient
        .from('products')
        .insert([product]);

      if (error) throw error;

      await loadProducts();
      setNewProduct({ name: '', price: '', isWeightBased: false, stockQuantity: 0, lowStockThreshold: 5 });
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please try again.');
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('product_id', productId);

      if (error) throw error;

      await loadProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  const startEdit = (product) => {
    setEditingProduct({ ...product });
  };

  const saveEdit = async () => {
    try {
      const updateData = {
        name: editingProduct.name,
        price: editingProduct.price,
        is_weight_based: editingProduct.is_weight_based
      };

      if (currentUser.role === 'owner') {
        updateData.stock_quantity = parseFloat(editingProduct.stock_quantity) || 0;
        updateData.low_stock_threshold = parseFloat(editingProduct.low_stock_threshold) || 5;
      }

      const { error } = await supabaseClient
        .from('products')
        .update(updateData)
        .eq('product_id', editingProduct.product_id);

      if (error) throw error;

      await loadProducts();
      setEditingProduct(null);
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-center text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 flex items-center gap-2">
            <Settings size={28} className="sm:w-8 sm:h-8" />
            Product Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage inventory and product catalog</p>
        </div>

        {/* Sort Configuration (Owner Only) */}
        {currentUser?.role === 'owner' && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
            <SortConfigPanel
              currentN={sortN}
              onSave={async (newN) => {
                const success = await updateSortN(newN);
                if (success) {
                  invalidateSalesCache();
                  await loadSalesData();
                }
                return success;
              }}
              loading={loadingSortConfig || loadingSalesData}
            />
          </div>
        )}

        {/* Add Product Form */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-4">Add New Product</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              <input
                type="text"
                placeholder="Product Name"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
              <input
                type="number"
                min="0"
                step={newProduct.isWeightBased ? "0.1" : "1"}
                placeholder="Stock Quantity"
                value={newProduct.stockQuantity}
                onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
              <input
                type="number"
                min="0"
                placeholder="Low Stock Alert"
                value={newProduct.lowStockThreshold}
                onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: e.target.value })}
                className="px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
              <button
                onClick={addProduct}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition text-sm font-bold"
              >
                Add Product
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newProduct.isWeightBased}
                onChange={(e) => setNewProduct({ ...newProduct, isWeightBased: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Weight-based pricing (price per kg)</span>
            </label>
            <button
              onClick={showCheckInManually}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition text-sm font-bold flex items-center justify-center gap-2"
            >
              📦 Update All Stock Quantities
            </button>
          </div>
        </div>

        {/* Product List */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-blue-800 mb-4">
            All Products ({products.length})
          </h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {products.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No products found. Add one above!</p>
            ) : (
              products.map(product => (
                <div key={product.product_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-gray-50 rounded-lg border border-blue-200 hover:border-blue-400 transition text-sm">
                  {editingProduct?.product_id === product.product_id ? (
                    <>
                      <input
                        type="text"
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="flex-1 w-full px-2 py-1 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editingProduct.price}
                        onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                        className="w-full sm:w-24 px-2 py-1 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                      />
                      {currentUser.role === 'owner' && (
                        <>
                          <input
                            type="number"
                            min="0"
                            step={editingProduct.is_weight_based ? "0.1" : "1"}
                            value={editingProduct.stock_quantity}
                            onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseFloat(e.target.value) })}
                            className="w-full sm:w-20 px-2 py-1 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder="Stock"
                          />
                          <input
                            type="number"
                            min="0"
                            value={editingProduct.low_stock_threshold}
                            onChange={(e) => setEditingProduct({ ...editingProduct, low_stock_threshold: parseFloat(e.target.value) })}
                            className="w-full sm:w-20 px-2 py-1 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder="Threshold"
                          />
                        </>
                      )}
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={editingProduct.is_weight_based}
                          onChange={(e) => setEditingProduct({ ...editingProduct, is_weight_based: e.target.checked })}
                          className="w-3 h-3"
                        />
                        <span>Weight</span>
                      </label>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={saveEdit} className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 font-bold">
                          Save
                        </button>
                        <button onClick={() => setEditingProduct(null)} className="flex-1 sm:flex-none bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 font-bold">
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 flex flex-col gap-1">
                        <span className="flex items-center gap-1 font-semibold">
                          {product.name}
                          {product.is_weight_based && <Weight size={14} className="text-orange-600" />}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <StockBadge product={product} showFullText={false} />
                          {currentUser.role === 'owner' && (
                            <SalesBadge 
                              product={product}
                              salesQuantity={salesData.find(s => s.product_id === product.product_id)?.total_sold || 0}
                              isMobile={true}
                            />
                          )}
                        </div>
                      </span>
                      <span className="w-28 font-bold text-blue-700 text-base">
                        Rs. {product.price.toFixed(2)}{product.is_weight_based && '/kg'}
                      </span>
                      {currentUser.role === 'owner' && product.updated_time && (
                        <span className="text-xs text-gray-500 w-24">
                          {new Date(product.updated_time).toLocaleDateString()}
                        </span>
                      )}
                      <div className="flex gap-2">
                        <button 
                          onClick={() => startEdit(product)} 
                          className="text-blue-600 hover:text-blue-800 px-2 py-1 font-medium"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteProduct(product.product_id)} 
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Daily Stock Check-In Modal */}
        {shouldShowCheckIn && currentUser && (
          <DailyStockCheckIn
            products={products}
            onSave={async () => {
              await loadProducts();
              completeCheckIn();
            }}
            onSkip={skipCheckIn}
            onClose={skipCheckIn}
            supabaseClient={supabaseClient}
          />
        )}
      </div>
    </div>
  );
};

export default ProductsPage;

