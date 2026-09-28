import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['article', 'video', 'audio', 'image'],
  },
  body: {
    type: String,
    default: '',
  },
  mediaUrl: {
    type: String,
    default: '',
  },
  duration: {
    type: String,
    default: '',
  },
  images: [
    {
      type: String,
    },
  ],
  thumbnailUrl: {
    type: String,
    default: '',
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  popularityScore: {
    type: Number,
    default: 0,
  },
  thumbsUpCount: {
    type: Number,
    default: 0,
  },
  thumbsDownCount: {
    type: Number,
    default: 0,
  },
  thumbsUpRatio: {
    type: Number,
    default: 0, 
  },
  reactions: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      vote: {
        type: String,
        enum: ['up', 'down'],
      },
    },
  ],
  isFeatured: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['published', 'pending', 'rejected'],
    default: 'published',
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Content = mongoose.model('Content', contentSchema);
export default Content;