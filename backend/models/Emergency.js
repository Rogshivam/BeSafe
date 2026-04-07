import mongoose from 'mongoose';

const emergencySchema = new mongoose.Schema({
  individualId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  triggeredBy: {
    type: String,
    enum: ['Manual', 'Voice', 'Gesture', 'Auto', 'Location'],
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Resolved', 'False Alarm'],
    default: 'Active'
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      default: ''
    },
    accuracy: {
      type: Number,
      default: 0
    }
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  audioRecording: {
    type: String, // URL to audio file
    default: ''
  },
  image: {
    type: String, // URL to image
    default: ''
  },
  notifiedMembers: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notifiedAt: {
      type: Date,
      default: Date.now
    },
    response: {
      type: String,
      enum: ['Pending', 'Help', 'Ignore'],
      default: 'Pending'
    },
    respondedAt: {
      type: Date
    }
  }],
  responders: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['On the way', 'Arrived', 'Left'],
      default: 'On the way'
    }
  }],
  timeline: [{
    action: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: {
      type: String
    }
  }],
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: {
    type: String,
    maxlength: [1000, 'Resolution notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
emergencySchema.index({ individualId: 1 });
emergencySchema.index({ status: 1 });
emergencySchema.index({ createdAt: -1 });
emergencySchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Method to add timeline event
emergencySchema.methods.addTimelineEvent = function(action, userId, details = '') {
  this.timeline.push({
    action,
    userId,
    details,
    timestamp: new Date()
  });
  return this.save();
};

// Method to notify member
emergencySchema.methods.notifyMember = async function(memberId) {
  const existingNotification = this.notifiedMembers.find(
    notification => notification.memberId.toString() === memberId.toString()
  );
  
  if (!existingNotification) {
    this.notifiedMembers.push({
      memberId,
      notifiedAt: new Date(),
      response: 'Pending'
    });
    await this.save();
  }
  
  return existingNotification;
};

// Method to record member response
emergencySchema.methods.recordMemberResponse = async function(memberId, response) {
  const notification = this.notifiedMembers.find(
    notification => notification.memberId.toString() === memberId.toString()
  );
  
  if (notification) {
    notification.response = response;
    notification.respondedAt = new Date();
    
    if (response === 'Help') {
      this.responders.push({
        memberId,
        joinedAt: new Date(),
        status: 'On the way'
      });
    }
    
    await this.save();
  }
  
  return notification;
};

// Method to resolve emergency
emergencySchema.methods.resolveEmergency = async function(resolvedBy, resolutionNotes = '') {
  this.status = 'Resolved';
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = resolutionNotes;
  
  await this.addTimelineEvent('Emergency Resolved', resolvedBy, resolutionNotes);
  return this.save();
};

// Static method to find active emergencies
emergencySchema.statics.findActiveEmergencies = function() {
  return this.find({ status: 'Active' })
    .populate('individualId', 'name phone email')
    .populate('notifiedMembers.memberId', 'name phone email')
    .populate('responders.memberId', 'name phone email')
    .sort({ createdAt: -1 });
};

// Static method to find emergencies for user
emergencySchema.statics.findUserEmergencies = function(userId, userType = 'individual') {
  const query = userType === 'individual' 
    ? { individualId: userId }
    : { 'notifiedMembers.memberId': userId };
    
  return this.find(query)
    .populate('individualId', 'name phone email')
    .populate('notifiedMembers.memberId', 'name phone email')
    .populate('responders.memberId', 'name phone email')
    .sort({ createdAt: -1 });
};

const Emergency = mongoose.model('Emergency', emergencySchema);

export default Emergency;
