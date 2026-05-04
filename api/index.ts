import express from "express";
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import { getDb, UserCollection, FeedbackCollection } from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import fs from "fs/promises";

const app = express();
const PORT = 3000;

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_123";
const googleClient = new OAuth2Client(process.env.VITE_GOOGLE_CLIENT_ID || "placeholder-client-id");

// Gemini init for enrichment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// MITAOE Coordinates
const COLLAGE_COORDS = { lat: 18.6651, lng: 73.8860 };

app.use(express.json());

// Initialize DB
getDb().catch(console.error);

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role, user_type } = req.body;
    
    const userSnapshot = await UserCollection.where('email', '==', email).get();
    if (!userSnapshot.empty) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    
    const userData = {
      id, name, email, password: hashedPassword, role: role || "tenant", user_type: user_type || null, profile_completed: false,
      createdAt: new Date().toISOString()
    };
    
    await UserCollection.doc(id).set(userData);

    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, role: role || "tenant", user_type: user_type || null, profile_completed: false } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userSnapshot = await UserCollection.where('email', '==', email).get();
    if (userSnapshot.empty) return res.status(400).json({ error: "Invalid credentials" });
    
    const user = userSnapshot.docs[0].data();
    if (!user.password) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    const { password: _, ...userWithoutPassword } = user as any;
    res.json({ token, user: { ...userWithoutPassword, profile_completed: !!userWithoutPassword.profile_completed } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential, role, user_type } = req.body;
    
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.VITE_GOOGLE_CLIENT_ID || "placeholder-client-id"
    }).catch(async (err) => {
       const payload = jwt.decode(credential) as any;
       if (!payload) throw new Error("Invalid token format");
       return { getPayload: () => payload };
    });
    
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ error: "Invalid Google token payload" });

    const { email, name } = payload;
    
    const userSnapshot = await UserCollection.where('email', '==', email).get();
    let user;

    if (userSnapshot.empty) {
      const id = crypto.randomUUID();
      user = {
        id, name, email, role: role || "tenant", user_type: user_type || null, profile_completed: false,
        createdAt: new Date().toISOString()
      };
      await UserCollection.doc(id).set(user);
    } else {
      user = userSnapshot.docs[0].data();
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user as any;
    res.json({ token, user: { ...userWithoutPassword, profile_completed: !!userWithoutPassword.profile_completed } });
  } catch (error: any) {
    console.error("Google auth error detailed:", error);
    res.status(500).json({ error: error.message || "Google sign-in failed" });
  }
});

app.get("/api/users/me", authenticateToken, async (req: any, res) => {
  try {
    const userDoc = await UserCollection.doc(req.user.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const user = userDoc.data();
    const { password: _, ...userWithoutPassword } = user as any;
    res.json({ user: { ...userWithoutPassword, profile_completed: !!userWithoutPassword.profile_completed } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.put("/api/users/update", authenticateToken, async (req: any, res) => {
  try {
    const { role, user_type, profile_data } = req.body;

    await UserCollection.doc(req.user.id).update({
      role, 
      user_type: user_type || null, 
      profile_data, 
      profile_completed: true,
      updatedAt: new Date().toISOString()
    });

    const userDoc = await UserCollection.doc(req.user.id).get();
    const user = userDoc.data();
    const { password: _, ...userWithoutPassword } = user as any;
    
    res.json({ message: "Profile updated", user: { ...userWithoutPassword, profile_completed: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Feedback Endpoints
app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, user_type, rating, experience_type, message, improvement } = req.body;
    if (!name || !email || !user_type || !rating || !experience_type || !message) {
      return res.status(400).json({ error: "All required fields must be filled" });
    }
    
    const feedbackData = {
      name, email, user_type, rating, experience_type, message, improvement,
      createdAt: new Date().toISOString()
    };
    
    const docRef = await FeedbackCollection.add(feedbackData);
    res.status(201).json({ id: docRef.id, ...feedbackData });
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

app.get("/api/feedback", async (req, res) => {
  try {
    const feedbackSnapshot = await FeedbackCollection.orderBy('createdAt', 'desc').get();
    const feedbacks = feedbackSnapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

app.get("/api/pgs", async (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), "mitaoe_pg_listings.json");
    const dataStr = await fs.readFile(dataPath, "utf-8");
    const pgs = JSON.parse(dataStr);
    res.json(pgs);
  } catch (error) {
    console.error("Error serving PGs:", error);
    res.status(500).json({ error: "Failed to fetch pgs" });
  }
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
