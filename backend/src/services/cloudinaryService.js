import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';

/**
 * Check if Cloudinary credentials are configured in the environment
 */
export const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return Boolean(
    cloudName &&
    apiKey &&
    apiSecret &&
    cloudName.trim() !== '' &&
    apiKey.trim() !== '' &&
    apiSecret.trim() !== ''
  );
};

/**
 * Initialize / configure Cloudinary instance
 */
const initCloudinary = () => {
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true
    });
    return true;
  }
  return false;
};

/**
 * Validate Base64 Data URI image format and size
 */
export const validateBase64Image = (dataUri) => {
  if (!dataUri || typeof dataUri !== 'string') {
    const error = new Error('Image data is required and must be a base64 data URI string.');
    error.statusCode = 400;
    throw error;
  }

  const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    const error = new Error('Invalid image format. Expected valid data URI (e.g., data:image/png;base64,...).');
    error.statusCode = 400;
    throw error;
  }

  const mimeType = matches[1].toLowerCase();
  const base64Data = matches[2];

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedMimeTypes.includes(mimeType)) {
    const error = new Error('Unsupported image format. Allowed formats: JPEG, PNG, WebP.');
    error.statusCode = 400;
    throw error;
  }

  const buffer = Buffer.from(base64Data, 'base64');
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB

  if (buffer.length > maxSizeBytes) {
    const error = new Error('Image file size exceeds maximum limit of 5MB.');
    error.statusCode = 400;
    throw error;
  }

  let ext = 'png';
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') ext = 'jpg';
  if (mimeType === 'image/webp') ext = 'webp';

  return {
    valid: true,
    mimeType,
    base64Data,
    buffer,
    ext
  };
};

/**
 * Generic Image Uploader: Cloudinary First with Local Disk Fallback
 */
export const uploadImage = async (dataUri, options = {}) => {
  const {
    folder = 'jecrc_cafeteria/general',
    publicId = null,
    req = null
  } = options;

  // 1. Validate payload
  const validated = validateBase64Image(dataUri);

  // 2. If Cloudinary is configured, upload to Cloudinary (Production / Serverless)
  if (initCloudinary()) {
    try {
      const uploadOptions = {
        folder,
        resource_type: 'image',
        overwrite: true,
        transformation: [
          { quality: 'auto', fetch_format: 'auto' }
        ]
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

      return {
        success: true,
        imageUrl: result.secure_url,
        provider: 'cloudinary',
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes
      };
    } catch (cloudErr) {
      console.error('[Cloudinary Upload Error]', cloudErr);
      throw new Error(`Cloudinary upload failed: ${cloudErr.message || 'Unknown remote error'}`);
    }
  }

  // 3. Fallback: Local Disk Storage (Local development only)
  console.warn(
    '⚠️ [Cloudinary Notice] Cloudinary credentials not configured. Falling back to local disk storage. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET for persistent production deployment.'
  );

  const uploadsDir = path.resolve('./public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const safeName = publicId
    ? `${publicId}-${Date.now()}.${validated.ext}`
    : `promo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${validated.ext}`;

  const filePath = path.join(uploadsDir, safeName);
  await fs.promises.writeFile(filePath, validated.buffer);

  const host = req?.get ? (req.get('host') || 'localhost:5000') : 'localhost:5000';
  const protocol = req?.protocol || 'http';
  const imageUrl = `${protocol}://${host}/uploads/${safeName}`;

  return {
    success: true,
    imageUrl,
    provider: 'local',
    filename: safeName
  };
};

/**
 * Upload Deal / Reward Promotional Image
 */
export const uploadPromoImage = async (dataUri, req = null) => {
  return uploadImage(dataUri, {
    folder: 'jecrc_cafeteria/promotions',
    req
  });
};

/**
 * Upload User Profile Avatar Image
 */
export const uploadAvatarImage = async (dataUri, userId, req = null) => {
  return uploadImage(dataUri, {
    folder: 'jecrc_cafeteria/avatars',
    publicId: `avatar-${userId}`,
    req
  });
};
