import express from "express";
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import { getDb, User, Feedback } from "./db.js";
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
    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    
    await User.create({
      id, name, email, password: hashedPassword, role: role || "tenant", user_type: user_type || null, profile_completed: false
    });

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
    const user = await User.findOne({ email }).lean();
    if (!user || !user.password) return res.status(400).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    const { password: _, _id, __v, ...userWithoutPassword } = user as any;
    res.json({ token, user: { ...userWithoutPassword, profile_completed: !!userWithoutPassword.profile_completed } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential, role, user_type } = req.body;
    console.log("Processing Google Auth for role:", role);
    
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.VITE_GOOGLE_CLIENT_ID || "placeholder-client-id"
    }).catch(async (err) => {
       console.warn("Google verify failed, decoding token directly for local testing:", err.message);
       const payload = jwt.decode(credential) as any;
       if (!payload) throw new Error("Invalid token format");
       return { getPayload: () => payload };
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      console.error("No payload found in Google token");
      return res.status(400).json({ error: "Invalid Google token payload" });
    }

    const { email, name } = payload;
    console.log("Google User:", { email, name });
    
    let user = await User.findOne({ email }).lean();

    if (!user) {
      console.log("Creating new user via Google Sign-in...");
      const id = crypto.randomUUID();
      try {
        await User.create({
          id, name, email, role: role || "tenant", user_type: user_type || null, profile_completed: false
        });
        user = await User.findOne({ id }).lean();
      } catch (createErr: any) {
        console.error("Error creating user in DB:", createErr.message);
        throw new Error("Failed to create user in database");
      }
    }

    if (!user) throw new Error("User retrieval failed after creation");

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, _id, __v, ...userWithoutPassword } = user as any;
    res.json({ token, user: { ...userWithoutPassword, profile_completed: !!userWithoutPassword.profile_completed } });
  } catch (error: any) {
    console.error("Google auth error detailed:", error);
    res.status(500).json({ error: error.message || "Google sign-in failed" });
  }
});

app.get("/api/users/me", authenticateToken, async (req: any, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    const { password: _, _id, __v, ...userWithoutPassword } = user as any;
    res.json({ user: { ...userWithoutPassword, profile_completed: !!userWithoutPassword.profile_completed } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.put("/api/users/update", authenticateToken, async (req: any, res) => {
  try {
    const { role, user_type, profile_data } = req.body;

    await User.findOneAndUpdate(
      { id: req.user.id },
      { role, user_type: user_type || null, profile_data, profile_completed: true },
      { new: true }
    );

    const user = await User.findOne({ id: req.user.id }).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password: _, _id, __v, ...userWithoutPassword } = user as any;
    
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
    const feedback = await Feedback.create({
      name, email, user_type, rating, experience_type, message, improvement
    });
    res.status(201).json(feedback);
  } catch (error) {
    console.error("Error creating feedback:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

app.get("/api/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

// API endpoint to fetch pgs
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

async function setupLocalServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  setupLocalServer().catch(console.error);
}

export default app;
