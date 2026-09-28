import mongoose from 'mongoose';

const characterSchema = new mongoose.Schema({
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
  bio: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }]
});

const Character = mongoose.model('Character', characterSchema);
export default Character;