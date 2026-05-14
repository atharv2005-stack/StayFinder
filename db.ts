import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

if (!admin.apps.length) {
  try {
    let serviceAccount: any;

    // 1. Try to load from Environment Variable (Production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } 
    // 2. Fallback to Local JSON File (Development)
    else {
      const localKeyPath = join(process.cwd(), 'stayfinder-eb507-firebase-adminsdk-fbsvc-e68af7ab99.json');
      if (existsSync(localKeyPath)) {
        serviceAccount = JSON.parse(readFileSync(localKeyPath, 'utf8'));
      } else {
        throw new Error('Firebase Service Account key not found in ENV or local file.');
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Successfully connected to Firebase Firestore.');
  } catch (err: any) {
    console.error('Firebase initialization error:', err.message);
  }
}

export const db = admin.firestore();

// Interfaces for type safety
export interface IUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role?: string;
  user_type?: string;
  phone?: string;
  profile_completed?: boolean;
  profile_data?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface IFeedback {
  name: string;
  email: string;
  user_type: 'Student' | 'Working Professional' | 'Landlord';
  rating: number;
  experience_type: 'Finding PG' | 'Listing Property' | 'Roommate Matching' | 'Overall Experience';
  message: string;
  improvement?: string;
  createdAt: any;
}

export interface IPGListing {
  id?: string;
  name: string;
  address: string;
  distance_km: number;
  price_per_month: number;
  room_type: string;
  amenities: string[];
  contact: string;
  phone?: string;
  rating: number;
  gender: string;
  maps_link?: string;
  verified?: boolean;
  source?: string;
  description?: string;
  // Landlord-specific fields
  ownerId?: string;
  ownerName?: string;
  deposit?: number;
  sharing?: number;
  availableFrom?: string;
  rules?: string[];
  status?: 'Active' | 'Pending' | 'Booked';
  views?: number;
  createdAt?: any;
  updatedAt?: any;
}

// Helper function
export const getDb = async () => {
  return db;
};

// Firestore Collection References
export const UserCollection = db.collection('users');
export const FeedbackCollection = db.collection('feedbacks');
export const PGCollection = db.collection('pgs');
