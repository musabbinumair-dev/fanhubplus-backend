import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  googleId: {
    type: String,
    default: null
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  favoriteCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  displayPrefs: {
    darkMode: {
      type: Boolean,
      default: false
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  resetToken: {
    type: String,
    default: null
  },
  resetTokenExpiry: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);
export default User;