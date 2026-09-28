import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Category from '../models/Category.js';
import cloudinary from '../config/cloudinary.js';

const uploadBufferToCloudinary = (fileBuffer, folder = 'fanhub_plus/events') => {
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

export const listEvents = async (req, res) => {
  try {
    const { city, category, search, upcoming } = req.query;
    const filter = {};

    if (city) {
      filter.city = new RegExp(`^${city.trim()}$`, 'i');
    }

    if (category) {
      filter.categoryId = category;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { subtitle: searchRegex },
        { description: searchRegex },
        { location: searchRegex },
      ];
    }

    if (upcoming === 'true') {
      filter.date = { $gte: new Date() };
    }

    const events = await Event.find(filter)
      .populate('categoryId', 'name slug iconUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('categoryId', 'name slug iconUrl');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createEvent = async (req, res) => {
  try {
    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    let {
      title,
      subtitle,
      description,
      city,
      location,
      format,
      date,
      time,
      attendees,
      status,
      categoryId,
      category,
      ticketLink,
      mapLink,
      imageUrl,
      latitude,
      longitude,
    } = bodyData;

    if (!title) {
      return res.status(400).json({ message: 'Event title is required' });
    }

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

    let parsedDate = new Date(date);
    if (!date || isNaN(parsedDate.getTime())) {
      parsedDate = new Date();
    }

    let finalImageUrl = imageUrl || '';
    const uploadedFile =
      req.file ||
      req.files?.image?.[0] ||
      req.files?.imageUrl?.[0];

    if (uploadedFile) {
      const uploadResult = await uploadBufferToCloudinary(uploadedFile.buffer, 'fanhub_plus/events');
      finalImageUrl = uploadResult.secure_url;
    }

    const event = await Event.create({
      title,
      subtitle: subtitle || '',
      description: description || subtitle || '',
      city: city || location || 'Online',
      location: location || city || 'Online',
      format: format || 'In-Person Convention',
      date: parsedDate,
      time: time || '10:00 AM - 06:00 PM',
      attendees: Number(attendees) || 0,
      status: (status || 'UPCOMING').toUpperCase(),
      imageUrl: finalImageUrl,
      categoryId: categoryId || null,
      ticketLink: ticketLink || '',
      mapLink: mapLink || '',
      latitude: (latitude !== undefined && latitude !== null && latitude !== '') ? Number(latitude) : null,
      longitude: (longitude !== undefined && longitude !== null && longitude !== '') ? Number(longitude) : null,
    });

    const populated = await event.populate('categoryId', 'name slug iconUrl');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const bodyData = {};
    for (const [key, val] of Object.entries(req.body)) {
      bodyData[key.trim()] = typeof val === 'string' ? val.trim() : val;
    }

    let {
      title,
      subtitle,
      description,
      city,
      location,
      format,
      date,
      time,
      attendees,
      status,
      categoryId,
      category,
      ticketLink,
      mapLink,
      imageUrl,
      latitude,
      longitude,
    } = bodyData;

    if (title) event.title = title;
    if (subtitle !== undefined) event.subtitle = subtitle;
    if (description !== undefined) event.description = description;
    if (city !== undefined) event.city = city;
    if (location !== undefined) event.location = location;
    if (format !== undefined) event.format = format;
    if (time !== undefined) event.time = time;
    if (attendees !== undefined) event.attendees = Number(attendees) || 0;
    if (status !== undefined) event.status = status.toUpperCase();
    if (ticketLink !== undefined) event.ticketLink = ticketLink;
    if (mapLink !== undefined) event.mapLink = mapLink;
    if (latitude !== undefined) event.latitude = (latitude !== null && latitude !== '') ? Number(latitude) : null;
    if (longitude !== undefined) event.longitude = (longitude !== null && longitude !== '') ? Number(longitude) : null;

    if (date) {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        event.date = parsedDate;
      }
    }

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

    if (categoryId) {
      event.categoryId = categoryId;
    }

    const uploadedFile =
      req.file ||
      req.files?.image?.[0] ||
      req.files?.imageUrl?.[0];

    if (uploadedFile) {
      const uploadResult = await uploadBufferToCloudinary(uploadedFile.buffer, 'fanhub_plus/events');
      event.imageUrl = uploadResult.secure_url;
    } else if (imageUrl) {
      event.imageUrl = imageUrl;
    }

    await event.save();

    const populated = await event.populate('categoryId', 'name slug iconUrl');

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event: populated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};