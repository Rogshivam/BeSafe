import express from 'express';
import Emergency from '../models/Emergency.js';
import Relationship from '../models/Relationship.js';
import { auth } from '../middleware/auth.js';
import { uploadEmergencyMedia, deleteCloudinaryFile, extractPublicId, getResourceType } from '../utils/fileUpload.js';

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

// Upload photo evidence
router.post('/upload/photo', auth, uploadEmergencyMedia.single('photo'), async (req, res) => {
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
      image: req.file.path || req.file.secure_url || req.file.secure_url, // Cloudinary URL
      title: `Photo Evidence - ${new Date().toLocaleString()}`
    });

    await emergency.save();

    res.json({
      success: true,
      message: 'Photo evidence uploaded successfully',
      data: {
        evidenceId: `${emergency._id}-img`,
        fileUrl: req.file.path || req.file.secure_url || req.file.secure_url, // Cloudinary URL
        publicId: req.file.public_id || req.file.public_id || req.file.filename, // Cloudinary public ID for deletion
        createdAt: emergency.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading photo evidence:', error);
    
    // Delete the uploaded file from Cloudinary if database save failed
    if (req.file && req.file.public_id || req.file.filename) {
      try {
        const resourceType = getResourceType(req.file.path || req.file.secure_url);
        await deleteCloudinaryFile(req.file.public_id || req.file.filename, resourceType);
        console.log('Deleted orphaned Cloudinary file:', req.file.public_id || req.file.filename);
      } catch (deleteError) {
        console.error('Failed to delete orphaned Cloudinary file:', deleteError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload photo evidence'
    });
  }
});

// Upload audio evidence
router.post('/upload/audio', auth, uploadEmergencyMedia.single('audio'), async (req, res) => {
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
      audioRecording: req.file.path || req.file.secure_url || req.file.secure_url, // Cloudinary URL
      title: `Audio Evidence - ${new Date().toLocaleString()}`
    });

    await emergency.save();

    res.json({
      success: true,
      message: 'Audio evidence uploaded successfully',
      data: {
        evidenceId: `${emergency._id}-audio`,
        fileUrl: req.file.path || req.file.secure_url || req.file.secure_url, // Cloudinary URL
        publicId: req.file.public_id || req.file.public_id || req.file.filename, // Cloudinary public ID for deletion
        createdAt: emergency.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading audio evidence:', error);
    
    // Delete the uploaded file from Cloudinary if database save failed
    if (req.file && req.file.public_id || req.file.filename) {
      try {
        const resourceType = getResourceType(req.file.path || req.file.secure_url);
        await deleteCloudinaryFile(req.file.public_id || req.file.filename, resourceType);
        console.log('Deleted orphaned Cloudinary file:', req.file.public_id || req.file.filename);
      } catch (deleteError) {
        console.error('Failed to delete orphaned Cloudinary file:', deleteError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload audio evidence'
    });
  }
});

// Upload screenshot evidence
router.post('/upload/screenshot', auth, uploadEmergencyMedia.single('screenshot'), async (req, res) => {
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
      image: req.file.path || req.file.secure_url, // Cloudinary URL
      title: `Screenshot Evidence - ${new Date().toLocaleString()}`
    });

    await emergency.save();

    res.json({
      success: true,
      message: 'Screenshot evidence uploaded successfully',
      data: {
        evidenceId: `${emergency._id}-img`,
        fileUrl: req.file.path || req.file.secure_url, // Cloudinary URL
        publicId: req.file.public_id || req.file.filename, // Cloudinary public ID for deletion
        createdAt: emergency.createdAt
      }
    });

  } catch (error) {
    console.error('Error uploading screenshot evidence:', error);
    
    // Delete the uploaded file from Cloudinary if database save failed
    if (req.file && req.file.public_id || req.file.filename) {
      try {
        const resourceType = getResourceType(req.file.path || req.file.secure_url);
        await deleteCloudinaryFile(req.file.public_id || req.file.filename, resourceType);
        console.log('Deleted orphaned Cloudinary file:', req.file.public_id || req.file.filename);
      } catch (deleteError) {
        console.error('Failed to delete orphaned Cloudinary file:', deleteError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to upload screenshot'
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

// GET children's evidence for parents
router.get('/children/:childId', auth, async (req, res) => {
  try {
    const { childId } = req.params;
    const parentId = req.user.id;

    // Check if the user is a parent and has a relationship with this child
    const relationship = await Relationship.findOne({
      parentId: parentId,
      childId: childId,
      status: 'active'
    });

    if (!relationship) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this child\'s evidence'
      });
    }

    // Get evidence for the specific child
    const emergencies = await Emergency.find({
      individualId: childId
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
          createdAt: em.createdAt,
          childName: em.individualId?.name || 'Unknown'
        });
      }

      // Audio
      if (em.audioRecording) {
        evidence.push({
          _id: `${em._id}-audio`,
          type: 'Audio',
          title: em.title || 'Emergency Audio',
          fileUrl: em.audioRecording,
          createdAt: em.createdAt,
          childName: em.individualId?.name || 'Unknown'
        });
      }

      // Location
      if (em.latitude && em.longitude) {
        evidence.push({
          _id: `${em._id}-location`,
          type: 'Location',
          title: em.title || 'Location Evidence',
          location: {
            latitude: em.latitude,
            longitude: em.longitude,
            address: em.address
          },
          createdAt: em.createdAt,
          childName: em.individualId?.name || 'Unknown'
        });
      }
    });

    res.json({
      success: true,
      data: evidence
    });

  } catch (err) {
    console.error('Error fetching child evidence:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch child evidence'
    });
  }
});

