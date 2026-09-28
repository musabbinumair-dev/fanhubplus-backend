import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

export const listUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash -resetToken -resetTokenExpiry -__v')
      .populate('favoriteCategories', 'name slug iconUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id)
      .select('-passwordHash -resetToken -resetTokenExpiry -__v')
      .populate('favoriteCategories', 'name slug iconUrl');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, username, email, password, role, bio, avatarUrl } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password || 'Password123!', salt);

    let normalizedRole = (role || 'user').toLowerCase();
    if (!['user', 'admin'].includes(normalizedRole)) {
      normalizedRole = 'user';
    }

    let normalizedUsername = username ? username.trim() : `@${name.toLowerCase().replace(/\s+/g, '')}`;
    if (!normalizedUsername.startsWith('@')) {
      normalizedUsername = `@${normalizedUsername}`;
    }

    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: normalizedRole,
      bio: bio || '',
      avatarUrl: avatarUrl || '',
      isVerified: true,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    let normalizedRole = (role || '').toLowerCase();
    if (!['user', 'admin'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = normalizedRole;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated to ${normalizedRole}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    let { isActive, status } = req.body;
    if (status !== undefined) {
      isActive = status.toUpperCase() === 'ACTIVE';
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive or status is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Administrators cannot deactivate their own account' });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account has been ${isActive ? 'activated' : 'deactivated'}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Administrators cannot delete their own account' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};