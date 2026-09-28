import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
    required: true,
    enum: ['bug', 'suggestion', 'query', 'BUG', 'SUGGESTION', 'QUERY']
  },
  category: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'reviewed', 'resolved', 'OPEN', 'REVIEWED', 'RESOLVED', 'new', 'NEW'],
    default: 'open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;