// GET parent's children list
router.get('/children', auth, async (req, res) => {
  try {
    const parentId = req.user.id;

    // Get all active relationships where this user is the parent
    const relationships = await Relationship.find({
      parentId: parentId,
      status: 'active'
    }).populate('childId', 'name email phone');

    const children = relationships.map(rel => ({
      id: rel.childId._id,
      name: rel.childId.name,
      email: rel.childId.email,
      phone: rel.childId.phone,
      relationshipId: rel._id
    }));

    res.json({
      success: true,
      data: { children }
    });

  } catch (err) {
    console.error('Error fetching children:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch children'
    });
  }
});

// Delete evidence
router.delete('/:evidenceId', auth, async (req, res) => {
  try {
    const { evidenceId } = req.params;

    // Extract emergency ID from evidenceId (format: emergencyId-type)
    const emergencyId = evidenceId.split('-')[0];
    const type = evidenceId.split('-')[1];

    const emergency = await Emergency.findById(emergencyId);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    // Check if user owns this evidence
    if (emergency.individualId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this evidence'
      });
    }

    let fileUrl = '';
    let publicId = '';

    // Get the file URL based on type
    if (type === 'img' || type === 'photo' || type === 'screenshot') {
      fileUrl = emergency.image;
    } else if (type === 'audio') {
      fileUrl = emergency.audioRecording;
    }

    // Delete from Cloudinary if it's a Cloudinary URL
    if (fileUrl && fileUrl.includes('cloudinary.com')) {
      publicId = extractPublicId(fileUrl);
      if (publicId) {
        const resourceType = getResourceType(fileUrl);
        await deleteCloudinaryFile(publicId, resourceType);
      }
    }

    // Remove the evidence from the emergency record
    if (type === 'img' || type === 'photo' || type === 'screenshot') {
      emergency.image = undefined;
    } else if (type === 'audio') {
      emergency.audioRecording = undefined;
    }

    await emergency.save();

    res.json({
      success: true,
      message: 'Evidence deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete evidence'
    });
  }
});

// Update evidence (replace file)
router.put('/:evidenceId', auth, uploadEmergencyMedia.single('file'), async (req, res) => {
  try {
    const { evidenceId } = req.params;

    // Extract emergency ID from evidenceId (format: emergencyId-type)
    const emergencyId = evidenceId.split('-')[0];
    const type = evidenceId.split('-')[1];

    const emergency = await Emergency.findById(emergencyId);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Evidence not found'
      });
    }

    // Check if user owns this evidence
    if (emergency.individualId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this evidence'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    let oldFileUrl = '';

    // Get the old file URL based on type
    if (type === 'img' || type === 'photo' || type === 'screenshot') {
      oldFileUrl = emergency.image;
    } else if (type === 'audio') {
      oldFileUrl = emergency.audioRecording;
    }

    // Delete old file from Cloudinary if it's a Cloudinary URL
    if (oldFileUrl && oldFileUrl.includes('cloudinary.com')) {
      const oldPublicId = extractPublicId(oldFileUrl);
      if (oldPublicId) {
        const resourceType = getResourceType(oldFileUrl);
        await deleteCloudinaryFile(oldPublicId, resourceType);
      }
    }

    // Update with new file
    if (type === 'img' || type === 'photo' || type === 'screenshot') {
      emergency.image = req.file.path || req.file.secure_url;
    } else if (type === 'audio') {
      emergency.audioRecording = req.file.path || req.file.secure_url;
    }

    await emergency.save();

    res.json({
      success: true,
      message: 'Evidence updated successfully',
      data: {
        fileUrl: req.file.path || req.file.secure_url,
        publicId: req.file.public_id || req.file.filename
      }
    });

  } catch (error) {
    console.error('Error updating evidence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update evidence'
    });
  }
});

export default router;
