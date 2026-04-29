import express from 'express';
import ChatRequest from '../models/ChatRequest.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Send chat request
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, message = '' } = req.body;

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if users can already chat (mutual emergency contacts)
    const canChat = await ChatRequest.canChat(req.user.id, receiverId);
    if (canChat) {
      return res.status(400).json({
        success: false,
        message: 'You can already chat with this user'
      });
    }

    // Check if there's already a pending request
    const existingRequest = await ChatRequest.getRequestBetweenUsers(req.user.id, receiverId);
    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'A chat request already exists'
      });
    }

    // Create chat request
    const chatRequest = new ChatRequest({
      senderId: req.user.id,
      receiverId,
      message
    });

    await chatRequest.save();

    // Get sender info for notification
    const sender = await User.findById(req.user.id).select('name profileImage');

    const io = req.app.get('io');

    // Send real-time notification to receiver
    io.to(receiverId).emit('chat-request', {
      id: chatRequest._id,
      senderId: req.user.id,
      senderName: sender.name,
      senderImage: sender.profileImage,
      message: chatRequest.message,
      createdAt: chatRequest.createdAt
    });

    res.status(201).json({
      success: true,
      message: 'Chat request sent successfully',
      data: {
        request: {
          id: chatRequest._id,
          senderId: chatRequest.senderId,
          receiverId: chatRequest.receiverId,
          status: chatRequest.status,
          message: chatRequest.message,
          createdAt: chatRequest.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Send chat request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending chat request'
    });
  }
});

// Accept chat request
router.put('/:requestId/accept', auth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const chatRequest = await ChatRequest.findById(requestId);
    
    if (!chatRequest) {
      return res.status(404).json({
        success: false,
        message: 'Chat request not found'
      });
    }

    // Check if user is the receiver
    if (chatRequest.receiverId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept requests sent to you'
      });
    }

    if (chatRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is no longer pending'
      });
    }

    chatRequest.status = 'accepted';
    await chatRequest.save();

    // Add both users to each other's emergency contacts
    const sender = await User.findById(chatRequest.senderId);
    const receiver = await User.findById(chatRequest.receiverId);

    if (sender && receiver) {
      // Add receiver to sender's emergency contacts
      const senderHasReceiver = sender.emergencyContacts.some(
        contact => contact.memberId.toString() === receiver._id.toString()
      );
      if (!senderHasReceiver) {
        sender.emergencyContacts.push({
          memberId: receiver._id,
          relation: 'Friend',
          priority: 'Medium',
          addedAt: new Date()
        });
        await sender.save();
      }

      // Add sender to receiver's emergency contacts
      const receiverHasSender = receiver.emergencyContacts.some(
        contact => contact.memberId.toString() === sender._id.toString()
      );
      if (!receiverHasSender) {
        receiver.emergencyContacts.push({
          memberId: sender._id,
          relation: 'Friend',
          priority: 'Medium',
          addedAt: new Date()
        });
        await receiver.save();
      }
    }

    const io = req.app.get('io');

    // Notify sender that request was accepted
    io.to(chatRequest.senderId.toString()).emit('chat-request-accepted', {
      requestId: chatRequest._id,
      receiverId: chatRequest.receiverId,
      status: 'accepted'
    });

    // Notify receiver that contact was added
    io.to(chatRequest.receiverId.toString()).emit('emergency-contact-added', {
      contactId: sender._id,
      contactName: sender.name
    });

    res.json({
      success: true,
      message: 'Chat request accepted and contact added',
      data: {
        requestId: chatRequest._id,
        status: 'accepted'
      }
    });
  } catch (error) {
    console.error('Accept chat request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error accepting chat request'
    });
  }
});

// Decline chat request
router.put('/:requestId/decline', auth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const chatRequest = await ChatRequest.findById(requestId);
    
    if (!chatRequest) {
      return res.status(404).json({
        success: false,
        message: 'Chat request not found'
      });
    }

    // Check if user is the receiver
    if (chatRequest.receiverId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only decline requests sent to you'
      });
    }

    if (chatRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request is no longer pending'
      });
    }

    chatRequest.status = 'declined';
    await chatRequest.save();

    const io = req.app.get('io');

    // Notify sender that request was declined
    io.to(chatRequest.senderId.toString()).emit('chat-request-declined', {
      requestId: chatRequest._id,
      receiverId: chatRequest.receiverId,
      status: 'declined'
    });

    res.json({
      success: true,
      message: 'Chat request declined',
      data: {
        requestId: chatRequest._id,
        status: 'declined'
      }
    });
  } catch (error) {
    console.error('Decline chat request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error declining chat request'
    });
  }
});

// Get pending chat requests for current user
router.get('/pending', auth, async (req, res) => {
  try {
    const requests = await ChatRequest.getPendingRequests(req.user.id);

    res.json({
      success: true,
      data: {
        requests,
        count: requests.length
      }
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pending requests'
    });
  }
});

// Check if users can chat
router.get('/can-chat/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const canChat = await ChatRequest.canChat(req.user.id, userId);

    res.json({
      success: true,
      data: {
        canChat,
        userId
      }
    });
  } catch (error) {
    console.error('Check can chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking chat status'
    });
  }
});

// Get request status between two users
router.get('/status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const request = await ChatRequest.getRequestBetweenUsers(req.user.id, userId);
    const canChat = await ChatRequest.canChat(req.user.id, userId);

    res.json({
      success: true,
      data: {
        canChat,
        request: request ? {
          id: request._id,
          status: request.status,
          senderId: request.senderId,
          receiverId: request.receiverId,
          message: request.message,
          createdAt: request.createdAt
        } : null
      }
    });
  } catch (error) {
    console.error('Get request status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching request status'
    });
  }
});

export default router;
