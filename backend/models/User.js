import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  accuracy: {
    type: Number,
    default: 0
  }
});

const emergencyContactSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  relation: {
    type: String,
    enum: ['Parent', 'Friend', 'Guardian', 'Spouse', 'Sibling', 'Other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    required: true
  },
  isEmergencyContact: {
    type: Boolean,
    default: true
  }
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  age: {
    type: Number,
    min: [1, 'Age must be at least 1'],
    max: [120, 'Age cannot exceed 120']
  },
  userType: {
    type: String,
    enum: ['Individual', 'Member', 'Parent', 'Child'],
    required: true
  },
  status: {
    type: String,
    enum: ['Safe', 'Alert', 'Emergency'],
    default: 'Safe'
  },
  currentLocation: {
    type: locationSchema
  },
  locationHistory: [{
    type: locationSchema
  }],
  emergencyContacts: [emergencyContactSchema],
  profileImage: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  emergencySettings: {
    voiceDetectionEnabled: {
      type: Boolean,
      default: false
    },
    gestureDetectionEnabled: {
      type: Boolean,
      default: false
    },
    autoTriggerEnabled: {
      type: Boolean,
      default: false
    },
    panicWord: {
      type: String,
      default: 'help'
    }
  },
  resetPasswordToken: {
  type: String
},
resetPasswordExpire: {
  type: Date
},
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ status: 1 });
userSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });

// Middleware to update lastActive
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActive = new Date();
  }
  next();
});

// Method to add emergency contact
userSchema.methods.addEmergencyContact = async function(memberId, relation, priority) {
  const existingContact = this.emergencyContacts.find(
    contact => contact.memberId.toString() === memberId.toString()
  );
  
  if (existingContact) {
    existingContact.relation = relation;
    existingContact.priority = priority;
  } else {
    this.emergencyContacts.push({ memberId, relation, priority });
  }
  
  await this.save();
};

// Method to update location
userSchema.methods.updateLocation = async function(latitude, longitude, accuracy = 0) {
  const newLocation = {
    latitude,
    longitude,
    timestamp: new Date(),
    accuracy
  };
  
  this.currentLocation = newLocation;
  this.locationHistory.push(newLocation);
  
  // Keep only last 50 locations in history
  if (this.locationHistory.length > 50) {
    this.locationHistory = this.locationHistory.slice(-50);
  }
  
  await this.save();
};

// Method to get high priority contacts
userSchema.methods.getHighPriorityContacts = function() {
  return this.emergencyContacts
    .filter(contact => contact.priority === 'High')
    .map(contact => contact.memberId);
};

// Method to check if user is in emergency
userSchema.methods.isInEmergency = function() {
  return this.status === 'Emergency';
};

// Static method to find nearby users
userSchema.statics.findNearbyUsers = function(latitude, longitude, maxDistance = 1000) {
  return this.find({
    'currentLocation.latitude': { 
      $gte: latitude - (maxDistance / 111), 
      $lte: latitude + (maxDistance / 111) 
    },
    'currentLocation.longitude': { 
      $gte: longitude - (maxDistance / (111 * Math.cos(latitude * Math.PI / 180))), 
      $lte: longitude + (maxDistance / (111 * Math.cos(latitude * Math.PI / 180))) 
    },
    isActive: true
  });
};

const User = mongoose.model('User', userSchema);

export default User;
