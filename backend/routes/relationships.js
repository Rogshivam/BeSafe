import express from 'express';
import Relationship from '../models/Relationship.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { validateRelationshipRequest } from '../middleware/validation.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();
// Send relationship request (parent to child or child/adult to parent)
router.post('/request', auth, validateRelationshipRequest, async (req, res) => {
  try {
    const { targetUserId, relationshipType, requestMessage, permissions } = req.body;
    const userId = req.user.id;
    const userRole = req.user.userType?.toLowerCase(); // Use userType field and convert to lowercase

    console.log('=== RELATIONSHIP REQUEST DEBUG ===');
    console.log('Request body:', req.body);
    console.log('User ID:', userId);
    console.log('User type (raw):', req.user.userType);
    console.log('User role (processed):', userRole);
    console.log('Relationship type requested:', relationshipType);

    // Validate relationship type based on user role
    const validRelationships = {
      parent: ['parent-child', 'guardian-ward'],
      child: ['parent-child'],
      adult: ['guardian-adult'],
      member: ['guardian-adult'], // Handle Member type as adult
      individual: ['guardian-adult'] // Handle Individual type as adult
    };

    console.log('Valid relationships for role:', validRelationships[userRole]);

    if (!validRelationships[userRole]?.includes(relationshipType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid relationship type for your role'
      });
    }

    // Check if user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if relationship already exists
    const existingRelationship = await Relationship.findOne({
      $or: [
        { parentId: userId, childId: targetUserId },
        { parentId: targetUserId, childId: userId }
      ],
      status: { $in: ['pending', 'active'] }
    });

    if (existingRelationship) {
      return res.status(400).json({
        success: false,
        message: 'Relationship already exists or pending'
      });
    }

    // Determine who is parent and who is child based on relationship type
    const isRequesterParent = userRole === 'parent';
    
    // Map user role to initiatedBy enum values
    const initiatedByRole = userRole === 'parent' ? 'parent' : 
                          userRole === 'child' ? 'child' : 'adult';
    
    const relationship = new Relationship({
      parentId: isRequesterParent ? userId : targetUserId,
      childId: isRequesterParent ? targetUserId : userId,
      relationshipType,
      permissions: permissions || {
        locationTracking: true,
        emergencyAlerts: true,
        communication: true,
        manageSettings: false
      },
      requestMessage,
      initiatedBy: initiatedByRole
    });

    await relationship.save();

    // Send notification to target user
    await notificationService.sendRelationshipNotification({
      userId: targetUserId,
      type: 'relationship_request',
      message: `${req.user.name} wants to connect as ${relationshipType}`,
      data: {
        relationshipId: relationship._id,
        requesterName: req.user.name,
        relationshipType,
        requestMessage
      }
    });

    res.status(201).json({
      success: true,
      message: 'Relationship request sent successfully',
      data: { relationship }
    });

  } catch (error) {
    console.error('Error sending relationship request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send relationship request'
    });
  }
});

// Get pending requests for current user
router.get('/pending', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.type;

    const pendingRequests = await Relationship.findPendingRequests(userId, userRole);

    res.json({
      success: true,
      data: { pendingRequests }
    });

  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests'
    });
  }
});

// Accept relationship request
router.post('/:relationshipId/accept', auth, async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { responseMessage } = req.body;
    const userId = req.user.id;

    const relationship = await Relationship.findById(relationshipId)
      .populate('parentId', 'name email phone')
      .populate('childId', 'name email phone');

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship request not found'
      });
    }

    // Check if user is part of this relationship
    if (relationship.parentId._id.toString() !== userId && 
        relationship.childId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this relationship'
      });
    }

    if (relationship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Relationship is no longer pending'
      });
    }

    await relationship.accept(responseMessage);

    // Send notification to the other party
    const otherPartyId = relationship.parentId._id.toString() === userId 
      ? relationship.childId._id 
      : relationship.parentId._id;

    await notificationService.sendRelationshipNotification({
      userId: otherPartyId,
      type: 'relationship_accepted',
      message: `Relationship request accepted`,
      data: {
        relationshipId: relationship._id,
        relationshipType: relationship.relationshipType
      }
    });

    res.json({
      success: true,
      message: 'Relationship accepted successfully',
      data: { relationship }
    });

  } catch (error) {
    console.error('Error accepting relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept relationship'
    });
  }
});

