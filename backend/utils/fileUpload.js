import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
const cloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary configured successfully');
} else {
  console.warn('Cloudinary credentials not found. Using local storage as fallback.');
}

// Create upload directories if they don't exist (for local fallback)
const createUploadDirectories = () => {
  const directories = [
    'uploads',
    'uploads/emergency',
    'uploads/messages',
    'uploads/profiles'
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Configure storage for different file types (local fallback)
const createStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = `uploads/${destination}`;
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
};

// File filter for images
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File filter for audio
const audioFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'), false);
  }
};

// File filter for images and audio
const mediaFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image and audio files are allowed'), false);
  }
};

// Create Cloudinary storage with proper labeling
const createCloudinaryStorage = (folder, resourceType = 'auto') => {
  if (!cloudinaryConfigured) {
    console.warn('Cloudinary not configured, falling back to local storage');
    return createStorage(folder);
  }
  
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      resource_type: resourceType,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'wav', 'ogg', 'm4a'],
      public_id: (req, file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        return `${file.fieldname}-${uniqueSuffix}`;
      },
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    }
  });
};

// Create upload middleware for different purposes (Cloudinary or local)
const createUploadMiddleware = (destination, fileFilter, resourceType = 'auto', fileSizeLimit = 5 * 1024 * 1024) => {
  return multer({
    storage: createCloudinaryStorage(destination, resourceType),
    limits: {
      fileSize: fileSizeLimit
    },
    fileFilter
  });
};

// Specific upload middleware instances
export const uploadProfileImage = createUploadMiddleware('profile-images', imageFilter, 'image', 2 * 1024 * 1024);
export const uploadEmergencyMedia = createUploadMiddleware('evidence/emergency', mediaFilter, 'auto', 10 * 1024 * 1024);
export const uploadMessageMedia = createUploadMiddleware('evidence/messages', mediaFilter, 'auto', 5 * 1024 * 1024);

// Utility function to delete files from Cloudinary
export const deleteCloudinaryFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting Cloudinary file:', error);
    return false;
  }
};

// Utility function to delete files from local storage
export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Utility function to get file info
export const getFileInfo = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath).toLowerCase()
      };
    }
    return { exists: false };
  } catch (error) {
    console.error('Error getting file info:', error);
    return { exists: false };
  }
};

// Utility function to extract public ID from Cloudinary URL
export const extractPublicId = (url) => {
  try {
    if (!url || !url.includes('cloudinary.com')) return null;
    
    const urlParts = url.split('/');
    const filenameWithExtension = urlParts[urlParts.length - 1];
    const filename = filenameWithExtension.split('.')[0];
    
    // Get folder path
    const uploadIndex = urlParts.indexOf('upload');
    const folder = urlParts.slice(uploadIndex + 1, -1).join('/');
    
    return folder ? `${folder}/${filename}` : filename;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

// Utility function to determine resource type from URL
export const getResourceType = (url) => {
  if (!url) return 'image';
  const extension = url.split('.').pop().toLowerCase();
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'webm'];
  
  if (audioExtensions.includes(extension)) return 'video';
  if (videoExtensions.includes(extension)) return 'video';
  return 'image';
};

// Initialize upload directories (for local fallback)
createUploadDirectories();

export default {
  createUploadDirectories,
  createStorage,
  imageFilter,
  audioFilter,
  mediaFilter,
  createUploadMiddleware,
  createCloudinaryStorage,
  uploadProfileImage,
  uploadEmergencyMedia,
  uploadMessageMedia,
  deleteFile,
  deleteCloudinaryFile,
  getFileInfo,
  extractPublicId,
  getResourceType
};
