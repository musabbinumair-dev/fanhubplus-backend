import User from '../models/User.js';
import Bookmark from '../models/Bookmark.js';
import Content from '../models/Content.js';
import Category from '../models/Category.js';
import Character from '../models/Character.js';
import Merchandise from '../models/Merchandise.js';
import Feedback from '../models/Feedback.js';

export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId)
      .select('name email avatarUrl favoriteCategories displayPrefs createdAt')
      .populate('favoriteCategories', 'name slug iconUrl description');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hour = new Date().getHours();
    let timeGreeting = 'Hello';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour >= 12 && hour < 18) {
      timeGreeting = 'Good afternoon';
    } else {
      timeGreeting = 'Good evening';
    }
    const greeting = `${timeGreeting}, ${user.name}! Welcome back to FanHub!`;

    // 1. Fetch user bookmarks (up to 5 items)
    const rawBookmarks = await Bookmark.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const populatedBookmarks = await Promise.all(
      rawBookmarks.map(async (b) => {
        let populatedItem = null;
        if (b.itemType === 'content') {
          populatedItem = await Content.findById(b.itemId).populate('categoryId', 'name slug iconUrl');
        } else if (b.itemType === 'character') {
          populatedItem = await Character.findById(b.itemId).populate('categoryId', 'name slug iconUrl');
        } else if (b.itemType === 'merchandise') {
          populatedItem = await Merchandise.findById(b.itemId).populate('categoryId', 'name slug iconUrl');
        }
        return {
          id: b._id,
          _id: b._id,
          itemType: b.itemType,
          note: b.note,
          createdAt: b.createdAt,
          item: populatedItem,
        };
      })
    );
    const validBookmarks = populatedBookmarks.filter((b) => b.item != null).slice(0, 5);

    // 2. Fetch top 5 recent contents
    const recentContents = await Content.find({ status: 'published' })
      .populate('categoryId', 'name slug iconUrl')
      .sort({ createdAt: -1 })
      .limit(5);

    // 3. Fetch top 5 trending contents
    const trendingContents = await Content.find({ status: 'published' })
      .populate('categoryId', 'name slug iconUrl')
      .sort({ popularityScore: -1, thumbsUpCount: -1, createdAt: -1 })
      .limit(5);

    // 4. Favorite Fandoms
    let favoriteFandoms = user.favoriteCategories || [];
    if (favoriteFandoms.length === 0) {
      favoriteFandoms = await Category.find().limit(8);
    }

    res.status(200).json({
      success: true,
      dashboard: {
        greeting,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          displayPrefs: user.displayPrefs,
        },
        favoriteFandoms,
        bookmarkedItems: validBookmarks,
        recentContents,
        trendingContents,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};