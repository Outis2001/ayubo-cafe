import { supabaseClient } from '../config/supabase';
import { logAuditEvent } from './auditLog';

/**
 * Product Catalog Management Utilities
 * 
 * Provides functions for managing the product catalog including:
 * - CRUD operations for products and categories
 * - Product pricing management
 * - Image management
 * - Category mappings
 * - Search and filtering
 */

/**
 * Fetch all products with their pricing options and categories
 * @param {Object} filters - Filter options
 * @param {string[]} filters.categories - Category IDs to filter by
 * @param {boolean} filters.availableOnly - Show only available products
 * @param {boolean} filters.featuredOnly - Show only featured products
 * @param {string} filters.searchTerm - Search term for product name/description
 * @returns {Promise<Array>} Array of products with pricing and categories
 */
export async function fetchProducts(filters = {}) {
  try {
    let query = supabaseClient
      .from('product_catalog')
      .select(`
        *,
        pricing:product_pricing(
          pricing_id,
          weight,
          price,
          servings,
          display_order
        ),
        categories:product_category_mappings(
          category:product_categories(
            category_id,
            name,
            icon_url,
            display_order
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.availableOnly) {
      query = query.eq('is_available', true);
    }

    if (filters.featuredOnly) {
      query = query.eq('is_featured', true);
    }

    if (filters.searchTerm) {
      query = query.or(`product_name.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Filter by categories if specified (done client-side as it involves joined data)
    let products = data || [];
    if (filters.categories && filters.categories.length > 0) {
      products = products.filter(product => 
        product.categories.some(cm => 
          filters.categories.includes(cm.category?.category_id)
        )
      );
    }

    // Sort pricing options by display_order
    products = products.map(product => ({
      ...product,
      pricing: (product.pricing || []).sort((a, b) => a.display_order - b.display_order)
    }));

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Fetch a single product by ID with all details
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product details
 */
export async function fetchProductById(productId) {
  try {
    const { data, error } = await supabaseClient
      .from('product_catalog')
      .select(`
        *,
        pricing:product_pricing(
          pricing_id,
          weight,
          price,
          servings,
          display_order
        ),
        categories:product_category_mappings(
          category:product_categories(
            category_id,
            name,
            icon_url,
            display_order
          )
        )
      `)
      .eq('product_id', productId)
      .single();

    if (error) throw error;

    // Sort pricing options by display_order
    if (data.pricing) {
      data.pricing = data.pricing.sort((a, b) => a.display_order - b.display_order);
    }

    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

/**
 * Create a new product
 * @param {Object} productData - Product information
 * @param {string} productData.product_name - Product name
 * @param {string} productData.description - Product description
 * @param {string[]} productData.images - Array of image URLs
 * @param {boolean} productData.is_featured - Featured flag
 * @param {boolean} productData.is_available - Availability flag
 * @param {string} productData.allergen_info - Allergen information
 * @param {number} productData.preparation_time_hours - Preparation time in hours
 * @param {string} userId - ID of user creating the product
 * @returns {Promise<Object>} Created product
 */
export async function createProduct(productData, userId) {
  try {
    const { data, error } = await supabaseClient
      .from('product_catalog')
      .insert([{
        product_name: productData.product_name,
        description: productData.description,
        images: productData.images || [],
        is_featured: productData.is_featured || false,
        is_available: productData.is_available !== false, // Default to true
        allergen_info: productData.allergen_info || null,
        preparation_time_hours: productData.preparation_time_hours || 24
      }])
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'product_created',
      table_name: 'product_catalog',
      record_id: data.product_id,
      new_values: productData
    });

    return data;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update an existing product
 * @param {string} productId - Product ID
 * @param {Object} updates - Fields to update
 * @param {string} userId - ID of user updating the product
 * @returns {Promise<Object>} Updated product
 */
export async function updateProduct(productId, updates, userId) {
  try {
    // Fetch old values for audit log
    const { data: oldProduct } = await supabaseClient
      .from('product_catalog')
      .select('*')
      .eq('product_id', productId)
      .single();

    const { data, error } = await supabaseClient
      .from('product_catalog')
      .update(updates)
      .eq('product_id', productId)
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'product_updated',
      table_name: 'product_catalog',
      record_id: productId,
      old_values: oldProduct,
      new_values: updates
    });

    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * Soft delete a product (mark as unavailable)
 * @param {string} productId - Product ID
 * @param {string} userId - ID of user deleting the product
 * @returns {Promise<Object>} Updated product
 */
export async function softDeleteProduct(productId, userId) {
  try {
    // Check if product has active orders
    const { data: activeOrders, error: orderError } = await supabaseClient
      .from('customer_order_items')
      .select('order_id')
      .eq('product_id', productId)
      .limit(1);

    if (orderError) throw orderError;

    if (activeOrders && activeOrders.length > 0) {
      throw new Error('Cannot delete product with active orders. Mark as unavailable instead.');
    }

    const { data, error } = await supabaseClient
      .from('product_catalog')
      .update({ is_available: false })
      .eq('product_id', productId)
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'product_deleted',
      table_name: 'product_catalog',
      record_id: productId
    });

    return data;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Add pricing option to a product
 * @param {string} productId - Product ID
 * @param {Object} pricingData - Pricing information
 * @param {string} pricingData.weight - Weight (e.g., "500g", "1kg")
 * @param {number} pricingData.price - Price in currency
 * @param {string} pricingData.servings - Estimated servings (e.g., "8-10 servings")
 * @param {number} pricingData.display_order - Display order
 * @param {string} userId - ID of user adding the pricing
 * @returns {Promise<Object>} Created pricing option
 */
export async function addProductPricing(productId, pricingData, userId) {
  try {
    const { data, error } = await supabaseClient
      .from('product_pricing')
      .insert([{
        product_id: productId,
        weight: pricingData.weight,
        price: pricingData.price,
        servings: pricingData.servings,
        display_order: pricingData.display_order || 0
      }])
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'pricing_added',
      table_name: 'product_pricing',
      record_id: data.pricing_id,
      new_values: { product_id: productId, ...pricingData }
    });

    return data;
  } catch (error) {
    console.error('Error adding product pricing:', error);
    throw error;
  }
}

/**
 * Update pricing option
 * @param {string} pricingId - Pricing ID
 * @param {Object} updates - Fields to update
 * @param {string} userId - ID of user updating the pricing
 * @returns {Promise<Object>} Updated pricing option
 */
export async function updateProductPricing(pricingId, updates, userId) {
  try {
    const { data, error } = await supabaseClient
      .from('product_pricing')
      .update(updates)
      .eq('pricing_id', pricingId)
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'pricing_updated',
      table_name: 'product_pricing',
      record_id: pricingId,
      new_values: updates
    });

    return data;
  } catch (error) {
    console.error('Error updating product pricing:', error);
    throw error;
  }
}

/**
 * Delete pricing option
 * @param {string} pricingId - Pricing ID
 * @param {string} userId - ID of user deleting the pricing
 * @returns {Promise<void>}
 */
export async function deleteProductPricing(pricingId, userId) {
  try {
    const { error } = await supabaseClient
      .from('product_pricing')
      .delete()
      .eq('pricing_id', pricingId);

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'pricing_deleted',
      table_name: 'product_pricing',
      record_id: pricingId
    });
  } catch (error) {
    console.error('Error deleting product pricing:', error);
    throw error;
  }
}

