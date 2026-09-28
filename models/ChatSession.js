import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'bot', 'system'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    enum: ['rule_based', 'ai_suggestion'],
    default: 'rule_based'
  },
  quickReplies: [
    {
      type: String
    }
  ],
  action: {
    label: {
      type: String,
      default: ''
    },
    path: {
      type: String,
      default: ''
    }
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [messageSchema],
  lastActive: {
    type: Date,
    default: Date.now
  }
});

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);
export default ChatSession;
