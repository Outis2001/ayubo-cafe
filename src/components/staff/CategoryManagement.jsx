/**
 * Category Management Component
 * 
 * Modal component for managing product categories:
 * - Create new categories
 * - Edit existing categories
 * - Delete categories (with validation)
 * - Reorder categories (display order)
 * - Upload category icons
 * 
 * @component
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} from '../../utils/productCatalog';
import { uploadProductImage } from '../../utils/imageUpload';
import { X, Plus, Trash2, Edit, Upload, Loader, Save } from '../icons';

/**
 * CategoryManagement Component
 * 
 * @param {Object} props
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.onUpdate - Callback when categories are updated
 */
const CategoryManagement = ({ onClose, onUpdate }) => {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    category_name: '',
    category_icon: '',
    display_order: 0
  });
  const [formError, setFormError] = useState('');
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Deletion state
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  /**
   * Load categories on mount
   */
  useEffect(() => {
    loadCategories();
  }, []);

  /**
   * Load categories from database
   */
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Open form for creating new category
   */
  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({
      category_name: '',
      category_icon: '',
      display_order: categories.length
    });
    setFormError('');
    setShowForm(true);
  };

  /**
   * Open form for editing existing category
   */
  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setFormData({
      category_name: category.name,
      category_icon: category.icon_url || '',
      display_order: category.display_order
    });
    setFormError('');
    setShowForm(true);
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFormError('');
  };

  /**
   * Handle icon upload
   */
  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingIcon(true);
      setFormError('');

      const result = await uploadProductImage(file, null);
      setFormData(prev => ({ ...prev, category_icon: result.imageUrl }));
    } catch (error) {
      console.error('Error uploading icon:', error);
      setFormError(error.message || 'Failed to upload icon. Please try again.');
    } finally {
      setUploadingIcon(false);
    }
  };

  /**
   * Validate form
   */
  const validateForm = () => {
    if (!formData.category_name.trim()) {
      setFormError('Category name is required.');
      return false;
    }

    // Check for duplicate names (excluding current category when editing)
    const duplicate = categories.find(
      c => c.name.toLowerCase() === formData.category_name.toLowerCase().trim() &&
           c.category_id !== editingCategory?.category_id
    );

    if (duplicate) {
      setFormError('A category with this name already exists.');
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const categoryData = {
        name: formData.category_name.trim(),
        icon_url: formData.category_icon || null,
        display_order: formData.display_order
      };

      if (editingCategory) {
        // Update existing category
        await updateCategory(editingCategory.category_id, categoryData, currentUser.user_id);
      } else {
        // Create new category
        await createCategory(categoryData, currentUser.user_id);
      }

      // Reload categories
      await loadCategories();
      setShowForm(false);
      setEditingCategory(null);

      // Notify parent
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving category:', error);
      setFormError(error.message || 'Failed to save category. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle category deletion
   */
  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"?\n\nThis will fail if any products are assigned to this category.`)) {
      return;
    }

    try {
      setDeletingCategoryId(categoryId);
      setError('');

      await deleteCategory(categoryId, currentUser.user_id);

      // Reload categories
      await loadCategories();

      // Notify parent
      if (onUpdate) {
        onUpdate();
      }

      alert('Category deleted successfully.');
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error.message || 'Failed to delete category. It may have products assigned to it.');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  /**
   * Move category up in display order
   */
  const handleMoveCategoryUp = async (index) => {
    if (index === 0) return;

    const newCategories = [...categories];
    [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];

    // Update display orders
    const categoryOrders = newCategories.map((cat, i) => ({
      category_id: cat.category_id,
      display_order: i
    }));

    try {
      setCategories(newCategories);
      await reorderCategories(categoryOrders, currentUser.user_id);

      // Notify parent
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error reordering categories:', error);
      setError('Failed to reorder categories. Please try again.');
      // Reload to revert
      await loadCategories();
    }
  };

  /**
   * Move category down in display order
   */
  const handleMoveCategoryDown = async (index) => {
    if (index === categories.length - 1) return;

    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];

    // Update display orders
    const categoryOrders = newCategories.map((cat, i) => ({
      category_id: cat.category_id,
      display_order: i
    }));

    try {
      setCategories(newCategories);
      await reorderCategories(categoryOrders, currentUser.user_id);

      // Notify parent
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error reordering categories:', error);
      setError('Failed to reorder categories. Please try again.');
      // Reload to revert
      await loadCategories();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manage Categories</h2>
            <p className="text-sm text-gray-600 mt-1">
              Organize your product catalog with categories
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={saving}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Add Category Button */}
          {!showForm && (
            <button
              onClick={handleAddCategory}
              disabled={loading}
              className="w-full mb-4 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} />
              Add New Category
            </button>
          )}

          {/* Category Form */}
          {showForm && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form Error */}
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{formError}</p>
                  </div>
                )}

                {/* Category Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.category_name}
                    onChange={(e) => handleInputChange('category_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Birthday Cakes, Wedding Cakes"
                    disabled={saving}
                    required
                  />
                </div>

                {/* Category Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Icon (Optional)
                  </label>

                  {/* Current Icon Preview */}
                  {formData.category_icon && (
                    <div className="mb-3">
                      <img
                        src={formData.category_icon}
                        alt="Category icon"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex gap-2">
                    <label className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleIconUpload}
                        disabled={uploadingIcon || saving}
                        className="hidden"
                      />
                      <div className={`px-4 py-2 border border-gray-300 rounded-lg text-center cursor-pointer transition-colors ${
                        uploadingIcon || saving
                          ? 'bg-gray-100 cursor-not-allowed'
                          : 'hover:bg-gray-50'
                      }`}>
                        {uploadingIcon ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader className="animate-spin" size={16} />
                            Uploading...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Upload size={16} />
                            {formData.category_icon ? 'Change Icon' : 'Upload Icon'}
                          </span>
                        )}
                      </div>
                    </label>

                    {/* Clear Icon */}
                    {formData.category_icon && !uploadingIcon && (
                      <button
                        type="button"
                        onClick={() => handleInputChange('category_icon', '')}
                        disabled={saving}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Square images work best (e.g., 200x200px)
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCategory(null);
                      setFormError('');
                    }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || uploadingIcon}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader className="animate-spin" size={16} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {editingCategory ? 'Update' : 'Create'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading categories...</p>
            </div>
          )}

          {/* Categories List */}
          {!loading && categories.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No categories yet.</p>
              <p className="text-sm text-gray-500 mt-1">Create your first category to get started.</p>
            </div>
          )}

          {!loading && categories.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Categories ({categories.length})
                </h3>
                <p className="text-xs text-gray-500">
                  Use arrows to reorder
                </p>
              </div>

              {categories.map((category, index) => (
                <div
                  key={category.category_id}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  {/* Category Icon */}
                  <div className="w-12 h-12 flex-shrink-0">
                    {category.icon_url ? (
                      <img
                        src={category.icon_url}
                        alt={category.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                        No Icon
                      </div>
                    )}
                  </div>

                  {/* Category Info */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{category.name}</div>
                    <div className="text-xs text-gray-500">Order: {category.display_order}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1">
                    {/* Move Up */}
                    <button
                      onClick={() => handleMoveCategoryUp(index)}
                      disabled={index === 0 || saving}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      ↑
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => handleMoveCategoryDown(index)}
                      disabled={index === categories.length - 1 || saving}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      ↓
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEditCategory(category)}
                      disabled={saving || showForm}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteCategory(category.category_id, category.name)}
                      disabled={deletingCategoryId === category.category_id || saving || showForm}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      {deletingCategoryId === category.category_id ? (
                        <Loader className="animate-spin" size={14} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            disabled={saving}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;