/**
 * Add category to product
 * @param {string} productId - Product ID
 * @param {string} categoryId - Category ID
 * @param {string} userId - ID of user adding the category
 * @returns {Promise<Object>} Created mapping
 */
export async function addProductCategory(productId, categoryId, userId) {
  try {
    const { data, error } = await supabaseClient
      .from('product_category_mappings')
      .insert([{
        product_id: productId,
        category_id: categoryId
      }])
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'category_added',
      table_name: 'product_category_mappings',
      record_id: data.mapping_id,
      new_values: { product_id: productId, category_id: categoryId }
    });

    return data;
  } catch (error) {
    console.error('Error adding product category:', error);
    throw error;
  }
}

/**
 * Remove category from product
 * @param {string} productId - Product ID
 * @param {string} categoryId - Category ID
 * @param {string} userId - ID of user removing the category
 * @returns {Promise<void>}
 */
export async function removeProductCategory(productId, categoryId, userId) {
  try {
    const { error } = await supabaseClient
      .from('product_category_mappings')
      .delete()
      .eq('product_id', productId)
      .eq('category_id', categoryId);

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'category_removed',
      table_name: 'product_category_mappings',
      new_values: { product_id: productId, category_id: categoryId }
    });
  } catch (error) {
    console.error('Error removing product category:', error);
    throw error;
  }
}

