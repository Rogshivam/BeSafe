import express from 'express';
import User from '../models/User.js';
import { auth, authorize } from '../middleware/auth.js';
import { 
  validateEmergencyContact, 
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// Search users (for adding emergency contacts)
router.get('/search', auth, async (req, res) => {
  try {
    const { query, userType } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchCriteria = {
      $and: [
        { _id: { $ne: req.user.id } }, // Exclude current user
        { isActive: true }
      ]
    };

    // Add search filter
    if (query) {
      searchCriteria.$and.push({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      });
    }

    // Add user type filter if specified
    if (userType) {
      searchCriteria.$and.push({ userType });
    }

    const users = await User.find(searchCriteria)
      .select('name email phone userType age profileImage')
      .limit(20);

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching users'
    });
  }
});

// Add emergency contact
router.post('/emergency-contacts', 
  auth, 
  validateEmergencyContact, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { memberId, relation, priority } = req.body;

      // Check if member exists
      const member = await User.findById(memberId);
      
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      // Check if member is already an emergency contact
      const user = await User.findById(req.user.id);
      const existingContact = user.emergencyContacts.find(
        contact => contact.memberId.toString() === memberId
      );

      if (existingContact) {
        return res.status(400).json({
          success: false,
          message: 'This user is already an emergency contact'
        });
      }

      // Add emergency contact
      await user.addEmergencyContact(memberId, relation, priority);

      // Get updated user with populated contacts
      const updatedUser = await User.findById(req.user.id)
        .populate('emergencyContacts.memberId', 'name phone email');

      res.status(201).json({
        success: true,
        message: 'Emergency contact added successfully',
        data: {
          emergencyContacts: updatedUser.emergencyContacts
        }
      });
    } catch (error) {
      console.error('Add emergency contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error adding emergency contact'
      });
    }
  }
);

// Get emergency contacts
router.get('/emergency-contacts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('emergencyContacts.memberId', 'name phone email profileImage userType');

    res.json({
      success: true,
      data: {
        emergencyContacts: user.emergencyContacts
      }
    });
  } catch (error) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching emergency contacts'
    });
  }
});

// Update emergency contact
router.put('/emergency-contacts/:contactId', auth, async (req, res) => {
  try {
    const { contactId } = req.params;
    const { relation, priority } = req.body;

    const user = await User.findById(req.user.id);
    
    const contact = user.emergencyContacts.id(contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }

    if (relation) contact.relation = relation;
    if (priority) contact.priority = priority;

    await user.save();

    // Get updated user with populated contacts
    const updatedUser = await User.findById(req.user.id)
      .populate('emergencyContacts.memberId', 'name phone email');

    res.json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: {
        emergencyContacts: updatedUser.emergencyContacts
      }
    });
  } catch (error) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating emergency contact'
    });
  }
});

// Remove emergency contact
router.delete('/emergency-contacts/:contactId', auth, async (req, res) => {
  try {
    const { contactId } = req.params;

    const user = await User.findById(req.user.id);
    
    const contact = user.emergencyContacts.id(contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }

    user.emergencyContacts.pull(contactId);
    await user.save();

    // Get updated user with populated contacts
    const updatedUser = await User.findById(req.user.id)
      .populate('emergencyContacts.memberId', 'name phone email');

    res.json({
      success: true,
      message: 'Emergency contact removed successfully',
      data: {
        emergencyContacts: updatedUser.emergencyContacts
      }
    });
  } catch (error) {
    console.error('Remove emergency contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing emergency contact'
    });
  }
});

// Get user profile by ID (for members viewing individual's profile)
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if the requesting user is an emergency contact of the target user
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isEmergencyContact = targetUser.emergencyContacts.some(
      contact => contact.memberId.toString() === req.user.id
    );

    if (!isEmergencyContact && targetUser._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an emergency contact of this user.'
      });
    }

    // Return limited profile information
    res.json({
      success: true,
      data: {
        user: {
          id: targetUser._id,
          name: targetUser.name,
          phone: targetUser.phone,
          email: targetUser.email,
          userType: targetUser.userType,
          age: targetUser.age,
          status: targetUser.status,
          currentLocation: targetUser.currentLocation,
          profileImage: targetUser.profileImage,
          lastActive: targetUser.lastActive
        }
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user profile'
    });
  }
});

// Update user status
router.put('/status', auth, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Safe', 'Alert', 'Emergency'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Safe, Alert, or Emergency'
      });
    }

    const user = await User.findById(req.user.id);
    user.status = status;
    await user.save();

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        status: user.status
      }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating status'
    });
  }
});

export default router;
