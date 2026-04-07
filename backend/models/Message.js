import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency'
  },
  messageType: {
    type: String,
    enum: ['Text', 'Image', 'Audio', 'Location', 'System'],
    default: 'Text'
  },
  content: {
    type: String,
    required: function() {
      return this.messageType === 'Text' || this.messageType === 'System';
    }
  },
  mediaUrl: {
    type: String,
    required: function() {
      return this.messageType === 'Image' || this.messageType === 'Audio';
    }
  },
  location: {
    latitude: {
      type: Number
    },
    longitude: {
      type: Number
    },
    address: {
      type: String
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, isRead: 1 });
messageSchema.index({ emergencyId: 1 });
messageSchema.index({ createdAt: -1 });

// Method to mark as read
messageSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

// Method to mark as delivered
messageSchema.methods.markAsDelivered = async function() {
  if (!this.delivered) {
    this.delivered = true;
    this.deliveredAt = new Date();
    await this.save();
  }
};

// Static method to get conversation
messageSchema.statics.getConversation = async function(userId1, userId2, limit = 50) {
  return this.find({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 }
    ]
  })
  .populate('senderId', 'name profileImage')
  .populate('receiverId', 'name profileImage')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get unread messages
messageSchema.statics.getUnreadMessages = function(userId) {
  return this.find({
    receiverId: userId,
    isRead: false
  })
  .populate('senderId', 'name profileImage')
  .sort({ createdAt: -1 });
};

// Static method to get emergency messages
messageSchema.statics.getEmergencyMessages = function(emergencyId) {
  return this.find({ emergencyId })
    .populate('senderId', 'name profileImage')
    .populate('receiverId', 'name profileImage')
    .sort({ createdAt: 1 });
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
