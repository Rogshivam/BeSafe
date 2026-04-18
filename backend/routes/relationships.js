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
    }).populate('childId', 'name email currentLocation lastKnownLocation status');

    const childLocations = relationships.map(rel => ({
      id: rel.childId._id,
      name: rel.childId.name,
      // Use relationship-stored location first, then fallback to user's current location
      latitude: rel.childLocation?.latitude || rel.childId.currentLocation?.latitude || rel.childId.lastKnownLocation?.latitude || null,
      longitude: rel.childLocation?.longitude || rel.childId.currentLocation?.longitude || rel.childId.lastKnownLocation?.longitude || null,
      address: rel.childLocation?.address || rel.childId.currentLocation?.address || rel.childId.lastKnownLocation?.address || null,
      lastUpdate: rel.childLocation?.timestamp || rel.childId.lastKnownLocation?.timestamp || rel.childId.lastActive || rel.updatedAt,
      lastKnownLocation: rel.childLocation?.lastKnownLocation || rel.childId.lastKnownLocation ? {
        latitude: rel.childLocation?.lastKnownLocation?.latitude || rel.childId.lastKnownLocation.latitude,
        longitude: rel.childLocation?.lastKnownLocation?.longitude || rel.childId.lastKnownLocation.longitude,
        address: rel.childLocation?.lastKnownLocation?.address || rel.childId.lastKnownLocation.address,
        timestamp: rel.childLocation?.lastKnownLocation?.timestamp || rel.childId.lastKnownLocation.timestamp
      } : null,
      status: rel.childId.status || 'safe'
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

// Direct SOS notification for children to notify parents
router.post('/send-sos-notification', auth, async (req, res) => {
  try {
    console.log('SOS Notification - Full request body:', req.body);
    console.log('SOS Notification - Body keys:', Object.keys(req.body));
    console.log('SOS Notification - childLocation value:', req.body.childLocation);
    console.log('SOS Notification - childLocation type:', typeof req.body.childLocation);
    
    const { childName, childLocation, message, severity } = req.body;
    const userId = req.user.id;

    console.log('SOS Notification via relationships API:', {
      userId,
      userType: req.user.userType,
      childName,
      childLocation,
      hasLocation: !!childLocation,
      childLocationType: typeof childLocation
    });

    // Find parent relationships
    let parentRelationships = await Relationship.find({
      childId: userId,
      status: 'active'
    }).populate('parentId', 'email name');

    if (parentRelationships.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active parent relationships found'
      });
    }

    console.log(`Found ${parentRelationships.length} parent relationships`);

    // Send email to each parent
    let emailSent = false;
    for (const relationship of parentRelationships) {
      if (relationship.parentId && relationship.parentId.email) {
        console.log('Sending SOS email to parent:', relationship.parentId.email);
        const success = await notificationService.sendSOSEmergencyNotification({
          childId: userId,
          childName: childName || req.user.name || 'Child',
          childLocation: childLocation,
          parentEmail: relationship.parentId.email,
          severity: severity || 'Emergency'
        });
        if (success) {
          emailSent = true;
          console.log('SOS email sent successfully to:', relationship.parentId.email);
        }
      }
    }

    if (emailSent) {
      res.json({
        success: true,
        message: `SOS notification sent to ${parentRelationships.length} parent(s)`
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send SOS notification'
      });
    }

  } catch (error) {
    console.error('SOS notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending SOS notification'
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
