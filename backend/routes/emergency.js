import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Emergency from '../models/Emergency.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { auth, authorize } from '../middleware/auth.js';
import { validateEmergency, handleValidationErrors } from '../middleware/validation.js';
import notificationService from '../services/notificationService.js';
import Relationship from '../models/Relationship.js';
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/emergency';
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

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and audio files are allowed'));
    }
  }
});

// Trigger emergency
router.post(
  '/trigger',
  auth,
  authorize('Individual', 'Child', 'Member', 'Parent'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]),
  validateEmergency,
  handleValidationErrors,
  async (req, res) => {
    try {
      console.log('Emergency trigger request body:', req.body);
      console.log('Emergency trigger files:', req.files);

      const {
        triggeredBy,
        latitude,
        longitude,
        severity,
        message,
        title,
        description
      } = req.body;

      // Convert string coordinates to numbers for FormData submissions
      const latitudeNum = parseFloat(latitude);
      const longitudeNum = parseFloat(longitude);

      const io = req.app.get('io');

      const user = await User.findById(req.user.id)
        .populate('emergencyContacts.memberId');

      if (!user.emergencyContacts?.length) {
        return res.status(400).json({
          success: false,
          message: 'No emergency contacts configured'
        });
      }

      const emergency = new Emergency({
        individualId: req.user.id,
        triggeredBy,
        location: {
          latitude: latitudeNum,
          longitude: longitudeNum,
          address: req.body.address || '',
        },
        severity: severity || 'Medium',

        title: title || 'Emergency',
        description: description || message || '',
        message: message || description || '',
        image: req.files?.image?.[0]
          ? `/uploads/emergency/${req.files.image[0].filename}`
          : '',
        audioRecording: req.files?.audio?.[0]
          ? `/uploads/emergency/${req.files.audio[0].filename}`
          : ''
      });

      emergency.addTimelineEvent(
        'Emergency Triggered',
        req.user.id,
        `Triggered by: ${triggeredBy}`
      );

      await emergency.save(); // ✅ ONLY SAVE HERE

      user.status = 'Emergency';
      await user.save();

      const notifications = [];

      for (const contact of user.emergencyContacts) {
        await emergency.notifyMember(contact.memberId._id);

        io.to(contact.memberId._id.toString()).emit('emergency-alert', {
          emergencyId: emergency._id,
          individualId: req.user.id,
          individualName: user.name,
          location: emergency.location,
          severity: emergency.severity,
          triggeredBy: emergency.triggeredBy,
          message: emergency.message,
          priority: contact.priority,
          relation: contact.relation
        });

        notifications.push({
          memberId: contact.memberId._id,
          memberName: contact.memberId.name,
          priority: contact.priority,
          relation: contact.relation,
          notified: true
        });
      }

      // Send SOS email to parent with location sharing links
      if (emergency.location && user.userType === 'Child') {
        // Find parent relationships
        // const Relationship = require('../models/Relationship.js');

        const parentRelationships = await Relationship.find({
          childId: req.user.id,
          status: 'active'
        }).populate('parentId', 'email name');

        // Send email to each parent
        for (const relationship of parentRelationships) {
          if (relationship.parentId && relationship.parentId.email) {
            await notificationService.sendSOSEmergencyNotification({
              childId: req.user.id,
              childName: user.name,
              childLocation: emergency.location,
              parentEmail: relationship.parentId.email,
              severity: emergency.severity
            });
          }
        }
      }

      res.status(201).json({
        success: true,
        message: 'Emergency triggered successfully',
        data: {
          emergencyId: emergency._id,
          status: emergency.status,
          notifiedContacts: notifications
        }
      });

    } catch (error) {
      console.error('Emergency trigger error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error triggering emergency'
      });
    }
  }
);
//updating emergency status
router.put('/:emergencyId/status', auth, authorize('Member', 'Individual','Child','Parent'), async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { status } = req.body;

    const emergency = await Emergency.findById(emergencyId);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    emergency.status = status;

    emergency.addTimelineEvent(
      'Status Updated',
      req.user.id,
      `Changed to ${status}`
    );

    await emergency.save();

    res.json({
      success: true,
      message: 'Status updated',
      data: { emergency }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
});
// Universal SOS notification - works for all user types
router.post('/notify-parents', auth, async (req, res) => {
  try {
    const { childName, childLocation, message, severity } = req.body;
    const userId = req.user.id;

    console.log('SOS Notification request:', {
      userId,
      userType: req.user.userType,
      childName,
      hasLocation: !!childLocation
    });

    // Find parent relationships - works for any user type
    const { default: Relationship } = await import('../models/Relationship.js');
    let parentRelationships = [];

    // Try to find relationships where current user is the child
    parentRelationships = await Relationship.find({
      childId: userId,
      status: 'active'
    }).populate('parentId', 'email name');

    // If no relationships found as child, try as parent (for testing)
    if (parentRelationships.length === 0) {
      parentRelationships = await Relationship.find({
        parentId: userId,
        status: 'active'
      }).populate('childId', 'name');

      // Reverse the relationship for email sending
      parentRelationships = parentRelationships.map(rel => ({
        parentId: rel.childId,
        childId: rel.parentId
      }));
    }

    if (parentRelationships.length === 0) {
      console.log('No parent relationships found for user:', userId);
      return res.status(404).json({
        success: false,
        message: 'No active parent relationships found. Please add a parent relationship first.'
      });
    }

    console.log(`Found ${parentRelationships.length} parent relationships`);

    // Send email to each parent
    let emailSent = false;
    for (const relationship of parentRelationships) {
      if (relationship.parentId && relationship.parentId.email) {
        console.log('Sending email to parent:', relationship.parentId.email);
        const success = await notificationService.sendSOSEmergencyNotification({
          childId: userId,
          childName: childName || req.user.name || 'Child',
          childLocation: childLocation,
          parentEmail: relationship.parentId.email,
          severity: severity || 'Emergency'
        });
        if (success) {
          emailSent = true;
          console.log('Email sent successfully to:', relationship.parentId.email);
        } else {
          console.log('Failed to send email to:', relationship.parentId.email);
        }
      }
    }

    if (emailSent) {
      res.json({
        success: true,
        message: `Emergency notification sent successfully to ${parentRelationships.length} parent(s)`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send emergency email notifications'
      });
    }

  } catch (error) {
    console.error('Universal SOS notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending emergency notification'
    });
  }
});

