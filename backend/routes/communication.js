import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Emergency from '../models/Emergency.js';
import { auth } from '../middleware/auth.js';
import { validateMessage, handleValidationErrors } from '../middleware/validation.js';
import { uploadMessageMedia, deleteCloudinaryFile, extractPublicId, getResourceType } from '../utils/fileUpload.js';

const router = express.Router();

// Send message
router.post('/send', 
  auth,
  uploadMessageMedia.single('media'),
  validateMessage,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { receiverId, messageType = 'Text', content, priority = 'Normal', emergencyId } = req.body;
      
      // Check if receiver exists
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        return res.status(404).json({
          success: false,
          message: 'Receiver not found'
        });
      }

      // Check if users have a relationship (emergency contacts or emergency participants)
      const sender = await User.findById(req.user.id);
      let canMessage = false;

      // Check if receiver is emergency contact of sender
      if (sender.emergencyContacts.some(contact => contact.memberId.toString() === receiverId)) {
        canMessage = true;
      }

      // Check if sender is emergency contact of receiver
      if (receiver.emergencyContacts.some(contact => contact.memberId.toString() === req.user.id)) {
        canMessage = true;
      }

      // Check if they are part of the same emergency
      if (emergencyId) {
        const emergency = await Emergency.findById(emergencyId);
        if (emergency) {
          const isIndividual = emergency.individualId.toString() === req.user.id || emergency.individualId.toString() === receiverId;
          const isNotifiedMember = emergency.notifiedMembers.some(
            notification => 
              notification.memberId.toString() === req.user.id || 
              notification.memberId.toString() === receiverId
          );
          
          if (isIndividual || isNotifiedMember) {
            canMessage = true;
          }
        }
      }

      if (!canMessage) {
        return res.status(403).json({
          success: false,
          message: 'You can only message your emergency contacts'
        });
      }

      // Create message
      const message = new Message({
        senderId: req.user.id,
        receiverId,
        emergencyId: emergencyId || undefined,
        messageType,
        content: messageType === 'Text' || messageType === 'System' ? content : '',
        // mediaUrl: (messageType === 'Image' || messageType === 'Audio') ? req.file?.path : '',
        mediaUrl: (messageType === 'Image' || messageType === 'Audio')
  ? req.file?.path || req.file?.secure_url || ''
  : '',
        priority,
        location: messageType === 'Location' ? {
          latitude: parseFloat(req.body.latitude),
          longitude: parseFloat(req.body.longitude),
          address: req.body.address || ''
        } : undefined
      });

      await message.save();

      // Get sender info for notification
      const senderInfo = await User.findById(req.user.id).select('name profileImage');

      const io = req.app.get('io');

      // Send real-time notification to receiver
      io.to(receiverId).emit('new-message', {
        id: message._id,
        senderId: req.user.id,
        senderName: senderInfo.name,
        senderImage: senderInfo.profileImage,
        content: message.content,
        messageType: message.messageType,
        mediaUrl: message.mediaUrl,
        location: message.location,
        priority: message.priority,
        emergencyId: message.emergencyId,
        createdAt: message.createdAt
      });

      // Mark as delivered
      await message.markAsDelivered();

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          message: {
            id: message._id,
            senderId: message.senderId,
            receiverId: message.receiverId,
            content: message.content,
            messageType: message.messageType,
            mediaUrl: message.mediaUrl,
            location: message.location,
            priority: message.priority,
            emergencyId: message.emergencyId,
            isRead: message.isRead,
            delivered: message.delivered,
            createdAt: message.createdAt
          }
        }
      });
    } catch (error) {
      console.error('Send message error:', error);
      
      // Delete uploaded file from Cloudinary if database save failed
      if (req.file && (req.file.public_id || req.file.filename)) {
        try {
          const publicId = req.file.public_id || req.file.filename;
          const resourceType = getResourceType(req.file.path || req.file.secure_url);
          await deleteCloudinaryFile(publicId, resourceType);
          console.log('Deleted orphaned Cloudinary file:', publicId);
        } catch (deleteError) {
          console.error('Failed to delete orphaned Cloudinary file:', deleteError);
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error sending message'
      });
    }
  }
);

