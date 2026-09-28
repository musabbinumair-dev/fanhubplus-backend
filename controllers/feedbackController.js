import Feedback from '../models/Feedback.js';

export const createFeedback = async (req, res) => {
  try {
    const { type, message, subject, category, description } = req.body;
    const finalMessage = (message || description || '').trim();

    if (!type || !finalMessage) {
      return res.status(400).json({ message: 'Type and message are required' });
    }

    const normalizedType = type.toLowerCase();
    const validTypes = ['bug', 'suggestion', 'query'];
    if (!validTypes.includes(normalizedType)) {
      return res.status(400).json({
        message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const feedback = await Feedback.create({
      userId: req.user ? req.user._id : null,
      type: normalizedType,
      subject: subject || '',
      category: category || '',
      message: finalMessage,
      status: 'open',
    });

    const populated = await feedback.populate('userId', 'name email avatarUrl role');

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listFeedback = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (type) filter.type = type;

    const feedbacks = await Feedback.find(filter)
      .populate('userId', 'name email avatarUrl role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFeedbackById = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('userId', 'name email avatarUrl role');

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.status(200).json({
      success: true,
      feedback,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const normalizedStatus = status.toLowerCase();
    let mappedStatus = 'open';
    if (normalizedStatus === 'resolved') mappedStatus = 'resolved';
    else if (normalizedStatus === 'reviewed') mappedStatus = 'reviewed';
    else mappedStatus = 'open';

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    feedback.status = mappedStatus;
    await feedback.save();

    const populated = await feedback.populate('userId', 'name email avatarUrl role');

    res.status(200).json({
      success: true,
      message: `Feedback status updated to '${mappedStatus}'`,
      feedback: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};