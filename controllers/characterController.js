import mongoose from 'mongoose';
import Character from '../models/Character.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';

const uploadBufferToCloudinary = (fileBuffer, folder = 'fanhub_plus/characters') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

const parseTags = (rawTags) => {
  if (!rawTags) return [];
  if (Array.isArray(rawTags)) return rawTags.map((t) => String(t).trim());
  if (typeof rawTags === 'string') {
    try {
      const parsed = JSON.parse(rawTags);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim());
    } catch {
      return rawTags
        .split(',')
        .map((t) => t.trim().replace(/^["'\[\]]+|["'\[\]]+$/g, ''));
    }
  }
  return [];
};

export const listCharacters = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.categoryId = category;
      } else {
        const foundCat = await Category.findOne({
          $or: [
            { slug: category.toLowerCase() },
            { name: new RegExp(`^${category}$`, 'i') }
          ]
        });
        if (foundCat) {
          filter.categoryId = foundCat._id;
        } else {
          filter.categoryId = category;
        }
      }
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { bio: searchRegex }, { tags: searchRegex }];
    }

    const characters = await Character.find(filter)
      .populate('categoryId', 'name slug iconUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: characters.length,
      characters,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCharacterById = async (req, res) => {
  try {
    const character = await Character.findById(req.params.id)
      .populate('categoryId', 'name slug iconUrl');

    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    res.status(200).json({
      success: true,
      character,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCharacter = async (req, res) => {
  try {
    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    let { categoryId, name, bio, imageUrl, tags, category, title } = bodyData;
    name = name || title;

    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
      const foundCat = await Category.findOne({
        name: new RegExp(`^${categoryId}$`, 'i'),
      });
      if (foundCat) categoryId = foundCat._id;
    }

    if (!categoryId && category) {
      const foundCat = await Category.findOne({
        name: new RegExp(`^${category}$`, 'i'),
      });
      if (foundCat) categoryId = foundCat._id;
    }

    if (!categoryId) {
      const firstCat = await Category.findOne();
      if (firstCat) categoryId = firstCat._id;
    }

    if (!categoryId || !name) {
      return res.status(400).json({ message: 'categoryId and name are required' });
    }

    let finalImageUrl = imageUrl || '';

    const uploadedFile =
      req.file ||
      req.files?.image?.[0] ||
      req.files?.imageUrl?.[0];

    if (uploadedFile) {
      const uploadResult = await uploadBufferToCloudinary(uploadedFile.buffer, 'fanhub_plus/characters');
      finalImageUrl = uploadResult.secure_url;
    }

    const character = await Character.create({
      categoryId,
      name,
      bio: bio || '',
      imageUrl: finalImageUrl,
      tags: parseTags(tags),
    });

    const populated = await character.populate('categoryId', 'name slug iconUrl');

    try {
      await Notification.create({
        title: `New Character: ${character.name}`,
        message: `A new character profile for "${character.name}" has been added in ${populated.categoryId?.name || 'the fandom'}!`,
        type: 'character',
        link: '/characters',
        thumbnailUrl: character.imageUrl || '',
        targetId: character._id,
        targetType: 'Character',
        forRole: 'all',
        isGlobal: true,
      });
    } catch (notifErr) {
      console.error('Failed to create character notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Character profile created successfully',
      character: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCharacter = async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    let { categoryId, name, bio, imageUrl, tags, category, title } = bodyData;
    name = name || title;

    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
      const foundCat = await Category.findOne({
        name: new RegExp(`^${categoryId}$`, 'i'),
      });
      if (foundCat) categoryId = foundCat._id;
    } else if (!categoryId && category) {
      const foundCat = await Category.findOne({
        name: new RegExp(`^${category}$`, 'i'),
      });
      if (foundCat) categoryId = foundCat._id;
    }

    if (categoryId) character.categoryId = categoryId;
    if (name) character.name = name;
    if (bio !== undefined) character.bio = bio;
    if (imageUrl !== undefined) character.imageUrl = imageUrl;
    if (tags !== undefined) character.tags = parseTags(tags);

    // Handle replacement file if provided
    const uploadedFile =
      req.file ||
      req.files?.image?.[0] ||
      req.files?.imageUrl?.[0];

    if (uploadedFile) {
      const uploadResult = await uploadBufferToCloudinary(uploadedFile.buffer, 'fanhub_plus/characters');
      character.imageUrl = uploadResult.secure_url;
    }

    await character.save();

    const populated = await character.populate('categoryId', 'name slug iconUrl');

    res.status(200).json({
      success: true,
      message: 'Character profile updated successfully',
      character: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteCharacter = async (req, res) => {
  try {
    const character = await Character.findById(req.params.id);
    if (!character) {
      return res.status(404).json({ message: 'Character not found' });
    }

    await Character.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Character profile deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};