// Get conversation between two users
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Check if users can communicate
    const currentUser = await User.findById(req.user.id);
    const otherUser = await User.findById(userId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let canMessage = false;

    // Check emergency contact relationship
    if (currentUser.emergencyContacts.some(contact => contact.memberId.toString() === userId) ||
        otherUser.emergencyContacts.some(contact => contact.memberId.toString() === req.user.id)) {
      canMessage = true;
    }

    if (!canMessage) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Get conversation
    const messages = await Message.getConversation(req.user.id, userId, parseInt(limit));
    
    // Mark messages as read
    const unreadMessages = messages.filter(
      msg => msg.receiverId.toString() === req.user.id && !msg.isRead
    );

    for (const message of unreadMessages) {
      await message.markAsRead();
    }

      res.json({
        success: true,
        data: {
          messages: messages.reverse(), // Show oldest first
          otherUser: {
            id: otherUser._id,
            name: otherUser.name,
            profileImage: otherUser.profileImage,
            status: otherUser.status
          },
          unreadCount: unreadMessages.length
        }
      });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error fetching conversation'
      });
    }
  }
);

// Get messages for an emergency
router.get('/emergency/:emergencyId', auth, async (req, res) => {
  try {
    const { emergencyId } = req.params;

    // Check if user is part of this emergency
    const emergency = await Emergency.findById(emergencyId);
    
    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: 'Emergency not found'
      });
    }

    const hasAccess = 
      emergency.individualId.toString() === req.user.id ||
      emergency.notifiedMembers.some(
        notification => notification.memberId.toString() === req.user.id
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this emergency'
      });
    }

    // Get emergency messages
    const messages = await Message.getEmergencyMessages(emergencyId);

    // Mark messages as read for current user
    const unreadMessages = messages.filter(
      msg => msg.receiverId.toString() === req.user.id && !msg.isRead
    );

    for (const message of unreadMessages) {
      await message.markAsRead();
    }

    res.json({
      success: true,
      data: {
        messages,
        unreadCount: unreadMessages.length,
        emergency: {
          id: emergency._id,
          status: emergency.status,
          individualId: emergency.individualId
        }
      }
    });
  } catch (error) {
    console.error('Get emergency messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching emergency messages'
    });
  }
});

// Get unread messages
router.get('/unread', auth, async (req, res) => {
  try {
    const messages = await Message.getUnreadMessages(req.user.id);

    res.json({
      success: true,
      data: {
        messages,
        count: messages.length
      }
    });
  } catch (error) {
    console.error('Get unread messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching unread messages'
    });
  }
});

// Mark message as read
router.put('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the receiver
    if (message.receiverId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only mark your own messages as read'
      });
    }

    await message.markAsRead();

    res.json({
      success: true,
      message: 'Message marked as read',
      data: {
        messageId: message._id,
        readAt: message.readAt
      }
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking message as read'
    });
  }
});

// Trigger alarm (send urgent notification to all emergency contacts)
router.post('/trigger-alarm', auth, async (req, res) => {
  try {
    const { message = 'Emergency alarm triggered!' } = req.body;

    const user = await User.findById(req.user.id).populate('emergencyContacts.memberId');
    
    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No emergency contacts configured'
      });
    }

    const io = req.app.get('io');
    const notifications = [];

    // Send alarm message to all emergency contacts
    for (const contact of user.emergencyContacts) {
      const alarmMessage = new Message({
        senderId: req.user.id,
        receiverId: contact.memberId._id,
        messageType: 'System',
        content: `🚨 ALARM: ${user.name} - ${message}`,
        priority: 'Urgent'
      });

      await alarmMessage.save();
      await alarmMessage.markAsDelivered();

      // Send real-time notification
      io.to(contact.memberId._id.toString()).emit('emergency-alarm', {
        id: alarmMessage._id,
        senderId: req.user.id,
        senderName: user.name,
        content: alarmMessage.content,
        priority: 'Urgent',
        timestamp: new Date()
      });

      io.to(contact.memberId._id.toString()).emit('new-message', {
        id: alarmMessage._id,
        senderId: req.user.id,
        senderName: user.name,
        content: alarmMessage.content,
        messageType: 'System',
        priority: 'Urgent',
        createdAt: alarmMessage.createdAt
      });

      notifications.push({
        memberId: contact.memberId._id,
        memberName: contact.memberId.name,
        priority: contact.priority,
        notified: true
      });
    }

    res.json({
      success: true,
      message: 'Alarm triggered successfully',
      data: {
        notifiedContacts: notifications,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Trigger alarm error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error triggering alarm'
    });
  }
});

// Delete message (only sender can delete their own messages)
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages'
      });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting message'
    });
  }
});

export default router;
