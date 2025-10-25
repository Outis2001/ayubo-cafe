/**
 * useProductCatalog Hook
 * 
 * React hook for fetching and managing product catalog data.
 * Provides loading states, error handling, and caching for product data.
 * 
 * @module hooks/useProductCatalog
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProducts, fetchProductById } from '../utils/productCatalog';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = {
  products: null,
  timestamp: null,
  filters: null,
};

/**
 * Check if cache is valid for given filters
 * @param {Object} filters - Current filters
 * @returns {boolean} True if cache is valid
 */
function isCacheValid(filters) {
  if (!cache.products || !cache.timestamp) {
    return false;
  }

  // Check if cache is expired
  const now = Date.now();
  if (now - cache.timestamp > CACHE_DURATION) {
    return false;
  }

  // Check if filters match (deep comparison)
  if (JSON.stringify(filters) !== JSON.stringify(cache.filters)) {
    return false;
  }

  return true;
}

/**
 * useProductCatalog Hook
 * 
 * Fetches products with pricing and categories, with caching support.
 * 
 * @param {Object} filters - Filter options
 * @param {string[]} filters.categories - Category IDs to filter by
 * @param {boolean} filters.availableOnly - Show only available products
 * @param {boolean} filters.featuredOnly - Show only featured products
 * @param {string} filters.searchTerm - Search term for product name/description
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * @param {boolean} options.useCache - Use cached data if available (default: true)
 * 
 * @returns {Object} Hook state and methods
 * @returns {Array} products - Array of products with pricing and categories
 * @returns {boolean} loading - Loading state
 * @returns {Error|null} error - Error object if fetch failed
 * @returns {Function} refetch - Function to manually refetch data
 * @returns {Function} clearCache - Function to clear cached data
 * 
 * @example
 * const { products, loading, error, refetch } = useProductCatalog({
 *   availableOnly: true,
 *   searchTerm: 'chocolate'
 * });
 */
export function useProductCatalog(filters = {}, options = {}) {
  const { autoFetch = true, useCache = true } = options;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  
  // Track previous filters to detect changes
  const prevFiltersRef = useRef(null);

  /**
   * Fetch products from API or cache
   */
  const fetchProductsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      if (useCache && isCacheValid(filters)) {
        console.log('[useProductCatalog] Using cached data');
        if (isMounted.current) {
          setProducts(cache.products);
          setLoading(false);
        }
        return;
      }

      // Fetch from API
      console.log('[useProductCatalog] Fetching products from API');
      const data = await fetchProducts(filters);

      // Update cache
      cache.products = data;
      cache.timestamp = Date.now();
      cache.filters = { ...filters };

      // Update state if component is still mounted
      if (isMounted.current) {
        setProducts(data);
        setLoading(false);
      }

    } catch (err) {
      console.error('[useProductCatalog] Error fetching products:', err);
      if (isMounted.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [filters, useCache]);

  /**
   * Manually refetch products (bypasses cache)
   */
  const refetch = useCallback(async () => {
    // Clear cache first
    cache.products = null;
    cache.timestamp = null;
    cache.filters = null;

    // Fetch fresh data
    await fetchProductsData();
  }, [fetchProductsData]);

  /**
   * Clear cached products data
   */
  const clearCache = useCallback(() => {
    cache.products = null;
    cache.timestamp = null;
    cache.filters = null;
    console.log('[useProductCatalog] Cache cleared');
  }, []);

  // Auto-fetch on mount or when filters change
  useEffect(() => {
    if (autoFetch) {
      // Check if filters have changed
      const filtersChanged = JSON.stringify(filters) !== JSON.stringify(prevFiltersRef.current);
      
      if (filtersChanged || !products.length) {
        fetchProductsData();
        prevFiltersRef.current = { ...filters };
      }
    }

    // Cleanup: mark component as unmounted
    return () => {
      isMounted.current = false;
    };
  }, [autoFetch, filters, fetchProductsData]);

  return {
    products,
    loading,
    error,
    refetch,
    clearCache,
  };
}

/**
 * useProduct Hook
 * 
 * Fetches a single product by ID with all details.
 * 
 * @param {string} productId - Product ID to fetch
 * @param {Object} options - Options
 * @param {boolean} options.autoFetch - Auto-fetch on mount (default: true)
 * 
 * @returns {Object} Hook state and methods
 * @returns {Object|null} product - Product details
 * @returns {boolean} loading - Loading state
 * @returns {Error|null} error - Error object if fetch failed
 * @returns {Function} refetch - Function to manually refetch data
 * 
 * @example
 * const { product, loading, error } = useProduct(productId);
 */
export function useProduct(productId, options = {}) {
  const { autoFetch = true } = options;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track if component is mounted
  const isMounted = useRef(true);

  /**
   * Fetch product by ID
   */
  const fetchProductData = useCallback(async () => {
    if (!productId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await fetchProductById(productId);

      if (isMounted.current) {
        setProduct(data);
        setLoading(false);
      }

    } catch (err) {
      console.error('[useProduct] Error fetching product:', err);
      if (isMounted.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [productId]);

  /**
   * Manually refetch product
   */
  const refetch = useCallback(async () => {
    await fetchProductData();
  }, [fetchProductData]);

  // Auto-fetch on mount or when productId changes
  useEffect(() => {
    if (autoFetch && productId) {
      fetchProductData();
    }

    // Cleanup: mark component as unmounted
    return () => {
      isMounted.current = false;
    };
  }, [autoFetch, productId, fetchProductData]);

  return {
    product,
    loading,
    error,
    refetch,
  };
}

export default useProductCatalog;

