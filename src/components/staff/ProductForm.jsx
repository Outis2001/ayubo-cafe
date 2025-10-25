/**
 * Product Form Component
 * 
 * Form for creating and editing products in the catalog.
 * Supports:
 * - Product details (name, description, allergens, prep time)
 * - Multiple image upload with drag-and-drop
 * - Category selection (multi-select)
 * - Multiple pricing options (weight/price/servings)
 * - Featured and availability toggles
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  createProduct,
  updateProduct,
  addProductPricing,
  updateProductPricing,
  deleteProductPricing,
  addProductCategory,
  removeProductCategory,
  fetchCategories
} from '../../utils/productCatalog';
import { X, Plus, Trash2, Upload, Loader, Star } from '../icons';
import {
  uploadProductImage,
  uploadMultipleProductImages,
  validateImageFile,
  createImagePreview,
  deleteProductImage
} from '../../utils/imageUpload';

/**
 * ProductForm Component
 * 
 * @param {Object} props
 * @param {Object} props.product - Existing product to edit (null for new product)
 * @param {Function} props.onClose - Callback to close the form
 * @param {Function} props.onSuccess - Callback when product is saved successfully
 */
const ProductForm = ({ product, onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    allergen_info: '',
    preparation_time_hours: 24,
    is_featured: false,
    is_available: true
  });

  // Images state (array of URLs)
  const [images, setImages] = useState([]);
  const [imageError, setImageError] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreviews, setImagePreviews] = useState([]); // For showing previews before upload

  // Selected categories (array of category IDs)
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Pricing options state
  const [pricingOptions, setPricingOptions] = useState([]);
  const [newPricing, setNewPricing] = useState({
    weight: '',
    price: '',
    servings_estimate: '',
    display_order: 0
  });

  // Track which pricing options are new vs existing (for edit mode)
  const [pricingToDelete, setPricingToDelete] = useState([]);

  /**
   * Load categories on mount
   */
  useEffect(() => {
    loadCategories();
  }, []);

  /**
   * Populate form if editing existing product
   */
  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name || '',
        description: product.description || '',
        allergen_info: product.allergen_info || '',
        preparation_time_hours: product.preparation_time_hours || 24,
        is_featured: product.is_featured || false,
        is_available: product.is_available !== false
      });

      setImages(product.images || []);

      // Extract selected category IDs
      if (product.categories) {
        const categoryIds = product.categories
          .map(cm => cm.category?.category_id)
          .filter(Boolean);
        setSelectedCategories(categoryIds);
      }

      // Extract pricing options
      if (product.pricing) {
        setPricingOptions(product.pricing.map(p => ({
          ...p,
          isExisting: true // Mark as existing for edit mode
        })));
      }
    }
  }, [product]);

  /**
   * Load categories from database
   */
  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  /**
   * Handle category toggle
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
   * Handle file selection (from input or drag-and-drop)
   */
  const handleFileSelection = async (files) => {
    if (!files || files.length === 0) return;

    setImageError('');
    setUploadingImages(true);
    setUploadProgress({ current: 0, total: files.length });

    try {
      // Validate all files first
      const validFiles = [];
      for (const file of files) {
        const validation = validateImageFile(file);
        if (validation.isValid) {
          validFiles.push(file);
        } else {
          console.warn(`Skipping ${file.name}: ${validation.error}`);
        }
      }

      if (validFiles.length === 0) {
        setImageError('No valid image files selected.');
        setUploadingImages(false);
        return;
      }

      // Upload images with progress tracking
      const { results, errors } = await uploadMultipleProductImages(
        validFiles,
        product?.product_id || null,
        (current, total) => setUploadProgress({ current, total })
      );

      // Add uploaded image URLs to state
      if (results.length > 0) {
        const newImageUrls = results.map(r => r.imageUrl);
        setImages(prev => [...prev, ...newImageUrls]);
      }

      // Show errors if any
      if (errors.length > 0) {
        setImageError(`Some images failed to upload: ${errors.map(e => e.file).join(', ')}`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setImageError(error.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  /**
   * Handle drag leave
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * Handle drop
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    handleFileSelection(files);
  };

  /**
   * Remove image
   */
  const handleRemoveImage = async (index) => {
    const imageUrl = images[index];
    
    // If this is an existing product, we can optionally delete from storage
    // For now, just remove from state
    // TODO: Add confirmation dialog for deleting from storage
    
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Move image up in order
   */
  const handleMoveImageUp = (index) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setImages(newImages);
  };

  /**
   * Move image down in order
   */
  const handleMoveImageDown = (index) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    setImages(newImages);
  };

  /**
   * Add pricing option
   */
  const handleAddPricing = () => {
    if (!newPricing.weight || !newPricing.price) {
      alert('Weight and price are required for pricing options.');
      return;
    }

    const pricing = {
      weight: newPricing.weight,
      price: parseFloat(newPricing.price),
      servings_estimate: newPricing.servings_estimate ? parseInt(newPricing.servings_estimate) : null,
      display_order: pricingOptions.length,
      isNew: true // Mark as new
    };

    setPricingOptions(prev => [...prev, pricing]);
    setNewPricing({ weight: '', price: '', servings_estimate: '', display_order: 0 });
  };

  /**
   * Remove pricing option
   */
  const handleRemovePricing = (index) => {
    const pricing = pricingOptions[index];
    
    // If it's an existing pricing, mark for deletion
    if (pricing.isExisting && pricing.pricing_id) {
      setPricingToDelete(prev => [...prev, pricing.pricing_id]);
    }

    setPricingOptions(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Move pricing option up
   */
  const handleMovePricingUp = (index) => {
    if (index === 0) return;
    const newPricing = [...pricingOptions];
    [newPricing[index - 1], newPricing[index]] = [newPricing[index], newPricing[index - 1]];
    // Update display orders
    newPricing.forEach((p, i) => p.display_order = i);
    setPricingOptions(newPricing);
  };

  /**
   * Move pricing option down
   */
  const handleMovePricingDown = (index) => {
    if (index === pricingOptions.length - 1) return;
    const newPricing = [...pricingOptions];
    [newPricing[index], newPricing[index + 1]] = [newPricing[index + 1], newPricing[index]];
    // Update display orders
    newPricing.forEach((p, i) => p.display_order = i);
    setPricingOptions(newPricing);
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    if (!formData.product_name.trim()) {
      setError('Product name is required.');
      return false;
    }

    if (!formData.description.trim()) {
      setError('Product description is required.');
      return false;
    }

    if (pricingOptions.length === 0) {
      setError('At least one pricing option is required.');
      return false;
    }

    if (selectedCategories.length === 0) {
      setError('At least one category must be selected.');
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const productData = {
        ...formData,
        images: images
      };

      let savedProduct;

      if (product) {
        // UPDATE existing product
        savedProduct = await updateProduct(product.product_id, productData, currentUser.user_id);

        // Update pricing options
        // 1. Delete removed pricing options
        for (const pricingId of pricingToDelete) {
          await deleteProductPricing(pricingId, currentUser.user_id);
        }

        // 2. Update existing pricing options (order might have changed)
        for (const pricing of pricingOptions.filter(p => p.isExisting)) {
          await updateProductPricing(pricing.pricing_id, {
            weight: pricing.weight,
            price: pricing.price,
            servings_estimate: pricing.servings_estimate,
            display_order: pricing.display_order
          }, currentUser.user_id);
        }

        // 3. Add new pricing options
        for (const pricing of pricingOptions.filter(p => p.isNew)) {
          await addProductPricing(product.product_id, {
            weight: pricing.weight,
            price: pricing.price,
            servings_estimate: pricing.servings_estimate,
            display_order: pricing.display_order
          }, currentUser.user_id);
        }

        // Update categories
        // Get current categories from product
        const currentCategoryIds = product.categories
          ? product.categories.map(cm => cm.category?.category_id).filter(Boolean)
          : [];

        // Find categories to add and remove
        const categoriesToAdd = selectedCategories.filter(id => !currentCategoryIds.includes(id));
        const categoriesToRemove = currentCategoryIds.filter(id => !selectedCategories.includes(id));

        // Add new categories
        for (const categoryId of categoriesToAdd) {
          await addProductCategory(product.product_id, categoryId, currentUser.user_id);
        }

        // Remove deselected categories
        for (const categoryId of categoriesToRemove) {
          await removeProductCategory(product.product_id, categoryId, currentUser.user_id);
        }

      } else {
        // CREATE new product
        savedProduct = await createProduct(productData, currentUser.user_id);

        // Add pricing options
        for (const pricing of pricingOptions) {
          await addProductPricing(savedProduct.product_id, {
            weight: pricing.weight,
            price: pricing.price,
            servings_estimate: pricing.servings_estimate,
            display_order: pricing.display_order
          }, currentUser.user_id);
        }

        // Add categories
        for (const categoryId of selectedCategories) {
          await addProductCategory(savedProduct.product_id, categoryId, currentUser.user_id);
        }
      }

      // Success!
      if (onSuccess) {
        onSuccess(savedProduct);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error.message || 'Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => handleInputChange('product_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Chocolate Birthday Cake"
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the product..."
                rows={4}
                disabled={loading}
                required
              />
            </div>

            {/* Images Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images
              </label>
              <div className="space-y-2">
                {/* Image List */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {images.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Product ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-300"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMoveImageUp(index)}
                            disabled={index === 0 || uploadingImages}
                            className="px-2 py-1 bg-white text-gray-700 rounded text-xs disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImageDown(index)}
                            disabled={index === images.length - 1 || uploadingImages}
                            className="px-2 py-1 bg-white text-gray-700 rounded text-xs disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            disabled={uploadingImages}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drag-and-Drop Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${uploadingImages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileInputChange}
                    disabled={uploadingImages || loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  
                  {uploadingImages ? (
                    <div className="space-y-3">
                      <Loader className="animate-spin mx-auto text-blue-600" size={32} />
                      <div>
                        <p className="text-gray-700 font-medium">Uploading images...</p>
                        <p className="text-sm text-gray-600">
                          {uploadProgress.current} of {uploadProgress.total}
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300"
                          style={{
                            width: `${(uploadProgress.current / uploadProgress.total) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto text-gray-400" size={48} />
                      <div>
                        <p className="text-gray-700 font-medium">
                          {isDragging ? 'Drop images here' : 'Drag and drop images here'}
                        </p>
                        <p className="text-sm text-gray-500">
                          or click to browse
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Supports: JPG, PNG, WebP (Max 10MB each)
                      </p>
                    </div>
                  )}
                </div>
                
                {imageError && (
                  <p className="text-sm text-red-600">{imageError}</p>
                )}
                <p className="text-xs text-gray-500">
                  First image will be the primary image. Use arrow buttons to reorder.
                </p>
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories <span className="text-red-500">*</span>
              </label>
              {loadingCategories ? (
                <p className="text-gray-500">Loading categories...</p>
              ) : categories.length === 0 ? (
                <p className="text-gray-500">No categories available. Create categories first.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category.category_id}
                      type="button"
                      onClick={() => toggleCategory(category.category_id)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        selectedCategories.includes(category.category_id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.category_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing Options <span className="text-red-500">*</span>
              </label>
              
              {/* Existing Pricing Options */}
              {pricingOptions.length > 0 && (
                <div className="space-y-2 mb-4">
                  {pricingOptions.map((pricing, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Weight:</span> {pricing.weight}
                        </div>
                        <div>
                          <span className="font-medium">Price:</span> Rs. {parseFloat(pricing.price).toFixed(2)}
                        </div>
                        <div>
                          <span className="font-medium">Servings:</span> {pricing.servings_estimate || 'N/A'}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleMovePricingUp(index)}
                          disabled={index === 0 || loading}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePricingDown(index)}
                          disabled={index === pricingOptions.length - 1 || loading}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePricing(index)}
                          disabled={loading}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Pricing Option */}
              <div className="border border-gray-300 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Add Pricing Option</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <input
                      type="text"
                      value={newPricing.weight}
                      onChange={(e) => setNewPricing(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="e.g., 500g, 1kg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={newPricing.price}
                      onChange={(e) => setNewPricing(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="Price (Rs.)"
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={newPricing.servings_estimate}
                      onChange={(e) => setNewPricing(prev => ({ ...prev, servings_estimate: e.target.value }))}
                      placeholder="Servings"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={loading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPricing}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Allergen Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allergen Information
              </label>
              <input
                type="text"
                value={formData.allergen_info}
                onChange={(e) => handleInputChange('allergen_info', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Contains eggs, dairy, nuts"
                disabled={loading}
              />
            </div>

            {/* Preparation Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preparation Time (hours) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.preparation_time_hours}
                onChange={(e) => handleInputChange('preparation_time_hours', parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                disabled={loading}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum hours needed to prepare this product
              </p>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Featured Toggle */}
              <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                <div className="flex items-center gap-2">
                  <Star size={20} className="text-yellow-500" />
                  <div>
                    <div className="font-medium text-gray-800">Featured Product</div>
                    <div className="text-xs text-gray-600">Show in featured section</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                    className="sr-only peer"
                    disabled={loading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Available Toggle */}
              <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800">Available for Order</div>
                  <div className="text-xs text-gray-600">Customers can see and order</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => handleInputChange('is_available', e.target.checked)}
                    className="sr-only peer"
                    disabled={loading}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Saving...
                </>
              ) : (
                <>Save Product</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;

