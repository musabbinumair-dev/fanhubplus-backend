import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Content from '../models/Content.js';

const seedAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('AdminPassword123!', salt);

      await User.create({
        name: 'System Admin',
        email: 'admin@fanhub.com',
        passwordHash,
        role: 'admin',
        isVerified: true,
      });
      console.log('Default admin seeded: admin@fanhub.com');
    }
  } catch (error) {
    console.error('Admin seed error:', error.message);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedAdminUser();
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
  }
};

export default connectDB;