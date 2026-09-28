import Bookmark from '../models/Bookmark.js';
import Content from '../models/Content.js';
import Character from '../models/Character.js';
import Merchandise from '../models/Merchandise.js';

export const listMyBookmarks = async (req, res) => {
  try {
    const { itemType } = req.query;
    const filter = { userId: req.user._id };

    if (itemType) {
      filter.itemType = itemType;
    }

    const bookmarks = await Bookmark.find(filter)
      .populate({
        path: 'itemId',
        populate: { path: 'categoryId', select: 'name slug iconUrl' },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookmarks.length,
      bookmarks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createBookmark = async (req, res) => {
  try {
    const { itemType, itemId, note } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({ message: 'itemType and itemId are required' });
    }

    const validTypes = ['content', 'character', 'merchandise'];
    if (!validTypes.includes(itemType)) {
      return res.status(400).json({
        message: `Invalid itemType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    let targetExists = null;
    if (itemType === 'content') {
      targetExists = await Content.findById(itemId);
    } else if (itemType === 'character') {
      targetExists = await Character.findById(itemId);
    } else if (itemType === 'merchandise') {
      targetExists = await Merchandise.findById(itemId);
    }

    if (!targetExists) {
      return res.status(404).json({ message: `Target ${itemType} item does not exist` });
    }

    const alreadyBookmarked = await Bookmark.findOne({
      userId: req.user._id,
      itemType,
      itemId,
    });

    if (alreadyBookmarked) {
      return res.status(400).json({ message: 'Item is already bookmarked' });
    }

    const bookmark = await Bookmark.create({
      userId: req.user._id,
      itemType,
      itemId,
      note: note ? note.trim() : '',
    });

    const populated = await bookmark.populate({
      path: 'itemId',
      populate: { path: 'categoryId', select: 'name slug iconUrl' },
    });

    res.status(201).json({
      success: true,
      message: 'Item bookmarked successfully',
      bookmark: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBookmarkNote = async (req, res) => {
  try {
    const { note } = req.body;

    if (note === undefined) {
      return res.status(400).json({ message: 'Note field is required' });
    }

    const bookmark = await Bookmark.findById(req.params.id);
    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    if (bookmark.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this bookmark' });
    }

    bookmark.note = note.trim();
    await bookmark.save();

    const populated = await bookmark.populate({
      path: 'itemId',
      populate: { path: 'categoryId', select: 'name slug iconUrl' },
    });

    res.status(200).json({
      success: true,
      message: 'Bookmark note updated successfully',
      bookmark: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBookmark = async (req, res) => {
  try {
    const bookmark = await Bookmark.findById(req.params.id);
    if (!bookmark) {
      return res.status(404).json({ message: 'Bookmark not found' });
    }

    if (bookmark.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this bookmark' });
    }

    await Bookmark.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Bookmark removed successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};