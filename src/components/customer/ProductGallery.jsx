/**
 * Product Gallery Component
 * 
 * Displays customer-facing product catalog with:
 * - Category filtering
 * - Search functionality
 * - Featured products filter
 * - Responsive grid layout
 * - Loading and error states
 * 
 * @component
 */

import { useState, useEffect, useMemo } from 'react';
import { useProductCatalog } from '../../hooks/useProductCatalog';
import { supabaseClient } from '../../config/supabase';
import { Loader } from '../icons';

// Search icon
const SearchIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

// Star icon for featured
const StarIcon = ({ size = 20, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Filter icon
const FilterIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

/**
 * ProductGallery Component
 * 
 * @param {Object} props
 * @param {Function} props.onProductClick - Callback when product is clicked
 */
const ProductGallery = ({ onProductClick }) => {
  // Filter state
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Categories state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch products using the hook
  const filters = useMemo(() => ({
    categories: selectedCategories,
    featuredOnly: showFeaturedOnly,
    availableOnly: true, // Only show available products to customers
    searchTerm: searchTerm.trim(),
  }), [selectedCategories, showFeaturedOnly, searchTerm]);

  const { products, loading, error, refetch } = useProductCatalog(filters);

  /**
   * Fetch product categories
   */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const { data, error } = await supabaseClient
          .from('product_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  /**
   * Toggle category filter
   */
  const toggleCategory = (categoryId) => {
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
    setSelectedCategories([]);
    setShowFeaturedOnly(false);
    setSearchTerm('');
  };

  /**
   * Get minimum price for a product
   */
  const getMinPrice = (product) => {
    if (!product.pricing || product.pricing.length === 0) {
      return null;
    }
    return Math.min(...product.pricing.map(p => parseFloat(p.price)));
  };

  /**
   * Format price for display
   */
  const formatPrice = (price) => {
    if (price === null) return 'Price not available';
    return `From Rs. ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <SearchIcon size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search for cakes and treats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-base"
        />
      </div>

      {/* Filter Toggle Button (Mobile) */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium"
        >
          <FilterIcon size={18} />
          Filters {(selectedCategories.length > 0 || showFeaturedOnly) && `(${selectedCategories.length + (showFeaturedOnly ? 1 : 0)})`}
        </button>

        {/* Clear Filters */}
        {(selectedCategories.length > 0 || showFeaturedOnly) && (
          <button
            onClick={clearFilters}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className={`${showFilters ? 'block' : 'hidden'} sm:block bg-white rounded-lg p-4 border-2 border-purple-100`}>
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <FilterIcon size={16} />
          Filter By Category
        </h3>
        
        {loadingCategories ? (
          <div className="flex items-center justify-center py-4">
            <Loader />
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {/* All Products Button */}
            <button
              onClick={() => setSelectedCategories([])}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedCategories.length === 0
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Products
            </button>

            {/* Featured Button */}
            <button
              onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                showFeaturedOnly
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <StarIcon size={16} filled={showFeaturedOnly} />
              Featured
            </button>

            {/* Category Buttons */}
            {categories.map(category => (
              <button
                key={category.category_id}
                onClick={() => toggleCategory(category.category_id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCategories.includes(category.category_id)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader />
              <p className="mt-4 text-gray-600 font-medium">Loading delicious treats...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-700 font-semibold mb-2">Oops! Something went wrong</p>
              <p className="text-red-600 text-sm mb-4">{error.message || 'Failed to load products'}</p>
              <button
                onClick={refetch}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-8 max-w-md mx-auto">
              <p className="text-2xl mb-2">🍰</p>
              <p className="text-purple-700 font-semibold mb-1">No products found</p>
              <p className="text-purple-600 text-sm">
                {searchTerm ? 'Try adjusting your search or filters' : 'Check back soon for new treats!'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="text-sm text-gray-600 mb-3">
              Showing {products.length} {products.length === 1 ? 'product' : 'products'}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(product => {
                const minPrice = getMinPrice(product);
                const mainImage = product.image_urls && product.image_urls.length > 0 
                  ? product.image_urls[0] 
                  : product.thumbnail_url;

                return (
                  <div
                    key={product.product_id}
                    onClick={() => onProductClick && onProductClick(product)}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-2 border-transparent hover:border-purple-300"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square bg-gradient-to-br from-purple-100 to-pink-100">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          🍰
                        </div>
                      )}
                      
                      {/* Featured Badge */}
                      {product.is_featured && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                          <StarIcon size={12} filled />
                          Featured
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="text-purple-700 font-bold text-lg">
                          {formatPrice(minPrice)}
                        </div>
                        
                        <button className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition">
                          View
                        </button>
                      </div>

                      {/* Preparation Time */}
                      {product.preparation_time && (
                        <div className="mt-2 text-xs text-gray-500">
                          ⏱️ {product.preparation_time}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductGallery;