// Reject relationship request
router.post('/:relationshipId/reject', auth, async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { responseMessage } = req.body;
    const userId = req.user.id;

    const relationship = await Relationship.findById(relationshipId);

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship request not found'
      });
    }

    // Check if user is part of this relationship
    if (relationship.parentId.toString() !== userId && 
        relationship.childId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this relationship'
      });
    }

    if (relationship.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Relationship is no longer pending'
      });
    }

    await relationship.reject(responseMessage);

    // Send notification to the other party
    const otherPartyId = relationship.parentId.toString() === userId 
      ? relationship.childId 
      : relationship.parentId;

    await notificationService.sendRelationshipNotification({
      userId: otherPartyId,
      type: 'relationship_rejected',
      message: 'Relationship request rejected',
      data: {
        relationshipId: relationship._id,
        responseMessage
      }
    });

    res.json({
      success: true,
      message: 'Relationship rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject relationship'
    });
  }
});

// Get active relationships for current user
router.get('/active', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.type;

    const activeRelationships = await Relationship.findActiveRelationships(userId, userRole);

    res.json({
      success: true,
      data: { activeRelationships }
    });

  } catch (error) {
    console.error('Error fetching active relationships:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active relationships'
    });
  }
});

// Terminate relationship
router.delete('/:relationshipId', auth, async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const relationship = await Relationship.findById(relationshipId);

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    // Check if user is part of this relationship
    if (relationship.parentId.toString() !== userId && 
        relationship.childId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to terminate this relationship'
      });
    }

    if (relationship.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active relationships can be terminated'
      });
    }

    await relationship.terminate(reason);

    // Send notification to the other party
    const otherPartyId = relationship.parentId.toString() === userId 
      ? relationship.childId 
      : relationship.parentId;

    await notificationService.sendRelationshipNotification({
      userId: otherPartyId,
      type: 'relationship_terminated',
      message: 'Relationship terminated',
      data: {
        relationshipId: relationship._id,
        reason
      }
    });

    res.json({
      success: true,
      message: 'Relationship terminated successfully'
    });

  } catch (error) {
    console.error('Error terminating relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to terminate relationship'
    });
  }
});

// Update relationship permissions
router.put('/:relationshipId/permissions', auth, async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { permissions } = req.body;
    const userId = req.user.id;

    const relationship = await Relationship.findById(relationshipId);

    if (!relationship) {
      return res.status(404).json({
        success: false,
        message: 'Relationship not found'
      });
    }

    // Only parents can update permissions
    if (relationship.parentId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only parents can update permissions'
      });
    }

    if (relationship.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active relationships can have permissions updated'
      });
    }

    relationship.permissions = { ...relationship.permissions, ...permissions };
    await relationship.save();

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      data: { relationship }
    });

  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update permissions'
    });
  }
});


// Get child locations for parent monitoring
router.get('/child-locations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.userType?.toLowerCase();

    if (userRole !== 'parent') {
      return res.status(403).json({
        success: false,
        message: 'Only parents can access child locations'
      });
    }

    // Find all active relationships where this user is the parent
    const relationships = await Relationship.find({
      parentId: userId,
      status: 'active'
    }).populate('childId', 'name email currentLocation');

    const childLocations = relationships.map(rel => ({
      id: rel.childId._id,
      name: rel.childId.name,
      latitude: rel.childId.currentLocation?.latitude || null,
      longitude: rel.childId.currentLocation?.longitude || null,
      address: rel.childId.currentLocation?.address || null,
      lastUpdate: rel.childId.lastActive || rel.updatedAt,
      status: 'safe' // Could be enhanced with actual safety status
    }));

    res.json({
      success: true,
      data: {
        childLocations,
        count: childLocations.length
      }
    });

  } catch (error) {
    console.error('Error fetching child locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch child locations'
    });
  }
});

// Get sent relationship requests
router.get('/sent', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all relationships where this user initiated the request
    const sentRequests = await Relationship.find({
      $or: [
        { parentId: userId },
        { childId: userId }
      ]
    }).populate('parentId childId', 'name email');

    // Filter to show only those initiated by current user
    const userSentRequests = sentRequests.filter(req => {
      if (req.initiatedBy === 'parent') {
        return req.parentId._id.toString() === userId;
      } else {
        return req.childId._id.toString() === userId;
      }
    });

    res.json({
      success: true,
      data: {
        sentRequests: userSentRequests
      }
    });

  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sent requests'
    });
  }
});

export default router;
