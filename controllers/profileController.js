import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -resetToken -resetTokenExpiry -__v')
      .populate('favoriteCategories', 'name slug iconUrl description');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, favoriteCategories, displayPrefs, avatarUrl, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (avatarUrl) user.avatarUrl = avatarUrl.trim();
    if (bio !== undefined) user.bio = bio.trim();

    if (favoriteCategories !== undefined) {
      const resolvedFavs = [];
      for (const item of favoriteCategories) {
        if (mongoose.Types.ObjectId.isValid(item)) {
          resolvedFavs.push(item);
        } else if (typeof item === 'string') {
          const found = await Category.findOne({
            $or: [
              { name: new RegExp(`^${item.trim()}$`, 'i') },
              { slug: item.toLowerCase().trim() }
            ]
          });
          if (found) resolvedFavs.push(found._id);
        } else if (item && item._id) {
          resolvedFavs.push(item._id);
        }
      }
      user.favoriteCategories = resolvedFavs;
    }

    if (displayPrefs) {
      if (typeof displayPrefs.darkMode === 'boolean') {
        user.displayPrefs.darkMode = displayPrefs.darkMode;
      }
      if (displayPrefs.fontSize) {
        user.displayPrefs.fontSize = displayPrefs.fontSize;
      }
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select('-passwordHash -resetToken -resetTokenExpiry -__v')
      .populate('favoriteCategories', 'name slug iconUrl description');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    const { avatarUrl } = req.body;

    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return res.status(400).json({ message: 'A valid avatarUrl string is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.avatarUrl = avatarUrl.trim();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};