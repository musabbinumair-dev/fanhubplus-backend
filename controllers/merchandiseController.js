import mongoose from 'mongoose';
import Merchandise from '../models/Merchandise.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';

const uploadBufferToCloudinary = (fileBuffer, folder = 'fanhub_plus/merchandise') => {
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

export const listMerchandise = async (req, res) => {
  try {
    const { category, isUpcoming, tag, search } = req.query;
    const filter = {};

    if (category) filter.categoryId = category;
    if (isUpcoming !== undefined) filter.isUpcoming = isUpcoming === 'true';
    if (tag) filter.tag = tag;

    if (search) {
      filter.name = new RegExp(search.trim(), 'i');
    }

    const merchandise = await Merchandise.find(filter)
      .populate('categoryId', 'name slug iconUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: merchandise.length,
      merchandise,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMerchandiseById = async (req, res) => {
  try {
    const item = await Merchandise.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('categoryId', 'name slug iconUrl');

    if (!item) {
      return res.status(404).json({ message: 'Merchandise item not found' });
    }

    res.status(200).json({
      success: true,
      merchandise: item,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createMerchandise = async (req, res) => {
  try {
    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    let categoryId = bodyData.categoryId || bodyData.category;
    let name = bodyData.name || bodyData.title;
    let tag = bodyData.tag || bodyData.tags;
    let isUpcoming = bodyData.isUpcoming;
    let imageUrl = bodyData.imageUrl;

    if (categoryId && !mongoose.Types.ObjectId.isValid(categoryId)) {
      const foundCat = await Category.findOne({
        name: new RegExp(`^${categoryId}$`, 'i'),
      });
      if (foundCat) categoryId = foundCat._id;
    }

    if (!categoryId && bodyData.category) {
      const foundCat = await Category.findOne({
        name: new RegExp(`^${bodyData.category}$`, 'i'),
      });
      if (foundCat) categoryId = foundCat._id;
    }

    if (!categoryId) {
      const firstCat = await Category.findOne();
      if (firstCat) categoryId = firstCat._id;
    }

    if (!categoryId || !name || !tag) {
      return res.status(400).json({ message: 'categoryId, name, and tag are required' });
    }

    const validTags = ['Limited Edition', 'Pre-Order', 'Collectible'];
    if (!validTags.includes(tag)) {
      return res.status(400).json({
        message: `Invalid tag. Must be one of: ${validTags.join(', ')}`,
      });
    }

    let finalImageUrl = typeof imageUrl === 'string' ? imageUrl : '';

    const uploadedFile =
      req.file ||
      req.files?.image?.[0] ||
      req.files?.imageUrl?.[0];

    if (uploadedFile) {
      const uploadResult = await uploadBufferToCloudinary(uploadedFile.buffer);
      finalImageUrl = uploadResult.secure_url;
    }

    const item = await Merchandise.create({
      categoryId,
      name,
      tag,
      isUpcoming: isUpcoming === 'true' || isUpcoming === true,
      imageUrl: finalImageUrl,
    });

    const populated = await item.populate('categoryId', 'name slug iconUrl');

    try {
      await Notification.create({
        title: `New Merchandise: ${item.name}`,
        message: `New drop! "${item.name}" has landed in the merchandise showcase (${item.tag}).`,
        type: 'merchandise',
        link: '/merchandise',
        thumbnailUrl: item.imageUrl || '',
        targetId: item._id,
        targetType: 'Merchandise',
        forRole: 'all',
        isGlobal: true,
      });
    } catch (notifErr) {
      console.error('Failed to create merchandise notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Merchandise item added successfully',
      merchandise: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMerchandise = async (req, res) => {
  try {
    const item = await Merchandise.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Merchandise item not found' });
    }

    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    const { categoryId, name, imageUrl, isUpcoming } = bodyData;
    const tag = bodyData.tag || bodyData.tags;

    if (categoryId) item.categoryId = categoryId;
    if (name) item.name = name;
    if (imageUrl !== undefined && typeof imageUrl === 'string') item.imageUrl = imageUrl;
    if (isUpcoming !== undefined) {
      item.isUpcoming = isUpcoming === 'true' || isUpcoming === true;
    }

    if (tag) {
      const validTags = ['Limited Edition', 'Pre-Order', 'Collectible'];
      if (!validTags.includes(tag)) {
        return res.status(400).json({
          message: `Invalid tag. Must be one of: ${validTags.join(', ')}`,
        });
      }
      item.tag = tag;
    }

    const uploadedFile =
      req.file ||
      req.files?.image?.[0] ||
      req.files?.imageUrl?.[0];

    if (uploadedFile) {
      const uploadResult = await uploadBufferToCloudinary(uploadedFile.buffer);
      item.imageUrl = uploadResult.secure_url;
    }

    await item.save();

    const populated = await item.populate('categoryId', 'name slug iconUrl');

    res.status(200).json({
      success: true,
      message: 'Merchandise item updated successfully',
      merchandise: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMerchandise = async (req, res) => {
  try {
    const item = await Merchandise.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Merchandise item not found' });
    }

    await Merchandise.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Merchandise item deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};