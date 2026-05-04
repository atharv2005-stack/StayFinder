import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;

export async function getDb() {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI is not defined. App will run with degraded functionality.');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
    });
    isConnected = true;
    console.log('Successfully connected to MongoDB.');
  } catch (err) {
    console.error('MongoDB connection error:', (err as Error).message);
    console.warn('Continuing without MongoDB connection (Development Mode). Some features may not work.');
    // We don't throw here to allow the server to start even if Atlas IP is not whitelisted
  }
}

export interface IUser extends mongoose.Document {
  id: string;
  name: string;
  email: string;
  password?: string;
  role?: string;
  user_type?: string;
  phone?: string;
  profile_completed?: boolean;
  profile_data?: any;
}

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String },
  user_type: { type: String },
  phone: { type: String },
  profile_completed: { type: Boolean, default: false },
  profile_data: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Avoid OverwriteModelError if the model is already compiled
export const User = (mongoose.models.User || mongoose.model<IUser>('User', userSchema)) as mongoose.Model<IUser>;

export interface IFeedback extends mongoose.Document {
  name: string;
  email: string;
  user_type: 'Student' | 'Working Professional' | 'Landlord';
  rating: number;
  experience_type: 'Finding PG' | 'Listing Property' | 'Roommate Matching' | 'Overall Experience';
  message: string;
  improvement?: string;
  createdAt: Date;
}

const feedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  user_type: { type: String, enum: ['Student', 'Working Professional', 'Landlord'], required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  experience_type: { type: String, enum: ['Finding PG', 'Listing Property', 'Roommate Matching', 'Overall Experience'], required: true },
  message: { type: String, required: true },
  improvement: { type: String }
}, {
  timestamps: true
});

export const Feedback = (mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', feedbackSchema)) as mongoose.Model<IFeedback>;

