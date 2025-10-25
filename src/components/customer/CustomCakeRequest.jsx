/**
 * Custom Cake Request Form
 * 
 * Customer-facing form for requesting custom cake designs.
 * Allows customers to upload reference images and specify requirements.
 * 
 * Features:
 * - Image upload for reference design
 * - Customer notes (occasion, age, colors, writing)
 * - Pickup date and time selection
 * - Form validation
 * - Integration with custom_cake_requests table
 */

import { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { supabaseClient } from '../../config/supabase';
import { validatePickupDate, getBlockedDates } from '../../utils/orderHolds';
import { logAuditEvent } from '../../utils/auditLog';
import { Loader } from '../icons';

const CustomCakeRequest = ({ onSuccess, onCancel }) => {
  const { currentCustomer, isAuthenticated } = useCustomerAuth();

  // Form state
  const [formData, setFormData] = useState({
    occasion: '',
    age: '',
    colors: '',
    writing: '',
    additionalNotes: '',
    pickupDate: '',
    pickupTime: '',
  });

  // Image upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  // Configuration and validation state
  const [config, setConfig] = useState({
    minAdvanceDays: 3,
    maxAdvanceDays: 60,
    timeSlots: [],
  });
  const [blockedDates, setBlockedDates] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch configuration and blocked dates
  useEffect(() => {
    fetchConfiguration();
    fetchBlockedDates();
  }, []);

  const fetchConfiguration = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('system_configuration')
        .select('config_key, config_value')
        .in('config_key', ['min_advance_order_days', 'max_advance_order_days', 'pickup_time_slots']);

      if (error) throw error;

      const configMap = {};
      data.forEach(item => {
        configMap[item.config_key] = item.config_value;
      });

      setConfig({
        minAdvanceDays: parseInt(configMap.min_advance_order_days) || 3,
        maxAdvanceDays: parseInt(configMap.max_advance_order_days) || 60,
        timeSlots: JSON.parse(configMap.pickup_time_slots || '[]'),
      });
    } catch (error) {
      console.error('[Custom Request] Error fetching config:', error);
      // Use defaults if fetch fails
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const result = await getBlockedDates();
      if (result.success) {
        setBlockedDates(result.dates);
      }
    } catch (error) {
      console.error('[Custom Request] Error fetching blocked dates:', error);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        image: 'Please upload a JPG or PNG image',
      }));
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        image: 'Image must be less than 10MB',
      }));
      return;
    }

    // Clear any previous errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.image;
      return newErrors;
    });

    // Set file and create preview
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setSelectedImage(null);
    // Reset file input
    const fileInput = document.getElementById('imageUpload');
    if (fileInput) fileInput.value = '';
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.occasion.trim()) {
      newErrors.occasion = 'Occasion is required';
    }

    if (!formData.pickupDate) {
      newErrors.pickupDate = 'Pickup date is required';
    } else {
      // Validate pickup date
      const dateValidation = validatePickupDate(
        formData.pickupDate,
        config.minAdvanceDays,
        config.maxAdvanceDays,
        blockedDates
      );

      if (!dateValidation.isValid) {
        newErrors.pickupDate = dateValidation.error;
      }
    }

    if (!formData.pickupTime) {
      newErrors.pickupTime = 'Pickup time is required';
    }

    // Optional but validate format if provided
    if (formData.age && (isNaN(formData.age) || parseInt(formData.age) < 1 || parseInt(formData.age) > 150)) {
      newErrors.age = 'Please enter a valid age';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setErrors({ submit: 'Please log in to submit a custom request' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${currentCustomer.customer_id}_${Date.now()}.${fileExt}`;
        const filePath = `custom-requests/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('product-images')
          .upload(filePath, imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: urlData } = supabaseClient
          .storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      // Create custom request
      const requestData = {
        customer_id: currentCustomer.customer_id,
        occasion: formData.occasion,
        age: formData.age ? parseInt(formData.age) : null,
        colors: formData.colors || null,
        writing_text: formData.writing || null,
        additional_notes: formData.additionalNotes || null,
        reference_image_url: imageUrl,
        pickup_date: formData.pickupDate,
        pickup_time: formData.pickupTime,
        status: 'pending_review',
      };

      const { data: requestRecord, error: insertError } = await supabaseClient
        .from('custom_cake_requests')
        .insert([requestData])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      console.log('[Custom Request] Request created:', requestRecord);

      // Log audit event
      await logAuditEvent({
        action: 'custom_request_created',
        target_type: 'custom_cake_request',
        target_id: requestRecord.request_id,
        details: {
          customer_id: currentCustomer.customer_id,
          pickup_date: formData.pickupDate,
          occasion: formData.occasion,
        },
        status: 'success',
      });

      // Call success callback
      if (onSuccess) {
        onSuccess({
          requestId: requestRecord.request_id,
          requestNumber: requestRecord.request_number,
        });
      }

      // Reset form
      setFormData({
        occasion: '',
        age: '',
        colors: '',
        writing: '',
        additionalNotes: '',
        pickupDate: '',
        pickupTime: '',
      });
      handleRemoveImage();

    } catch (error) {
      console.error('[Custom Request] Error submitting request:', error);
      setErrors({
        submit: error.message || 'Failed to submit request. Please try again.',
      });

      await logAuditEvent({
        action: 'custom_request_failed',
        target_type: 'custom_cake_request',
        target_id: null,
        details: {
          customer_id: currentCustomer.customer_id,
          error: error.message,
        },
        status: 'failure',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Get minimum date (today + min advance days)
  const getMinDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + config.minAdvanceDays);
    return today.toISOString().split('T')[0];
  };

  // Get maximum date (today + max advance days)
  const getMaxDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + config.maxAdvanceDays);
    return today.toISOString().split('T')[0];
  };

  // Check if date is blocked
  const isDateDisabled = (dateString) => {
    return blockedDates.includes(dateString);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Request Custom Cake
        </h1>
        <p className="text-gray-600">
          Tell us about your dream cake and we'll create a quote for you
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Reference Image (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload a photo of your desired cake design (JPG or PNG, max 10MB)
          </p>

          {!imagePreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                id="imageUpload"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageSelect}
                className="hidden"
              />
              <label
                htmlFor="imageUpload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-gray-400 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-blue-600 font-medium hover:text-blue-700">
                  Click to upload image
                </span>
                <span className="text-sm text-gray-500 mt-1">
                  or drag and drop
                </span>
              </label>
            </div>
          ) : (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                aria-label="Remove image"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {errors.image && (
            <p className="text-red-600 text-sm mt-2">{errors.image}</p>
          )}
        </div>

        {/* Customer Notes Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Cake Details
          </h2>

          {/* Occasion */}
          <div>
            <label
              htmlFor="occasion"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Occasion <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="occasion"
              name="occasion"
              value={formData.occasion}
              onChange={handleInputChange}
              placeholder="e.g., Birthday, Wedding, Anniversary"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.occasion ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.occasion && (
              <p className="text-red-600 text-sm mt-1">{errors.occasion}</p>
            )}
          </div>

          {/* Age */}
          <div>
            <label
              htmlFor="age"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Age (Optional)
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="e.g., 25"
              min="1"
              max="150"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.age ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.age && (
              <p className="text-red-600 text-sm mt-1">{errors.age}</p>
            )}
          </div>

          {/* Colors */}
          <div>
            <label
              htmlFor="colors"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Preferred Colors (Optional)
            </label>
            <input
              type="text"
              id="colors"
              name="colors"
              value={formData.colors}
              onChange={handleInputChange}
              placeholder="e.g., Pink and Gold, Blue and White"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Writing/Text */}
          <div>
            <label
              htmlFor="writing"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Text/Writing on Cake (Optional)
            </label>
            <input
              type="text"
              id="writing"
              name="writing"
              value={formData.writing}
              onChange={handleInputChange}
              placeholder="e.g., Happy Birthday Sarah!"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label
              htmlFor="additionalNotes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Additional Notes (Optional)
            </label>
            <textarea
              id="additionalNotes"
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleInputChange}
              rows={4}
              placeholder="Any special requests or dietary requirements..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* Pickup Details Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pickup Details
          </h2>

          {/* Pickup Date */}
          <div>
            <label
              htmlFor="pickupDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pickup Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="pickupDate"
              name="pickupDate"
              value={formData.pickupDate}
              onChange={handleInputChange}
              min={getMinDate()}
              max={getMaxDate()}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.pickupDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.pickupDate && (
              <p className="text-red-600 text-sm mt-1">{errors.pickupDate}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Custom cakes require at least {config.minAdvanceDays} days advance notice
            </p>
          </div>

          {/* Pickup Time */}
          <div>
            <label
              htmlFor="pickupTime"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pickup Time <span className="text-red-500">*</span>
            </label>
            <select
              id="pickupTime"
              name="pickupTime"
              value={formData.pickupTime}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.pickupTime ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a time</option>
              {config.timeSlots.map((slot, index) => (
                <option key={index} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
            {errors.pickupTime && (
              <p className="text-red-600 text-sm mt-1">{errors.pickupTime}</p>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || !isAuthenticated}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> After submitting your request, our team will review it and send you a quote within 3 hours. You'll receive a notification when your quote is ready.
          </p>
        </div>
      </form>
    </div>
  );
};

export default CustomCakeRequest;

