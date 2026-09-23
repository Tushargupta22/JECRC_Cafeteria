import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/authRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';
import { connectDB } from './config/db.js';
import Food from './models/Food.js';
import { seedDatabase } from './scripts/seed.js';

dotenv.config();

const app = express();

// Enable CORS for frontend and API consumers
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/local mode
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static uploads (with read-only filesystem guard for serverless)
const uploadsDir = path.resolve('./public/uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem in serverless environments
}
app.use('/uploads', express.static(uploadsDir));

let isSeedChecked = false;
async function ensureSeed() {
  if (isSeedChecked) return;
  try {
    const foodCount = await Food.countDocuments();
    if (foodCount === 0) {
      console.log('[Database] Menu is empty. Initializing cafeteria food items...');
      await seedDatabase();
    }
    isSeedChecked = true;
  } catch (err) {
    console.error('[Seed Check Error]:', err.message);
  }
}

// Auto-connect MongoDB for incoming requests (works seamlessly in serverless and long-running servers)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    await ensureSeed();
  } catch (err) {
    console.error('[DB Connection Middleware Error]:', err.message);
  }
  next();
});

// HTTP Request Logger (bypassed in Vercel serverless to prevent socket inspection errors)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.use(morgan('dev'));
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'JECRC Cafeteria Backend API',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date()
  });
});

// Mount Domain API Routes
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin/analytics', analyticsRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
