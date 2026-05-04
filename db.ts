import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Find the service account key file
const serviceAccountPath = join(process.cwd(), 'stayfinder-eb507-firebase-adminsdk-fbsvc-b58e13bb59.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Successfully connected to Firebase Firestore.');
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

// Helper function to maintain the same API structure in server.ts as much as possible
export const getDb = async () => {
  return db;
};

// Firestore Collection References
export const UserCollection = db.collection('users');
export const FeedbackCollection = db.collection('feedbacks');
