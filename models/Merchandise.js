import mongoose from 'mongoose';

const merchandiseSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  tag: {
    type: String,
    enum: ['Limited Edition', 'Pre-Order', 'Collectible'],
    required: true
  },
  isUpcoming: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  }
});

const Merchandise = mongoose.model('Merchandise', merchandiseSchema);
export default Merchandise;