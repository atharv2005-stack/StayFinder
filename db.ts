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
      const localKeyPath = join(process.cwd(), 'stayfinder-eb507-firebase-adminsdk-fbsvc-b58e13bb59.json');
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

// Helper function
export const getDb = async () => {
  return db;
};

// Firestore Collection References
export const UserCollection = db.collection('users');
export const FeedbackCollection = db.collection('feedbacks');
