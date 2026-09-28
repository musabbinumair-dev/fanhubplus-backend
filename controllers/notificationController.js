import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const user = req.user;
    const userId = user?._id;
    const roleStr = String(user?.role || '').toLowerCase();
    const isAdmin = roleStr === 'admin';

    let filter = {};

    if (userId) {
      filter.dismissedBy = { $ne: userId };
    }

    if (isAdmin) {
      // Admins see fan submission alerts, direct alerts, and all published content/announcements
      filter.$or = [
        { forRole: 'admin' },
        { type: 'pending_submission' },
        { recipient: userId },
        { isGlobal: true },
      ];
    } else if (userId) {
      // Regular logged-in users get public announcements and their personal updates (approvals, rejections, etc.)
      filter.$or = [
        { recipient: userId },
        { isGlobal: true, forRole: { $ne: 'admin' }, type: { $ne: 'pending_submission' } },
        { isGlobal: true, forRole: { $exists: false }, type: { $ne: 'pending_submission' } },
      ];
    } else {
      // Guests see general announcements
      filter.isGlobal = true;
      filter.type = { $ne: 'pending_submission' };
      filter.forRole = { $ne: 'admin' };
    }

    const items = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    let unreadCount = 0;
    const formatted = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let isUnread = false;

      if (userId) {
        if (item.isGlobal) {
          const alreadyRead =
            item.readBy &&
            item.readBy.some((id) => id.toString() === userId.toString());
          isUnread = !alreadyRead;
        } else {
          isUnread = !item.read;
        }
      } else {
        isUnread = false;
      }

      if (isUnread) {
        unreadCount++;
      }

      formatted.push({
        id: item._id,
        _id: item._id,
        title: item.title,
        message: item.message,
        type: item.type,
        link: item.link,
        thumbnailUrl: item.thumbnailUrl,
        forRole: item.forRole,
        isGlobal: item.isGlobal,
        unread: isUnread,
        createdAt: item.createdAt,
      });
    }

    res.status(200).json({
      success: true,
      count: formatted.length,
      unreadCount,
      notifications: formatted,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notif = await Notification.findById(id);
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notif.isGlobal) {
      const alreadyIn =
        notif.readBy &&
        notif.readBy.some((u) => u.toString() === userId.toString());
      if (!alreadyIn) {
        notif.readBy.push(userId);
        await notif.save();
      }
    } else if (
      notif.recipient &&
      notif.recipient.toString() === userId.toString()
    ) {
      notif.read = true;
      await notif.save();
    }

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const roleStr = String(req.user?.role || '').toLowerCase();
    const isAdmin = roleStr === 'admin';

    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );

    const globalQuery = isAdmin
      ? { isGlobal: true, readBy: { $ne: userId } }
      : { isGlobal: true, forRole: { $ne: 'admin' }, readBy: { $ne: userId } };

    await Notification.updateMany(globalQuery, { $addToSet: { readBy: userId } });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notif = await Notification.findById(id);
    if (!notif) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notif.isGlobal) {
      await Notification.findByIdAndUpdate(id, {
        $addToSet: { dismissedBy: userId },
      });
    } else if (
      notif.recipient &&
      notif.recipient.toString() === userId.toString()
    ) {
      await Notification.findByIdAndDelete(id);
    }

    res.status(200).json({ success: true, message: 'Notification removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const roleStr = String(req.user?.role || '').toLowerCase();
    const isAdmin = roleStr === 'admin';

    const globalQuery = isAdmin
      ? { isGlobal: true, dismissedBy: { $ne: userId } }
      : { isGlobal: true, forRole: { $ne: 'admin' }, dismissedBy: { $ne: userId } };

    await Notification.updateMany(globalQuery, { $addToSet: { dismissedBy: userId } });

    await Notification.deleteMany({ recipient: userId });

    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
