import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemType: {
    type: String,
    required: true,
    enum: ['content', 'character', 'merchandise']
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'itemModel'
  },
  note: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

bookmarkSchema.virtual('itemModel').get(function () {
  if (this.itemType === 'content') return 'Content';
  if (this.itemType === 'character') return 'Character';
  if (this.itemType === 'merchandise') return 'Merchandise';
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export default Bookmark;