/**
 * Product Catalog Management Component
 * 
 * Owner-only interface for managing the customer-facing product catalog:
 * - View all products with filtering and search
 * - Create new products with images and pricing
 * - Edit existing products
 * - Manage product categories
 * - Control product availability
 * 
 * OWNER ONLY - Role-based access control enforced
 * 
 * @component
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchProducts,
  fetchCategories,
  softDeleteProduct,
  getProductStatistics
} from '../../utils/productCatalog';
import { Settings, Trash2, Plus, Search, Eye, EyeOff, Star, X } from '../icons';
import ProductForm from './ProductForm';
import CategoryManagement from './CategoryManagement';

const ProductCatalogManagement = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [availabilityFilter, setAvailabilityFilter] = useState('all'); // 'all', 'available', 'unavailable'
  const [featuredFilter, setFeaturedFilter] = useState(false);
  
  // Modal/Form state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);

  /**
   * Check if current user is owner
   */
  const isOwner = currentUser?.role === 'owner';

  /**
   * Load products with current filters
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const filters = {
        searchTerm: searchTerm.trim(),
        categories: selectedCategories,
        availableOnly: availabilityFilter === 'available',
        featuredOnly: featuredFilter
      };

      const data = await fetchProducts(filters);
      
      // Apply unavailable filter client-side
      if (availabilityFilter === 'unavailable') {
        setProducts(data.filter(p => !p.is_available));
      } else {
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load categories
   */
  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  /**
   * Load product statistics
   */
  const loadStatistics = async () => {
    try {
      const stats = await getProductStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  /**
   * Initial data load
   */
  useEffect(() => {
    if (isOwner) {
      loadCategories();
      loadStatistics();
    }
  }, [isOwner]);

  /**
   * Reload products when filters change
   */
  useEffect(() => {
    if (isOwner) {
      loadProducts();
    }
  }, [isOwner, searchTerm, selectedCategories, availabilityFilter, featuredFilter]);

  /**
   * Handle product deletion
   */
  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product? This will mark it as unavailable.')) {
      return;
    }

    try {
      setDeletingProductId(productId);
      await softDeleteProduct(productId, currentUser.user_id);
      
      // Reload products and statistics
      await loadProducts();
      await loadStatistics();
      
      alert('Product marked as unavailable successfully.');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.message || 'Failed to delete product. Please try again.');
    } finally {
      setDeletingProductId(null);
    }
  };

  /**
   * Handle edit product
   */
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  /**
   * Handle add new product
   */
  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  /**
   * Handle product form success
   */
  const handleProductFormSuccess = async (savedProduct) => {
    setShowProductForm(false);
    setEditingProduct(null);
    
    // Reload products and statistics
    await loadProducts();
    await loadStatistics();
    
    alert(`Product ${savedProduct.product_name} ${editingProduct ? 'updated' : 'created'} successfully!`);
  };

  /**
   * Handle category manager update
   */
  const handleCategoryUpdate = async () => {
    // Reload categories, products, and statistics
    await loadCategories();
    await loadProducts();
    await loadStatistics();
  };

  /**
   * Handle category filter toggle
   */
  const toggleCategoryFilter = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setAvailabilityFilter('all');
    setFeaturedFilter(false);
  };

  /**
   * Count of active filters
   */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedCategories.length > 0) count++;
    if (availabilityFilter !== 'all') count++;
    if (featuredFilter) count++;
    return count;
  }, [searchTerm, selectedCategories, availabilityFilter, featuredFilter]);

  /**
   * Format price for display
   */
  const formatPrice = (price) => {
    return `Rs. ${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Get minimum price from pricing options
   */
  const getMinPrice = (pricingOptions) => {
    if (!pricingOptions || pricingOptions.length === 0) return null;
    const prices = pricingOptions.map(p => parseFloat(p.price));
    return Math.min(...prices);
  };

  // Prevent access if not owner
  if (!isOwner) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-700">
            Only the owner can access the Product Catalog Management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Product Catalog</h1>
          <p className="text-gray-600">Manage your customer-facing product catalog</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Settings size={18} />
            Manage Categories
          </button>
          <button
            onClick={handleAddProduct}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-500 text-sm">Total Products</div>
            <div className="text-2xl font-bold text-gray-800">{statistics.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="text-green-700 text-sm">Available</div>
            <div className="text-2xl font-bold text-green-800">{statistics.available}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="text-red-700 text-sm">Unavailable</div>
            <div className="text-2xl font-bold text-red-800">{statistics.unavailable}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="text-yellow-700 text-sm">Featured</div>
            <div className="text-2xl font-bold text-yellow-800">{statistics.featured}</div>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4">
            <div className="text-purple-700 text-sm">Categories</div>
            <div className="text-2xl font-bold text-purple-800">{statistics.categories}</div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Availability Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                availabilityFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                availabilityFilter === 'available'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye size={18} className="inline mr-1" />
              Available
            </button>
            <button
              onClick={() => setAvailabilityFilter('unavailable')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                availabilityFilter === 'unavailable'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <EyeOff size={18} className="inline mr-1" />
              Unavailable
            </button>
          </div>

          {/* Featured Filter */}
          <button
            onClick={() => setFeaturedFilter(!featuredFilter)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              featuredFilter
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star size={18} className="inline mr-1" />
            Featured
          </button>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-2">Filter by Category:</div>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category.category_id}
                  onClick={() => toggleCategoryFilter(category.category_id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategories.includes(category.category_id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      )}

      {/* Products Grid */}
      {!loading && products.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">No products found.</p>
          {activeFilterCount > 0 && (
            <p className="text-gray-500 mt-2">Try adjusting your filters or search term.</p>
          )}
          <button
            onClick={handleAddProduct}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Product
          </button>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <div
              key={product.product_id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Product Image */}
              <div className="relative h-48 bg-gray-200">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  {product.is_featured && (
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                      FEATURED
                    </span>
                  )}
                  {!product.is_available && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                      UNAVAILABLE
                    </span>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-2 truncate" title={product.product_name}>
                  {product.product_name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2" title={product.description}>
                  {product.description}
                </p>

                {/* Pricing */}
                <div className="mb-3">
                  {product.pricing && product.pricing.length > 0 ? (
                    <div>
                      <div className="text-lg font-bold text-blue-600">
                        {product.pricing.length === 1 ? (
                          formatPrice(product.pricing[0].price)
                        ) : (
                          `From ${formatPrice(getMinPrice(product.pricing))}`
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {product.pricing.length} price option{product.pricing.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">No pricing set</div>
                  )}
                </div>

                {/* Categories */}
                {product.categories && product.categories.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {product.categories.slice(0, 2).map(cm => (
                      cm.category && (
                        <span
                          key={cm.category.category_id}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                        >
                          {cm.category.name}
                        </span>
                      )
                    ))}
                    {product.categories.length > 2 && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        +{product.categories.length - 2} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.product_id)}
                    disabled={deletingProductId === product.product_id}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title="Mark as unavailable"
                  >
                    {deletingProductId === product.product_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
          onSuccess={handleProductFormSuccess}
        />
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <CategoryManagement
          onClose={() => setShowCategoryManager(false)}
          onUpdate={handleCategoryUpdate}
        />
      )}
    </div>
  );
};

export default ProductCatalogManagement;

