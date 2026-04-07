import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Emergency from '../models/Emergency.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { auth, authorize } from '../middleware/auth.js';
import { validateEmergency, handleValidationErrors } from '../middleware/validation.js';

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
router.post('/trigger', 
  auth, 
  authorize('Individual'),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
  ]),
  validateEmergency, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { triggeredBy, latitude, longitude, severity, message } = req.body;
      
      const io = req.app.get('io');
      
      // Get user with emergency contacts
      const user = await User.findById(req.user.id).populate('emergencyContacts.memberId');
      
      if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No emergency contacts configured'
        });
      }

      // Create emergency record
      const emergency = new Emergency({
        individualId: req.user.id,
        triggeredBy,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: req.body.address || '',
          accuracy: req.body.accuracy ? parseFloat(req.body.accuracy) : 0
        },
        severity: severity || 'Medium',
        message: message || '',
        image: req.files && req.files.image ? `/uploads/emergency/${req.files.image[0].filename}` : '',
        audioRecording: req.files && req.files.audio ? `/uploads/emergency/${req.files.audio[0].filename}` : ''
      });

      // Add initial timeline event
      emergency.addTimelineEvent('Emergency Triggered', req.user.id, `Triggered by: ${triggeredBy}`);

      await emergency.save();

      // Update user status to Emergency
      user.status = 'Emergency';
      await user.save();

      // Notify emergency contacts based on priority
      const notifications = [];
      
      for (const contact of user.emergencyContacts) {
        await emergency.notifyMember(contact.memberId._id);
        
        const notificationData = {
          emergencyId: emergency._id,
          individualId: req.user.id,
          individualName: user.name,
          location: emergency.location,
          severity: emergency.severity,
          triggeredBy: emergency.triggeredBy,
          message: emergency.message,
          priority: contact.priority,
          relation: contact.relation
        };

        // Send real-time notification via Socket.io
        io.to(contact.memberId._id.toString()).emit('emergency-alert', notificationData);

        notifications.push({
          memberId: contact.memberId._id,
          memberName: contact.memberId.name,
          priority: contact.priority,
          relation: contact.relation,
          notified: true
        });
      }

      // Send system message to all emergency contacts
      for (const contact of user.emergencyContacts) {
        const systemMessage = new Message({
          senderId: req.user.id,
          receiverId: contact.memberId._id,
          emergencyId: emergency._id,
          messageType: 'System',
          content: `🚨 EMERGENCY ALERT: ${user.name} has triggered an emergency alert. Location: ${latitude}, ${longitude}. Severity: ${emergency.severity}`,
          priority: 'Urgent'
        });
        
        await systemMessage.save();
        
        // Send real-time message
        io.to(contact.memberId._id.toString()).emit('new-message', {
          id: systemMessage._id,
          senderId: req.user.id,
          senderName: user.name,
          content: systemMessage.content,
          messageType: 'System',
          priority: 'Urgent',
          emergencyId: emergency._id,
          createdAt: systemMessage.createdAt
        });
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

// Get active emergencies for a member
router.get('/active', auth, authorize('Member'), async (req, res) => {
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
router.post('/:emergencyId/respond', auth, authorize('Member'), async (req, res) => {
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

// Get user's emergency history
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user can access this history
    if (userId !== req.user.id) {
      // Check if requesting user is an emergency contact
      const targetUser = await User.findById(userId);
      const isEmergencyContact = targetUser.emergencyContacts.some(
        contact => contact.memberId.toString() === req.user.id
      );

      if (!isEmergencyContact) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const emergencies = await Emergency.findUserEmergencies(userId)
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
