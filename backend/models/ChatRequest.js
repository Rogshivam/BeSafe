import mongoose from 'mongoose';

const chatRequestSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
chatRequestSchema.index({ senderId: 1, receiverId: 1 });
chatRequestSchema.index({ receiverId: 1, status: 1 });

// Static method to check if users can chat (mutual emergency contacts)
chatRequestSchema.statics.canChat = async function(userId1, userId2) {
  const User = mongoose.model('User');
  
  const user1 = await User.findById(userId1);
  const user2 = await User.findById(userId2);
  
  if (!user1 || !user2) return false;
  
  // Check if user2 is in user1's emergency contacts
  const user1HasUser2 = user1.emergencyContacts.some(
    contact => contact.memberId.toString() === userId2
  );
  
  // Check if user1 is in user2's emergency contacts
  const user2HasUser1 = user2.emergencyContacts.some(
    contact => contact.memberId.toString() === userId1
  );
  
  return user1HasUser2 && user2HasUser1;
};

// Static method to get pending requests for a user
chatRequestSchema.statics.getPendingRequests = function(userId) {
  return this.find({
    receiverId: userId,
    status: 'pending'
  })
  .populate('senderId', 'name email profileImage')
  .sort({ createdAt: -1 });
};

// Static method to get request between two users
chatRequestSchema.statics.getRequestBetweenUsers = function(userId1, userId2) {
  return this.findOne({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 }
    ]
  })
  .sort({ createdAt: -1 });
};

const ChatRequest = mongoose.model('ChatRequest', chatRequestSchema);

export default ChatRequest;
