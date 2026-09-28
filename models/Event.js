import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subtitle: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: 'Online',
      trim: true
    },
    location: {
      type: String,
      default: '',
      trim: true
    },
    format: {
      type: String,
      default: 'In-Person Convention'
    },
    date: {
      type: Date,
      required: true
    },
    time: {
      type: String,
      default: ''
    },
    attendees: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: 'UPCOMING'
    },
    imageUrl: {
      type: String,
      default: ''
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    ticketLink: {
      type: String,
      default: ''
    },
    mapLink: {
      type: String,
      default: ''
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    }
  },
  { timestamps: true }
);

const Event = mongoose.model('Event', eventSchema);
export default Event;