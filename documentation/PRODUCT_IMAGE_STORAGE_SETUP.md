# Product Image Storage Setup Guide

This guide explains how to set up Supabase Storage for product catalog images.

## Overview

The product catalog uses Supabase Storage to store product images with automatic compression and thumbnail generation. Images are organized in a dedicated bucket with proper access policies.

## Storage Bucket Setup

### 1. Create Storage Bucket

In your Supabase dashboard:

1. Navigate to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Enter the following details:
   - **Name**: `product-images`
   - **Public bucket**: ✅ **Enabled** (images need to be publicly accessible)
   - **File size limit**: 10 MB (optional but recommended)
4. Click **"Create bucket"**

### 2. Bucket Folder Structure

The system automatically organizes images in the following structure:

```
product-images/
├── products/
│   ├── temp/                    # Temporary uploads (before product is created)
│   │   ├── product_1234567890_abc123.jpg
│   │   └── thumb_1234567890_xyz789.jpg
│   ├── {product-id-1}/          # Images for specific product
│   │   ├── product_1234567890_abc123.jpg
│   │   └── thumb_1234567890_xyz789.jpg
│   └── {product-id-2}/
│       └── ...
```

### 3. Storage Policies (Optional - Already Public)

Since the bucket is public, all images are accessible by default. No additional RLS policies are needed.

If you want to restrict uploads to authenticated users only:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Public read access (already enabled via public bucket)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

## Image Processing Features

### Automatic Compression

- **Max dimensions**: 1200x1200 pixels
- **Format**: JPEG (regardless of input format)
- **Quality**: 85% (configurable in `src/utils/imageUpload.js`)
- **Result**: Optimized images typically 200-500KB

### Thumbnail Generation

- **Dimensions**: 300x300 pixels
- **Format**: JPEG
- **Quality**: 80%
- **Use case**: Product cards, list views

### Supported Formats

**Input formats**:
- JPEG / JPG
- PNG
- WebP

**Output format**: Always JPEG (for consistency and smaller file sizes)

## File Size Limits

- **Maximum upload size**: 10 MB per file
- **Recommended size**: < 5 MB per file for best performance
- **Automatic compression**: Reduces file sizes by 60-80% on average

## Usage in Application

### Upload Single Image

```javascript
import { uploadProductImage } from '../utils/imageUpload';

const result = await uploadProductImage(file, productId);
// Returns: { imageUrl, thumbnailUrl, width, height, size, originalName }
```

### Upload Multiple Images

```javascript
import { uploadMultipleProductImages } from '../utils/imageUpload';

const { results, errors } = await uploadMultipleProductImages(
  files,
  productId,
  (current, total) => {
    console.log(`Uploading ${current} of ${total}`);
  }
);
```

### Delete Image

```javascript
import { deleteProductImage } from '../utils/imageUpload';

await deleteProductImage(imageUrl);
```

## Configuration

Configuration options are in `src/utils/imageUpload.js`:

```javascript
const MAX_FILE_SIZE = 10 * 1024 * 1024;      // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const STORAGE_BUCKET = 'product-images';
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_HEIGHT = 1200;
const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_HEIGHT = 300;
const COMPRESSION_QUALITY = 0.85;
```

## Troubleshooting

### Issue: "Failed to upload image"

**Possible causes**:
1. Storage bucket doesn't exist
2. Bucket is not public
3. File size exceeds limit
4. Invalid file type

**Solution**:
- Verify bucket exists and is named `product-images`
- Check bucket is set to public
- Ensure file is < 10MB
- Use supported image formats only

### Issue: Images not displaying

**Possible causes**:
1. Public access not enabled
2. CORS configuration needed

**Solution**:
- Enable public access on bucket
- Add CORS configuration in Supabase if needed:
  ```json
  {
    "allowedOrigins": ["*"],
    "allowedMethods": ["GET", "HEAD"],
    "allowedHeaders": ["*"],
    "maxAge": 3600
  }
  ```

### Issue: Upload is slow

**Possible causes**:
1. Large file sizes
2. Slow internet connection
3. Multiple simultaneous uploads

**Solution**:
- Use smaller images (< 5MB)
- Compress images before upload
- Upload in batches of 5-10 images at a time

## Storage Costs

Supabase Storage pricing (as of 2024):
- **Free tier**: 1 GB storage + 2 GB bandwidth
- **Pro tier**: $0.021 per GB storage per month
- **Bandwidth**: $0.09 per GB

**Estimate for 100 products**:
- Average: 5 images per product
- File size after compression: ~300 KB per image
- Total storage: ~150 MB
- **Cost**: Within free tier

## Best Practices

1. **Optimize before upload**: Compress images before uploading when possible
2. **Delete unused images**: Clean up old images when products are deleted
3. **Use thumbnails**: Display thumbnails in lists, full images only on detail view
4. **Lazy loading**: Load images on demand to reduce initial page load
5. **CDN caching**: Supabase Storage includes CDN, images are cached automatically
6. **Batch uploads**: Upload multiple images together for better performance
7. **Error handling**: Always handle upload failures gracefully

## Security Considerations

1. **Public bucket**: Images are publicly accessible by URL
2. **Authentication**: Only authenticated users (owners) can upload via the app
3. **File validation**: File type and size validated before upload
4. **No user data**: Don't include sensitive information in filenames
5. **Access control**: Upload permissions managed through RLS policies

## Maintenance

### Cleanup Script (Optional)

Create a scheduled task to clean up orphaned images:

```javascript
// Find images in temp folder older than 24 hours
// Find images not associated with any product
// Delete these images from storage
```

### Monitoring

Monitor storage usage in Supabase dashboard:
- Navigate to **Settings** → **Usage**
- Check storage and bandwidth usage
- Set up alerts for approaching limits

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)
- [CORS Configuration Guide](https://supabase.com/docs/guides/storage/cors)

