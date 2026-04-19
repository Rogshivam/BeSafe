import mongoose from 'mongoose';

const relationshipSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relationshipType: {
    type: String,
    enum: ['parent-child', 'guardian-ward', 'guardian-adult'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'rejected', 'terminated'],
    default: 'pending'
  },
  permissions: {
    locationTracking: { type: Boolean, default: true },
    emergencyAlerts: { type: Boolean, default: true },
    communication: { type: Boolean, default: true },
    manageSettings: { type: Boolean, default: false }
  },
  requestMessage: {
    type: String,
    maxlength: 500
  },
  responseMessage: {
    type: String,
    maxlength: 500
  },
  initiatedBy: {
    type: String,
    enum: ['parent', 'child', 'adult'],
    required: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  monitoringSettings: {
    locationSharing: { type: Boolean, default: true },
    emergencyAlerts: { type: Boolean, default: true },
    geofenceEnabled: { type: Boolean, default: false },
    geofenceRadius: { type: Number, default: 100 }, // meters
    checkInFrequency: { 
      type: String, 
      enum: ['realtime', '5min', '15min', '30min', '1hour'], 
      default: '5min' 
    }
  },
  childLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    accuracy: { type: Number },
    timestamp: { type: Date, default: Date.now },
    lastKnownLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String },
      accuracy: { type: Number },
      timestamp: { type: Date }
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
relationshipSchema.index({ parentId: 1, status: 1 });
relationshipSchema.index({ childId: 1, status: 1 });
relationshipSchema.index({ status: 1, expiresAt: 1 });

// Static method to find active relationships
relationshipSchema.statics.findActiveRelationships = function(userId, type = 'parent') {
  // Find all active relationships where user is involved (either as parent or child)
  const query = {
    $or: [
      { parentId: userId, status: 'active' },
      { childId: userId, status: 'active' }
    ]
  };
  
  return this.find(query)
    .populate('parentId', 'name email phone type')
    .populate('childId', 'name email phone type');
};

// Static method to find pending requests
relationshipSchema.statics.findPendingRequests = function(userId, type = 'parent') {
  // Find all pending requests where user is involved (either as parent or child)
  const query = {
    $or: [
      { parentId: userId, status: 'pending' },
      { childId: userId, status: 'pending' }
    ]
  };
  
  return this.find(query)
    .populate('parentId', 'name email phone type')
    .populate('childId', 'name email phone type');
};

// Instance method to accept relationship
relationshipSchema.methods.accept = function(responseMessage = '') {
  this.status = 'active';
  this.responseMessage = responseMessage;
  this.expiresAt = undefined;
  return this.save();
};

// Instance method to reject relationship
relationshipSchema.methods.reject = function(responseMessage = '') {
  this.status = 'rejected';
  this.responseMessage = responseMessage;
  return this.save();
};

// Instance method to terminate relationship
relationshipSchema.methods.terminate = function(reason = '') {
  this.status = 'terminated';
  this.responseMessage = reason;
  return this.save();
};

// Pre-save middleware to validate unique active relationships
relationshipSchema.pre('save', async function() {
  if (this.status === 'active') {
    const existingActive = await this.constructor.findOne({
      _id: { $ne: this._id },
      parentId: this.parentId,
      childId: this.childId,
      status: 'active'
    });
    
    if (existingActive) {
      throw new Error('Active relationship already exists between these users');
    }
  }
});

export default mongoose.model('Relationship', relationshipSchema);
