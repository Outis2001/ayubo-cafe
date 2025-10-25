/**
 * Image Upload Utilities
 * 
 * Handles image upload to Supabase Storage with:
 * - File validation (type, size)
 * - Image compression
 * - Thumbnail generation
 * - Upload to Supabase Storage bucket
 * - URL generation
 */

import { supabaseClient } from '../config/supabase';

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const STORAGE_BUCKET = 'product-images';
const MAX_IMAGE_WIDTH = 1200; // Max width for full-size images
const MAX_IMAGE_HEIGHT = 1200; // Max height for full-size images
const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 300;
const COMPRESSION_QUALITY = 0.85; // JPEG quality (0-1)

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} { isValid: boolean, error: string }
 */
export function validateImageFile(file) {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    };
  }

  return { isValid: true };
}

/**
 * Load image from file
 * @param {File} file - Image file
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Resize and compress image
 * @param {HTMLImageElement} img - Image element
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<Blob>}
 */
function resizeImage(img, maxWidth, maxHeight, quality = COMPRESSION_QUALITY) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/jpeg',
        quality
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate thumbnail from image
 * @param {HTMLImageElement} img - Image element
 * @returns {Promise<Blob>}
 */
async function generateThumbnail(img) {
  return resizeImage(img, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, 0.8);
}

/**
 * Upload blob to Supabase Storage
 * @param {Blob} blob - Image blob
 * @param {string} path - Storage path
 * @returns {Promise<string>} Public URL
 */
async function uploadToStorage(blob, path) {
  try {
    const { data, error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Generate unique filename
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension
 * @returns {string}
 */
function generateUniqueFilename(prefix = 'product', extension = 'jpg') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
}

/**
 * Upload product image with compression and thumbnail
 * @param {File} file - Image file
 * @param {string} productId - Product ID (optional, for organizing files)
 * @returns {Promise<Object>} { imageUrl, thumbnailUrl }
 */
export async function uploadProductImage(file, productId = null) {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    // Load image
    const img = await loadImage(file);

    // Generate filenames
    const baseFilename = generateUniqueFilename('product');
    const thumbnailFilename = generateUniqueFilename('thumb');

    // Determine storage paths
    const folder = productId ? `products/${productId}` : 'products/temp';
    const imagePath = `${folder}/${baseFilename}`;
    const thumbnailPath = `${folder}/${thumbnailFilename}`;

    // Resize and compress main image
    const imageBlob = await resizeImage(img, MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT);

    // Generate thumbnail
    const thumbnailBlob = await generateThumbnail(img);

    // Upload both images
    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadToStorage(imageBlob, imagePath),
      uploadToStorage(thumbnailBlob, thumbnailPath)
    ]);

    return {
      imageUrl,
      thumbnailUrl,
      width: img.width,
      height: img.height,
      size: file.size,
      originalName: file.name
    };
  } catch (error) {
    console.error('Error uploading product image:', error);
    throw error;
  }
}

/**
 * Upload multiple product images
 * @param {File[]} files - Array of image files
 * @param {string} productId - Product ID (optional)
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Array>} Array of { imageUrl, thumbnailUrl }
 */
export async function uploadMultipleProductImages(files, productId = null, onProgress = null) {
  const results = [];
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadProductImage(files[i], productId);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`Error uploading file ${i + 1}:`, error);
      errors.push({ file: files[i].name, error: error.message });
    }
  }

  if (errors.length > 0 && results.length === 0) {
    throw new Error(`Failed to upload all images. Errors: ${errors.map(e => e.error).join(', ')}`);
  }

  return { results, errors };
}

/**
 * Delete image from storage
 * @param {string} imageUrl - Full image URL
 * @returns {Promise<void>}
 */
export async function deleteProductImage(imageUrl) {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split(`/${STORAGE_BUCKET}/`);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid image URL');
    }

    const path = pathParts[1];

    const { error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Create image preview data URL from file
 * @param {File} file - Image file
 * @returns {Promise<string>} Data URL
 */
export function createImagePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Batch delete images
 * @param {string[]} imageUrls - Array of image URLs
 * @returns {Promise<Object>} { deleted: number, failed: number, errors: Array }
 */
export async function deleteMultipleProductImages(imageUrls) {
  const results = {
    deleted: 0,
    failed: 0,
    errors: []
  };

  for (const url of imageUrls) {
    try {
      await deleteProductImage(url);
      results.deleted++;
    } catch (error) {
      results.failed++;
      results.errors.push({ url, error: error.message });
    }
  }

  return results;
}

/**
 * Get image dimensions from file
 * @param {File} file - Image file
 * @returns {Promise<Object>} { width, height }
 */
export async function getImageDimensions(file) {
  const img = await loadImage(file);
  return {
    width: img.width,
    height: img.height
  };
}

/**
 * Check if storage bucket exists and is accessible
 * @returns {Promise<boolean>}
 */
export async function checkStorageAccess() {
  try {
    const { data, error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .list('', { limit: 1 });

    return !error;
  } catch (error) {
    console.error('Storage access check failed:', error);
    return false;
  }
}

