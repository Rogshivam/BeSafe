import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create upload directories if they don't exist
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

// Configure storage for different file types
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

// Create upload middleware for different purposes
const createUploadMiddleware = (destination, fileFilter, fileSizeLimit = 5 * 1024 * 1024) => {
  return multer({
    storage: createStorage(destination),
    limits: {
      fileSize: fileSizeLimit
    },
    fileFilter
  });
};

// Specific upload middleware instances
export const uploadProfileImage = createUploadMiddleware('profiles', imageFilter, 2 * 1024 * 1024);
export const uploadEmergencyMedia = createUploadMiddleware('emergency', mediaFilter, 10 * 1024 * 1024);
export const uploadMessageMedia = createUploadMiddleware('messages', mediaFilter, 5 * 1024 * 1024);

// Utility function to delete files
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

// Initialize upload directories
createUploadDirectories();

export default {
  createUploadDirectories,
  createStorage,
  imageFilter,
  audioFilter,
  mediaFilter,
  createUploadMiddleware,
  uploadProfileImage,
  uploadEmergencyMedia,
  uploadMessageMedia,
  deleteFile,
  getFileInfo
};