/**
 * Fetch all categories
 * @returns {Promise<Array>} Array of categories
 */
export async function fetchCategories() {
  try {
    const { data, error } = await supabaseClient
      .from('product_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Create a new category
 * @param {Object} categoryData - Category information
 * @param {string} categoryData.name - Category name
 * @param {string} categoryData.icon_url - Icon URL or class
 * @param {number} categoryData.display_order - Display order
 * @param {string} userId - ID of user creating the category
 * @returns {Promise<Object>} Created category
 */
export async function createCategory(categoryData, userId) {
  try {
    const { data, error } = await supabaseClient
      .from('product_categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'category_created',
      table_name: 'product_categories',
      record_id: data.category_id,
      new_values: categoryData
    });

    return data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

/**
 * Update a category
 * @param {string} categoryId - Category ID
 * @param {Object} updates - Fields to update
 * @param {string} userId - ID of user updating the category
 * @returns {Promise<Object>} Updated category
 */
export async function updateCategory(categoryId, updates, userId) {
  try {
    const { data, error } = await supabaseClient
      .from('product_categories')
      .update(updates)
      .eq('category_id', categoryId)
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'category_updated',
      table_name: 'product_categories',
      record_id: categoryId,
      new_values: updates
    });

    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Delete a category
 * @param {string} categoryId - Category ID
 * @param {string} userId - ID of user deleting the category
 * @returns {Promise<void>}
 */
export async function deleteCategory(categoryId, userId) {
  try {
    // Check if category has products
    const { data: products, error: productError } = await supabaseClient
      .from('product_category_mappings')
      .select('product_id')
      .eq('category_id', categoryId)
      .limit(1);

    if (productError) throw productError;

    if (products && products.length > 0) {
      throw new Error('Cannot delete category with associated products. Remove products first.');
    }

    const { error } = await supabaseClient
      .from('product_categories')
      .delete()
      .eq('category_id', categoryId);

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'category_deleted',
      table_name: 'product_categories',
      record_id: categoryId
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

/**
 * Reorder categories
 * @param {Array<{category_id: string, display_order: number}>} categoryOrders - Array of category IDs with new display orders
 * @param {string} userId - ID of user reordering categories
 * @returns {Promise<void>}
 */
export async function reorderCategories(categoryOrders, userId) {
  try {
    // Update each category's display order
    const updates = categoryOrders.map(({ category_id, display_order }) => 
      supabaseClient
        .from('product_categories')
        .update({ display_order })
        .eq('category_id', category_id)
    );

    await Promise.all(updates);

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'categories_reordered',
      table_name: 'product_categories',
      new_values: { category_orders: categoryOrders }
    });
  } catch (error) {
    console.error('Error reordering categories:', error);
    throw error;
  }
}

/**
 * Reorder product images
 * @param {string} productId - Product ID
 * @param {string[]} newImageOrder - Array of image URLs in new order
 * @param {string} userId - ID of user reordering images
 * @returns {Promise<Object>} Updated product
 */
export async function reorderProductImages(productId, newImageOrder, userId) {
  try {
    const { data, error } = await supabaseClient
      .from('product_catalog')
      .update({ images: newImageOrder })
      .eq('product_id', productId)
      .select()
      .single();

    if (error) throw error;

    // Log audit event
    await logAuditEvent({
      user_id: userId,
      action_type: 'images_reordered',
      table_name: 'product_catalog',
      record_id: productId,
      new_values: { images: newImageOrder }
    });

    return data;
  } catch (error) {
    console.error('Error reordering product images:', error);
    throw error;
  }
}

/**
 * Get product statistics
 * @returns {Promise<Object>} Product statistics
 */
export async function getProductStatistics() {
  try {
    const { data: products, error: productError } = await supabaseClient
      .from('product_catalog')
      .select('product_id, is_available, is_featured');

    if (productError) throw productError;

    const { data: categories, error: categoryError } = await supabaseClient
      .from('product_categories')
      .select('category_id');

    if (categoryError) throw categoryError;

    return {
      total: products.length,
      available: products.filter(p => p.is_available).length,
      unavailable: products.filter(p => !p.is_available).length,
      featured: products.filter(p => p.is_featured).length,
      categories: categories.length
    };
  } catch (error) {
    console.error('Error getting product statistics:', error);
    throw error;
  }
}

