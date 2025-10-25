/**
 * Customer Profile Component
 * 
 * Displays and allows editing of customer profile information.
 * 
 * Features:
 * - View profile information
 * - Edit name, email, birthday, address
 * - Change phone number with OTP verification
 * - Profile image upload
 * - Form validation
 * - Success/error messages
 */

import { useState, useEffect } from 'react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import {
  updateCustomerProfile,
  requestPhoneChange,
  verifyPhoneChange,
} from '../../utils/customerAuth';
import { validatePhone, validateEmail } from '../../utils/phoneValidation';
import { uploadImage } from '../../utils/imageUpload';
import { Loader } from '../icons';

const CustomerProfile = () => {
  const { customer, refreshCustomer } = useCustomerAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');
  const [address, setAddress] = useState('');

  // Phone change
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Profile image
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (customer) {
      // Initialize form with customer data
      setFirstName(customer.first_name || '');
      setLastName(customer.last_name || '');
      setEmail(customer.email || '');
      setBirthday(customer.birthday || '');
      setAddress(customer.default_address || '');
      setImagePreview(customer.profile_image_url || null);
    }
  }, [customer]);

  useEffect(() => {
    // Countdown timer for OTP resend
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel edit - reset form
      setFirstName(customer.first_name || '');
      setLastName(customer.last_name || '');
      setEmail(customer.email || '');
      setBirthday(customer.birthday || '');
      setAddress(customer.default_address || '');
      setProfileImage(null);
      setImagePreview(customer.profile_image_url || null);
      setError(null);
    }
    setIsEditing(!isEditing);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }

      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate email if provided
      if (email && !validateEmail(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      let profileImageUrl = customer.profile_image_url;

      // Upload profile image if changed
      if (profileImage) {
        setUploadingImage(true);
        const uploadResult = await uploadImage(profileImage, 'profile-images');
        
        if (uploadResult.success) {
          profileImageUrl = uploadResult.publicUrl;
        } else {
          setError('Failed to upload profile image');
          setLoading(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      // Update profile
      const result = await updateCustomerProfile(customer.customer_id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || null,
        birthday: birthday || null,
        default_address: address.trim() || null,
        profile_image_url: profileImageUrl,
      });

      if (result.success) {
        setSuccess('Profile updated successfully');
        setIsEditing(false);
        setProfileImage(null);

        // Refresh customer data
        await refreshCustomer();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Customer Profile] Error saving profile:', err);
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPhoneChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate phone number
    if (!validatePhone(newPhone)) {
      setError('Please enter a valid phone number (+94XXXXXXXXX)');
      return;
    }

    if (newPhone === customer.phone_number) {
      setError('New phone number is same as current phone number');
      return;
    }

    setLoading(true);

    try {
      const result = await requestPhoneChange(customer.customer_id, newPhone);

      if (result.success) {
        setOtpSent(true);
        setCountdown(60);
        setSuccess('OTP sent to your new phone number');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Customer Profile] Error requesting phone change:', err);
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!otp.trim()) {
      setError('Please enter OTP code');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyPhoneChange(customer.customer_id, newPhone, otp);

      if (result.success) {
        setSuccess('Phone number updated successfully');
        setIsChangingPhone(false);
        setNewPhone('');
        setOtp('');
        setOtpSent(false);

        // Refresh customer data
        await refreshCustomer();
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('[Customer Profile] Error verifying phone change:', err);
      setError('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPhoneChange = () => {
    setIsChangingPhone(false);
    setNewPhone('');
    setOtp('');
    setOtpSent(false);
    setError(null);
    setSuccess(null);
  };

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800">Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          My Profile
        </h1>
        <p className="text-gray-600">
          Manage your personal information
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Profile Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
          {!isEditing && (
            <button
              onClick={handleEditToggle}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        <form onSubmit={handleSaveProfile}>
          {/* Profile Image */}
          <div className="mb-6 flex flex-col items-center">
            <div className="relative">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}

              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {uploadingImage && (
              <p className="text-sm text-blue-600 mt-2">Uploading image...</p>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={!isEditing}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={customer.phone_number}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              {!isChangingPhone && (
                <button
                  type="button"
                  onClick={() => setIsChangingPhone(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                >
                  Change phone number
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Birthday
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!isEditing}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 resize-none"
            />
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleEditToggle}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingImage}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Phone Change Section */}
      {isChangingPhone && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Phone Number</h2>

          {!otpSent ? (
            <form onSubmit={handleRequestPhoneChange}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Phone Number
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+94XXXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your new phone number in international format (+94XXXXXXXXX)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelPhoneChange}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneChange}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  OTP sent to {newPhone}
                </p>
              </div>

              {countdown > 0 ? (
                <p className="text-sm text-gray-600 mb-4 text-center">
                  Resend OTP in {countdown} seconds
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestPhoneChange}
                  disabled={loading}
                  className="w-full mb-4 text-sm text-blue-600 hover:text-blue-700"
                >
                  Resend OTP
                </button>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelPhoneChange}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;

