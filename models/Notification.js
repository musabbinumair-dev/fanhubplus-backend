import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: [
      'content',
      'character',
      'merchandise',
      'submission_approved',
      'submission_rejected',
      'pending_submission',
      'system',
    ],
    default: 'system',
  },
  link: {
    type: String,
    default: '',
  },
  thumbnailUrl: {
    type: String,
    default: '',
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  targetType: {
    type: String,
    default: '',
  },
  forRole: {
    type: String,
    enum: ['all', 'admin', 'user'],
    default: 'all',
  },
  isGlobal: {
    type: Boolean,
    default: false,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
  },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  dismissedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
