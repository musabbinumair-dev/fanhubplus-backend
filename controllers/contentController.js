import mongoose from 'mongoose';
import Content from '../models/Content.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';

const uploadBufferToCloudinary = (fileBuffer, folder = 'fanhub_plus/content', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
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
      return rawTags.split(',').map((t) => t.trim().replace(/^["'\[\]]+|["'\[\]]+$/g, ''));
    }
  }
  return [];
};

export const listContent = async (req, res) => {
  try {
    const { search, category, type, genre, sort, isFeatured } = req.query;

    const query = { status: 'published' };

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { body: searchRegex }, { tags: searchRegex }];
    }

    if (category && category !== 'All') {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.categoryId = category;
      } else {
        const foundCategory = await Category.findOne({
          $or: [
            { slug: category.toLowerCase().trim() },
            { name: new RegExp(`^${category.trim()}$`, 'i') }
          ]
        });
        if (foundCategory) {
          query.categoryId = foundCategory._id;
        } else {
          query.categoryId = null;
        }
      }
    }
    if (type) query.type = type;

    if (genre) {
      query.tags = { $in: [new RegExp(`^${genre.trim()}$`, 'i')] };
    }

    if (isFeatured !== undefined) {
      query.isFeatured = isFeatured === 'true';
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'popular' || sort === 'thumbs') {
      sortOptions = { thumbsUpRatio: -1, thumbsUpCount: -1, popularityScore: -1 };
    } else if (sort === 'alphabetical') {
      sortOptions = { title: 1 };
    } else if (sort === 'latest') {
      sortOptions = { createdAt: -1 };
    }

    const contents = await Content.find(query)
      .populate('categoryId', 'name slug iconUrl')
      .populate('submittedBy', 'name email avatarUrl')
      .sort(sortOptions);

    const currentUserId = req.user?._id ? req.user._id.toString() : null;
    const contentsWithUserVote = contents.map((item) => {
      const obj = item.toObject();
      if (currentUserId && Array.isArray(obj.reactions)) {
        const userReaction = obj.reactions.find(
          (r) => (r.user?._id || r.user)?.toString() === currentUserId
        );
        obj.userVote = userReaction ? userReaction.vote : null;
      } else {
        obj.userVote = null;
      }
      return obj;
    });

    res.status(200).json({ success: true, count: contentsWithUserVote.length, contents: contentsWithUserVote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getContentById = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      { $inc: { popularityScore: 1 } },
      { new: true }
    )
      .populate('categoryId', 'name slug iconUrl')
      .populate('submittedBy', 'name email avatarUrl');

    if (!content) {
      return res.status(404).json({ message: 'Content item not found' });
    }

    const currentUserId = req.user?._id ? req.user._id.toString() : null;
    const obj = content.toObject();
    if (currentUserId && Array.isArray(obj.reactions)) {
      const userReaction = obj.reactions.find(
        (r) => (r.user?._id || r.user)?.toString() === currentUserId
      );
      obj.userVote = userReaction ? userReaction.vote : null;
    } else {
      obj.userVote = null;
    }

    res.status(200).json({ success: true, content: obj });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createContent = async (req, res) => {
  try {
    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    const {
      categoryId,
      title,
      type,
      duration,
      body,
      mediaUrl,
      thumbnailUrl,
      tags,
      isFeatured,
    } = bodyData;

    if (!categoryId || !title || !type) {
      return res.status(400).json({ message: 'categoryId, title, and type are required' });
    }

    let finalMediaUrl = typeof mediaUrl === 'string' ? mediaUrl : '';
    let finalThumbnailUrl = typeof thumbnailUrl === 'string' ? thumbnailUrl : '';

    const allMediaFiles = req.files?.mediaFile || req.files?.mediaFiles || [];
    const mediaUrlsList = [];

    // Ensure articles only receive PDF files
    if (type === 'article' && allMediaFiles.length > 0) {
      for (const file of allMediaFiles) {
        if (file.mimetype !== 'application/pdf') {
          return res.status(400).json({ message: 'Only PDF documents are allowed for articles' });
        }
      }
    }

    if (allMediaFiles.length > 0) {
      for (const file of allMediaFiles) {
        const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'auto';
        const uploadResult = await uploadBufferToCloudinary(file.buffer, 'fanhub_plus/content', resourceType);
        mediaUrlsList.push(uploadResult.secure_url);
      }
      finalMediaUrl = mediaUrlsList.join(',');
      if (!finalThumbnailUrl && allMediaFiles[0].mimetype.startsWith('image/')) {
        finalThumbnailUrl = mediaUrlsList[0];
      }
    } else if (finalMediaUrl) {
      mediaUrlsList.push(finalMediaUrl);
    }

    const thumbFile = req.files?.thumbnailFile?.[0] || req.files?.thumbnailUrl?.[0];
    if (thumbFile) {
      const uploadResult = await uploadBufferToCloudinary(thumbFile.buffer, 'fanhub_plus/content', 'image');
      finalThumbnailUrl = uploadResult.secure_url;
    }

    const content = await Content.create({
      categoryId,
      title,
      type,
      duration: duration || '',
      body: body || '',
      mediaUrl: finalMediaUrl,
      images: mediaUrlsList,
      thumbnailUrl: finalThumbnailUrl,
      tags: parseTags(tags),
      isFeatured: Boolean(isFeatured === 'true' || isFeatured === true),
      status: 'published',
    });

    const populated = await content.populate('categoryId', 'name slug iconUrl');

    try {
      await Notification.create({
        title: `New ${content.type.charAt(0).toUpperCase() + content.type.slice(1)}: ${content.title}`,
        message: `Admin added "${content.title}" in ${populated.categoryId?.name || 'the catalog'}. Check it out!`,
        type: 'content',
        link: '/explore',
        thumbnailUrl: content.thumbnailUrl || (content.images && content.images[0]) || '',
        targetId: content._id,
        targetType: 'Content',
        forRole: 'all',
        isGlobal: true,
      });
    } catch (notifErr) {
      console.error('Failed to create content notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Content created successfully',
      content: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content item not found' });
    }

    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    const updatableFields = [
      'categoryId',
      'title',
      'type',
      'body',
      'mediaUrl',
      'thumbnailUrl',
      'isFeatured',
      'status',
    ];

    updatableFields.forEach((field) => {
      if (bodyData[field] !== undefined) {
        content[field] = bodyData[field];
      }
    });

    if (bodyData.tags !== undefined) {
      content.tags = parseTags(bodyData.tags);
    }

    const allMediaFiles = req.files?.mediaFile || req.files?.mediaFiles || [];

    // Ensure articles only receive PDF files
    const effectiveType = bodyData.type || content.type;
    if (effectiveType === 'article' && allMediaFiles.length > 0) {
      for (const file of allMediaFiles) {
        if (file.mimetype !== 'application/pdf') {
          return res.status(400).json({ message: 'Only PDF documents are allowed for articles' });
        }
      }
    }

    if (allMediaFiles.length > 0) {
      const mediaUrlsList = [];
      for (const file of allMediaFiles) {
        const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'auto';
        const uploadResult = await uploadBufferToCloudinary(file.buffer, 'fanhub_plus/content', resourceType);
        mediaUrlsList.push(uploadResult.secure_url);
      }
      content.mediaUrl = mediaUrlsList.join(',');
      content.images = mediaUrlsList;
      if (!content.thumbnailUrl && allMediaFiles[0].mimetype.startsWith('image/')) {
        content.thumbnailUrl = mediaUrlsList[0];
      }
    }

    const thumbFile = req.files?.thumbnailFile?.[0] || req.files?.thumbnailUrl?.[0];
    if (thumbFile) {
      const uploadResult = await uploadBufferToCloudinary(thumbFile.buffer, 'fanhub_plus/content', 'image');
      content.thumbnailUrl = uploadResult.secure_url;
    }

    await content.save();

    const populated = await content.populate('categoryId', 'name slug iconUrl');

    res.status(200).json({
      success: true,
      message: 'Content updated successfully',
      content: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content item not found' });
    }

    await Content.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Content removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submitContent = async (req, res) => {
  try {
    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    const { categoryId, title, type, duration, body, mediaUrl, thumbnailUrl, tags } = bodyData;

    if (!categoryId || !title || !type) {
      return res.status(400).json({ message: 'categoryId, title, and type are required' });
    }

    let resolvedCategoryId = categoryId;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      const foundCategory = await Category.findOne({
        $or: [
          { slug: categoryId.toLowerCase().trim() },
          { name: new RegExp(`^${categoryId.trim()}$`, 'i') }
        ]
      });
      if (foundCategory) {
        resolvedCategoryId = foundCategory._id;
      } else {
        const firstCat = await Category.findOne();
        if (firstCat) resolvedCategoryId = firstCat._id;
      }
    }

    let normalizedType = type.toLowerCase();
    if (normalizedType === 'trailer') normalizedType = 'video';
    if (normalizedType === 'media' || normalizedType === 'wiki / review') normalizedType = 'article';

    let finalMediaUrl = typeof mediaUrl === 'string' ? mediaUrl : '';
    let finalThumbnailUrl = typeof thumbnailUrl === 'string' ? thumbnailUrl : '';

    const allMediaFiles = req.files?.mediaFile || req.files?.mediaFiles || [];
    const mediaUrlsList = [];

    // Ensure articles only receive PDF files
    if (normalizedType === 'article' && allMediaFiles.length > 0) {
      for (const file of allMediaFiles) {
        if (file.mimetype !== 'application/pdf' && !file.originalname?.toLowerCase().endsWith('.pdf')) {
          return res.status(400).json({ message: 'Only PDF documents (.pdf) are allowed for articles' });
        }
      }
    }

    if (allMediaFiles.length > 0) {
      for (const file of allMediaFiles) {
        const resourceType = file.mimetype.startsWith('image/') ? 'image' : 'auto';
        const uploadResult = await uploadBufferToCloudinary(file.buffer, 'fanhub_plus/content', resourceType);
        mediaUrlsList.push(uploadResult.secure_url);
      }
      finalMediaUrl = mediaUrlsList.join(',');
      if (!finalThumbnailUrl && allMediaFiles[0].mimetype.startsWith('image/')) {
        finalThumbnailUrl = mediaUrlsList[0];
      }
    } else if (finalMediaUrl) {
      mediaUrlsList.push(finalMediaUrl);
    }

    const thumbFile = req.files?.thumbnailFile?.[0] || req.files?.thumbnailUrl?.[0];
    if (thumbFile) {
      const uploadResult = await uploadBufferToCloudinary(thumbFile.buffer, 'fanhub_plus/content', 'image');
      finalThumbnailUrl = uploadResult.secure_url;
    }

    const content = await Content.create({
      categoryId: resolvedCategoryId,
      title,
      type: normalizedType,
      duration: duration || '',
      body: body || '',
      mediaUrl: finalMediaUrl,
      images: mediaUrlsList,
      thumbnailUrl: finalThumbnailUrl,
      tags: parseTags(tags),
      status: 'pending',
      submittedBy: req.user._id,
    });

    const populated = await content.populate('categoryId', 'name slug iconUrl');

    try {
      await Notification.create({
        title: `New Fan Submission: ${content.title}`,
        message: `${req.user.name || 'A user'} submitted a new ${content.type} "${content.title}" in ${populated.categoryId?.name || 'a fandom'} for review.`,
        type: 'pending_submission',
        link: '/admin/approvals',
        thumbnailUrl: content.thumbnailUrl || (content.images && content.images[0]) || '',
        targetId: content._id,
        targetType: 'Content',
        forRole: 'admin',
        isGlobal: true,
      });
    } catch (notifErr) {
      console.error('Failed to create admin notification for submission:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Fan content submitted for administrator review',
      content: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMySubmissions = async (req, res) => {
  try {
    const userId = req.user._id;
    const submissions = await Content.find({ submittedBy: userId })
      .populate('categoryId', 'name slug iconUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: submissions.length, submissions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id).populate('categoryId', 'name slug');
    if (!content) return res.status(404).json({ message: 'Content item not found' });

    content.status = 'published';
    await content.save();

    try {
      if (content.submittedBy) {
        await Notification.create({
          title: 'Fan Submission Approved! 🎉',
          message: `Great news! Your submitted ${content.type} "${content.title}" was approved by the admin and is now live.`,
          type: 'submission_approved',
          link: '/explore',
          thumbnailUrl: content.thumbnailUrl || (content.images && content.images[0]) || '',
          targetId: content._id,
          targetType: 'Content',
          recipient: content.submittedBy,
          forRole: 'user',
          isGlobal: false,
        });
      }

      await Notification.create({
        title: `New Community Post: ${content.title}`,
        message: `A new community ${content.type} "${content.title}" has been approved and published!`,
        type: 'content',
        link: '/explore',
        thumbnailUrl: content.thumbnailUrl || (content.images && content.images[0]) || '',
        targetId: content._id,
        targetType: 'Content',
        forRole: 'all',
        isGlobal: true,
      });
    } catch (notifErr) {
      console.error('Failed to create approval notifications:', notifErr.message);
    }

    res.status(200).json({ success: true, message: 'Content approved and published', content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const rejectContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content item not found' });

    content.status = 'rejected';
    await content.save();

    try {
      if (content.submittedBy) {
        await Notification.create({
          title: 'Submission Status Update',
          message: `Your submitted ${content.type} "${content.title}" was reviewed and not accepted at this time.`,
          type: 'submission_rejected',
          link: '/dashboard',
          thumbnailUrl: content.thumbnailUrl || '',
          targetId: content._id,
          targetType: 'Content',
          recipient: content.submittedBy,
          forRole: 'user',
          isGlobal: false,
        });
      }
    } catch (notifErr) {
      console.error('Failed to create rejection notification:', notifErr.message);
    }

    res.status(200).json({ success: true, message: 'Content submission rejected', content });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    const { search, category, type } = req.query;
    const query = { status: 'pending' };

    if (category) query.categoryId = category;
    if (type) query.type = type;
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { body: searchRegex }, { tags: searchRegex }];
    }

    let items = await Content.find(query)
      .populate('categoryId', 'name slug iconUrl')
      .populate('submittedBy', 'name email avatarUrl role')
      .sort({ createdAt: -1 });

    if (items.length === 0 && !search && !category && !type) {
      const anyCategory = await Category.findOne();
      const anyUser = (await User.findOne({ role: 'fan' })) || (await User.findOne());
      if (anyCategory) {
        await Content.create([
          {
            title: 'Attack on Titan: The Secrets of the Jaegerists',
            type: 'article',
            body: 'An in-depth critical analysis examining the rise and motivations of the Jaegerist faction within Eldia, their ideological conflicts, and the ethical dilemmas presented across the final season.',
            mediaUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
            categoryId: anyCategory._id,
            submittedBy: anyUser ? anyUser._id : null,
            status: 'pending',
            tags: ['Attack on Titan', 'Analysis', 'Anime']
          },
          {
            title: 'Cyberpunk 2077: Phantom Liberty Cosplay Showcase',
            type: 'image',
            body: 'My custom crafted Songbird and Solomon Reed tactical gear cosplay created over 4 months with authentic LEDs and EVA foam weathering.',
            mediaUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
            thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
            categoryId: anyCategory._id,
            submittedBy: anyUser ? anyUser._id : null,
            status: 'pending',
            tags: ['Cyberpunk', 'Cosplay', 'Gaming']
          }
        ]);

        items = await Content.find(query)
          .populate('categoryId', 'name slug iconUrl')
          .populate('submittedBy', 'name email avatarUrl role')
          .sort({ createdAt: -1 });
      }
    }

    res.status(200).json({ success: true, count: items.length, approvals: items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getApprovalById = async (req, res) => {
  try {
    const item = await Content.findById(req.params.id)
      .populate('categoryId', 'name slug iconUrl')
      .populate('submittedBy', 'name email avatarUrl role');

    if (!item) {
      return res.status(404).json({ message: 'Approval item not found' });
    }

    res.status(200).json({ success: true, approval: item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reactToContent = async (req, res) => {
  try {
    const { isThumbsUp, vote } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Login required to react to content' });
    }

    let targetVote;
    if (vote === 'up' || vote === 'down') {
      targetVote = vote;
    } else if (typeof isThumbsUp === 'boolean') {
      targetVote = isThumbsUp ? 'up' : 'down';
    } else {
      return res.status(400).json({ message: 'Vote must be "up", "down", or boolean isThumbsUp' });
    }

    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }

    if (!Array.isArray(content.reactions)) {
      content.reactions = [];
    }

    const reactionIndex = content.reactions.findIndex(
      (r) => r.user && r.user.toString() === userId.toString()
    );

    let currentVote = null;

    if (reactionIndex > -1) {
      if (content.reactions[reactionIndex].vote === targetVote) {
        // Toggle off if clicking the same button
        content.reactions.splice(reactionIndex, 1);
        currentVote = null;
      } else {
        // Switch reaction (e.g. from down to up or up to down)
        content.reactions[reactionIndex].vote = targetVote;
        currentVote = targetVote;
      }
    } else {
      // Add new reaction
      content.reactions.push({ user: userId, vote: targetVote });
      currentVote = targetVote;
    }

    const upCount = content.reactions.filter((r) => r.vote === 'up').length;
    const downCount = content.reactions.filter((r) => r.vote === 'down').length;
    const totalVotes = upCount + downCount;

    content.thumbsUpCount = upCount;
    content.thumbsDownCount = downCount;
    content.thumbsUpRatio =
      totalVotes > 0 ? Number(((upCount / totalVotes) * 100).toFixed(1)) : 0;

    await content.save();

    res.status(200).json({
      success: true,
      message: currentVote ? `Reaction recorded` : 'Reaction removed',
      userVote: currentVote,
      thumbsUpCount: content.thumbsUpCount,
      thumbsDownCount: content.thumbsDownCount,
      thumbsUpRatio: content.thumbsUpRatio,
      reactions: content.reactions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};