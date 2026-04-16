import express from 'express';
import multer from 'multer';
import path from 'path';
import Emergency from '../models/Emergency.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'evidence');
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images and audio files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed'));
    }
  }
});

// GET all evidence for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const emergencies = await Emergency.find({
      individualId: req.user.id
    }).sort({ createdAt: -1 });

    const evidence = [];

    emergencies.forEach((em) => {
      // Image
      if (em.image) {
        evidence.push({
          _id: `${em._id}-img`,
          type: 'Photo',
          title: em.title || 'Emergency Image',
          fileUrl: em.image,
          createdAt: em.createdAt
        });
      }

      // Audio
      if (em.audioRecording) {
        evidence.push({
          _id: `${em._id}-audio`,
          type: 'Audio',
          title: em.title || 'Emergency Audio',
          fileUrl: em.audioRecording,
          createdAt: em.createdAt
        });
      }
    });

    res.json({
      success: true,
      data: evidence
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch evidence'
    });
  }
});

// Upload photo evidence
router.post('/upload/photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided'
      });
    }

    // Create a dummy emergency record for the evidence
    const emergency = new Emergency({
      individualId: req.user.id,
      triggeredBy: 'Manual',
      severity: 'Low',
      message: 'Photo evidence captured',
      image: `/uploads/evidence/${req.file.filename}`,
      title: `Photo Evidence - ${new Date().toLocaleString()}`
    });

    await emergency.save();

    res.json({
      success: true,
      message: 'Photo evidence uploaded successfully',
      data: {
        evidenceId: `${emergency._id}-img`,
        fileUrl: `/uploads/evidence/${req.file.filename}`,
        createdAt: emergency.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading photo evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo evidence'
    });
  }
});

// Upload audio evidence
router.post('/upload/audio', auth, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No audio file provided'
      });
    }

    // Create a dummy emergency record for the evidence
    const emergency = new Emergency({
      individualId: req.user.id,
      triggeredBy: 'Manual',
      severity: 'Low',
      message: 'Audio evidence captured',
      audioRecording: `/uploads/evidence/${req.file.filename}`,
      title: `Audio Evidence - ${new Date().toLocaleString()}`
    });

    await emergency.save();

    res.json({
      success: true,
      message: 'Audio evidence uploaded successfully',
      data: {
        evidenceId: `${emergency._id}-audio`,
        fileUrl: `/uploads/evidence/${req.file.filename}`,
        createdAt: emergency.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading audio evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload audio evidence'
    });
  }
});

// Upload screenshot evidence
router.post('/upload/screenshot', auth, upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No screenshot file provided'
      });
    }

    // Create a dummy emergency record for the evidence
    const emergency = new Emergency({
      individualId: req.user.id,
      triggeredBy: 'Manual',
      severity: 'Low',
      message: 'Screenshot evidence captured',
      image: `/uploads/evidence/${req.file.filename}`,
      title: `Screenshot Evidence - ${new Date().toLocaleString()}`
    });

    await emergency.save();

    res.json({
      success: true,
      message: 'Screenshot evidence uploaded successfully',
      data: {
        evidenceId: `${emergency._id}-img`,
        fileUrl: `/uploads/evidence/${req.file.filename}`,
        createdAt: emergency.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading screenshot evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload screenshot evidence'
    });
  }
});

// Save location evidence
router.post('/save/location', auth, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Create a dummy emergency record for the location evidence
    const emergency = new Emergency({
      individualId: req.user.id,
      triggeredBy: 'Manual',
      severity: 'Low',
      message: 'Location evidence captured',
      latitude,
      longitude,
      address: address || `Location: ${latitude}, ${longitude}`,
      title: `Location Evidence - ${new Date().toLocaleString()}`
    });

    await emergency.save();

    res.json({
      success: true,
      message: 'Location evidence saved successfully',
      data: {
        evidenceId: `${emergency._id}-location`,
        location: { latitude, longitude, address },
        createdAt: emergency.createdAt
      }
    });

  } catch (error) {
    console.error('Error saving location evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save location evidence'
    });
  }
});

export default router;