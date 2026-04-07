import express from 'express';
import User from '../models/User.js';
import Emergency from '../models/Emergency.js';
import { auth } from '../middleware/auth.js';
import { validateLocation, handleValidationErrors } from '../middleware/validation.js';
import { getDistance } from 'geolib';

const router = express.Router();

// Update user location
router.post('/update', 
  auth, 
  validateLocation, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { latitude, longitude, accuracy, address } = req.body;
      
      const user = await User.findById(req.user.id);
      
      // Update location
      await user.updateLocation(
        parseFloat(latitude), 
        parseFloat(longitude), 
        accuracy ? parseFloat(accuracy) : 0
      );

      // Update address if provided
      if (address) {
        user.currentLocation.address = address;
        await user.save();
      }

      const io = req.app.get('io');

      // If user is in emergency, broadcast location to emergency contacts
      if (user.status === 'Emergency') {
        const activeEmergencies = await Emergency.find({
          individualId: req.user.id,
          status: 'Active'
        }).populate('notifiedMembers.memberId', 'name');

        for (const emergency of activeEmergencies) {
          for (const notification of emergency.notifiedMembers) {
            io.to(notification.memberId._id.toString()).emit('location-update', {
              emergencyId: emergency._id,
              userId: req.user.id,
              userName: user.name,
              location: user.currentLocation,
              timestamp: new Date()
            });
          }
        }
      }

      res.json({
        success: true,
        message: 'Location updated successfully',
        data: {
          location: user.currentLocation,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Location update error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating location'
      });
    }
  }
);

// Get current location of user (for emergency contacts)
router.get('/:userId/current', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if requesting user is an emergency contact of target user
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

    if (!isEmergencyContact && userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an emergency contact of this user.'
      });
    }

    // Only provide location if user is in emergency status
    if (targetUser.status !== 'Emergency' && userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Location is only available during emergencies'
      });
    }

    res.json({
      success: true,
      data: {
        location: targetUser.currentLocation,
        status: targetUser.status,
        lastActive: targetUser.lastActive
      }
    });
  } catch (error) {
    console.error('Get current location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching location'
    });
  }
});

// Get location history (last 5-10 minutes of movement)
router.get('/:userId/history', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { minutes = 10 } = req.query;

    // Check if requesting user is an emergency contact of target user
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

    if (!isEmergencyContact && userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not an emergency contact of this user.'
      });
    }

    // Only provide location history if user is in emergency status
    if (targetUser.status !== 'Emergency' && userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Location history is only available during emergencies'
      });
    }

    // Get location history for specified minutes
    const timeThreshold = new Date(Date.now() - (parseInt(minutes) * 60 * 1000));
    
    const locationHistory = targetUser.locationHistory
      .filter(location => location.timestamp >= timeThreshold)
      .sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: {
        locationHistory,
        timeRange: `${minutes} minutes`,
        totalPoints: locationHistory.length
      }
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching location history'
    });
  }
});

// Get nearby users (for emergency responders)
router.get('/nearby', auth, async (req, res) => {
  try {
    const { latitude, longitude, radius = 1000 } = req.query; // radius in meters

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Find nearby users
    const nearbyUsers = await User.findNearbyUsers(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius)
    ).select('name currentLocation status');

    // Calculate actual distances
    const usersWithDistance = nearbyUsers.map(user => {
      const distance = getDistance(
        { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
        { latitude: user.currentLocation.latitude, longitude: user.currentLocation.longitude }
      );

      return {
        id: user._id,
        name: user.name,
        status: user.status,
        location: user.currentLocation,
        distance: distance
      };
    }).filter(user => user.distance <= parseInt(radius));

    res.json({
      success: true,
      data: {
        nearbyUsers: usersWithDistance,
        center: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        radius: parseInt(radius),
        count: usersWithDistance.length
      }
    });
  } catch (error) {
    console.error('Get nearby users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error finding nearby users'
    });
  }
});

// Get location statistics for a user
router.get('/:userId/stats', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    // Check if requesting user is an emergency contact of target user
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

    if (!isEmergencyContact && userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get location history for specified days
    const timeThreshold = new Date(Date.now() - (parseInt(days) * 24 * 60 * 60 * 1000));
    
    const locationHistory = targetUser.locationHistory
      .filter(location => location.timestamp >= timeThreshold);

    // Calculate statistics
    let totalDistance = 0;
    let maxDistance = 0;
    let locationsByDay = {};

    for (let i = 1; i < locationHistory.length; i++) {
      const distance = getDistance(
        {
          latitude: locationHistory[i - 1].latitude,
          longitude: locationHistory[i - 1].longitude
        },
        {
          latitude: locationHistory[i].latitude,
          longitude: locationHistory[i].longitude
        }
      );

      totalDistance += distance;
      maxDistance = Math.max(maxDistance, distance);

      const day = locationHistory[i].timestamp.toISOString().split('T')[0];
      locationsByDay[day] = (locationsByDay[day] || 0) + 1;
    }

    const stats = {
      totalLocations: locationHistory.length,
      totalDistance: Math.round(totalDistance),
      maxDistance: Math.round(maxDistance),
      averageDistance: locationHistory.length > 1 ? Math.round(totalDistance / (locationHistory.length - 1)) : 0,
      locationsByDay,
      timeRange: `${days} days`,
      firstLocation: locationHistory[locationHistory.length - 1]?.timestamp,
      lastLocation: locationHistory[0]?.timestamp
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get location stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching location statistics'
    });
  }
});

// Set location sharing preferences
router.put('/sharing-preferences', auth, async (req, res) => {
  try {
    const { shareWithEmergencyContacts, shareDuringEmergency, shareLocationHistory } = req.body;

    const user = await User.findById(req.user.id);
    
    // Update emergency settings related to location
    if (shareWithEmergencyContacts !== undefined) {
      user.emergencySettings.shareWithEmergencyContacts = shareWithEmergencyContacts;
    }
    if (shareDuringEmergency !== undefined) {
      user.emergencySettings.shareDuringEmergency = shareDuringEmergency;
    }
    if (shareLocationHistory !== undefined) {
      user.emergencySettings.shareLocationHistory = shareLocationHistory;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Location sharing preferences updated',
      data: {
        emergencySettings: user.emergencySettings
      }
    });
  } catch (error) {
    console.error('Update location preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating location preferences'
    });
  }
});

export default router;