// Direct email notification for SOS fallback
router.post('/send-email', auth, async (req, res) => {
  try {
    const { childName, childLocation, message, severity } = req.body;
    const userId = req.user.id;

    // Find parent relationships
    const Relationship = require('../models/Relationship.js');
    // const { default: Relationship } = await import('../models/Relationship.js');
    const parentRelationships = await Relationship.find({
      childId: userId,
      status: 'active'
    }).populate('parentId', 'email name');

    if (parentRelationships.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active parent relationships found'
      });
    }

    // Send email to each parent
    let emailSent = false;
    for (const relationship of parentRelationships) {
      if (relationship.parentId && relationship.parentId.email) {
        const success = await notificationService.sendSOSEmergencyNotification(
          userId,
          childName || req.user.name,
          childLocation,
          relationship.parentId.email,
          severity || 'Emergency'
        );
        if (success) emailSent = true;
      }
    }

    if (emailSent) {
      res.json({
        success: true,
        message: 'Emergency email sent successfully to parents'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send emergency email'
      });
    }

  } catch (error) {
    console.error('Direct email notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending emergency email'
    });
  }
});

// Get active emergencies for a member
router.get('/active', auth, (req, res, next) => {
  const userRole = req.user.userType?.toLowerCase();
  if (userRole !== 'member' && userRole !== 'parent') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Only members and parents can access active emergencies.'
    });
  }
  next();
}, async (req, res) => {
  try {
    const emergencies = await Emergency.find({
      status: 'Active',
      'notifiedMembers.memberId': req.user.id
    })
      .populate('individualId', 'name phone email profileImage')
      .populate('notifiedMembers.memberId', 'name phone email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { emergencies }
    });
  } catch (error) {
    console.error('Get active emergencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching active emergencies'
    });
  }
});
// Respond to emergency (Help/Ignore)
router.post('/:emergencyId/respond', auth, authorize('Individual', 'Child', 'Member', 'Parent'), async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { response } = req.body; // 'Help' or 'Ignore'

    if (!['Help', 'Ignore'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Response must be either Help or Ignore'
      });
    }

    const emergency = await Emergency.findById(emergencyId)
      .populate('individualId', 'name')
      .populate('notifiedMembers.memberId', 'name');

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    // Check if user is notified for this emergency
    const isNotified = emergency.notifiedMembers.some(
      notification => notification.memberId._id.toString() === req.user.id
    );

    if (!isNotified) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to respond to this emergency'
      });
    }

    // Record response
    await emergency.recordMemberResponse(req.user.id, response);

    // Add timeline event
    await emergency.addTimelineEvent(
      `Member ${response === 'Help' ? 'Accepted' : 'Ignored'}`,
      req.user.id,
      `Response: ${response}`
    );

    const io = req.app.get('io');

    // Notify individual about the response
    io.to(emergency.individualId._id.toString()).emit('emergency-response', {
      emergencyId: emergency._id,
      memberId: req.user.id,
      memberName: emergency.notifiedMembers.find(
        n => n.memberId._id.toString() === req.user.id
      ).memberId.name,
      response: response,
      timestamp: new Date()
    });

    // Send message to individual
    const responseMessage = new Message({
      senderId: req.user.id,
      receiverId: emergency.individualId._id,
      emergencyId: emergency._id,
      messageType: 'System',
      content: response === 'Help'
        ? `✅ ${emergency.notifiedMembers.find(n => n.memberId._id.toString() === req.user.id).memberId.name} is coming to help you!`
        : `❌ ${emergency.notifiedMembers.find(n => n.memberId._id.toString() === req.user.id).memberId.name} is unable to respond.`,
      priority: 'High'
    });

    await responseMessage.save();

    io.to(emergency.individualId._id.toString()).emit('new-message', {
      id: responseMessage._id,
      senderId: req.user.id,
      senderName: emergency.notifiedMembers.find(n => n.memberId._id.toString() === req.user.id).memberId.name,
      content: responseMessage.content,
      messageType: 'System',
      priority: 'High',
      emergencyId: emergency._id,
      createdAt: responseMessage.createdAt
    });

    res.json({
      success: true,
      message: `Emergency response recorded: ${response}`,
      data: {
        response,
        emergencyId: emergency._id
      }
    });
  } catch (error) {
    console.error('Emergency response error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording emergency response'
    });
  }
});
// Get emergency details
router.get('/:emergencyId', auth, async (req, res) => {
  try {
    const { emergencyId } = req.params;

    const emergency = await Emergency.findById(emergencyId)
      .populate('individualId', 'name phone email profileImage')
      .populate('notifiedMembers.memberId', 'name phone email profileImage')
      .populate('responders.memberId', 'name phone email profileImage')
      .populate('timeline.userId', 'name');

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    // Check if user has access to this emergency
    const hasAccess =
      emergency.individualId._id.toString() === req.user.id ||
      emergency.notifiedMembers.some(
        notification => notification.memberId._id.toString() === req.user.id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this emergency'
      });
    }

    res.json({
      success: true,
      data: { emergency }
    });
  } catch (error) {
    console.error('Get emergency details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching emergency details'
    });
  }
});
// Resolve emergency
router.post('/:emergencyId/resolve', auth, async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { resolutionNotes } = req.body;

    const emergency = await Emergency.findById(emergencyId);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    // Check if user can resolve this emergency
    const canResolve =
      emergency.individualId.toString() === req.user.id ||
      emergency.responders.some(
        responder => responder.memberId.toString() === req.user.id
      );

    if (!canResolve) {
      return res.status(403).json({
        success: false,
        message: 'Only the individual or responders can resolve this emergency'
      });
    }

    // Resolve emergency
    await emergency.resolveEmergency(req.user.id, resolutionNotes);

    // Update individual status to Safe
    const individual = await User.findById(emergency.individualId);
    individual.status = 'Safe';
    await individual.save();

    const io = req.app.get('io');

    // Notify all involved parties
    const notifiedIds = [
      emergency.individualId.toString(),
      ...emergency.notifiedMembers.map(n => n.memberId.toString()),
      ...emergency.responders.map(r => r.memberId.toString())
    ];

    notifiedIds.forEach(userId => {
      io.to(userId).emit('emergency-resolved', {
        emergencyId: emergency._id,
        resolvedBy: req.user.id,
        resolvedAt: new Date(),
        resolutionNotes
      });
    });

    res.json({
      success: true,
      message: 'Emergency resolved successfully',
      data: {
        emergencyId: emergency._id,
        resolvedAt: emergency.resolvedAt
      }
    });
  } catch (error) {
    console.error('Resolve emergency error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resolving emergency'
    });
  }
});
// Method to record member response edit
router.put('/:emergencyId/edit', auth, async (req, res) => {
  try {
    const { title, description, address } = req.body;

    const emergency = await Emergency.findById(req.params.emergencyId);
    if (!emergency) {
      return res.status(404).json({ message: 'Not found' });
    }
    emergency.title = `${title}`;
    emergency.message = `${description}`;
    emergency.location.address = address;

    await emergency.save();

    res.json({
      success: true,
      data: emergency
    });

  } catch (err) {
    res.status(500).json({ message: 'Edit failed' });
  }
});
//edit emergency details (title, description, location) - only by individual who triggered it
router.put('/:emergencyId', auth, authorize('Individual', 'Child', 'Member', 'Parent'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), async (req, res) => {
  try {
    const { emergencyId } = req.params;

    const emergency = await Emergency.findById(emergencyId);
    if (!emergency) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    // update fields
    if (req.body.title) emergency.title = req.body.title;
    if (req.body.description) emergency.description = req.body.description;
    if (req.body.location) {
      emergency.location.address = req.body.location;
    }

    // 🔥 REPLACE FILE (important)
    if (req.files?.image?.[0]) {
      emergency.image = `/uploads/emergency/${req.files.image[0].filename}`;
    }

    if (req.files?.audio?.[0]) {
      emergency.audioRecording = `/uploads/emergency/${req.files.audio[0].filename}`;
    }

    emergency.addTimelineEvent(
      'Updated',
      req.user.id,
      'Emergency updated by user'
    );

    await emergency.save();

    res.json({
      success: true,
      data: emergency
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});
// Get user's emergency history
router.get('/history/:userId', auth, async (req, res) => {
  try {
    let { userId } = req.params;

    // ✅ HANDLE "me" BEFORE ANY DB CALL
    if (userId === 'me') {
      userId = req.user.id;
    }

    // ✅ SAFETY: prevent invalid ObjectId crash
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userId'
      });
    }

    const emergencies = await Emergency.find({
      individualId: userId
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: { emergencies }
    });

  } catch (error) {
    console.error('Get emergency history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching emergency history'
    });
  }
});

export default router;
