import express from 'express';
import Emergency from '../models/Emergency.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

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

export default router;