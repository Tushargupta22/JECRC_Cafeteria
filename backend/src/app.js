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

// Serve static uploads
const uploadsDir = path.resolve('./public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check Endpoint (Safe environment check: returns only boolean, never reveals key)
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'JECRC Cafeteria Backend API',
    environment: process.env.NODE_ENV || 'development',
    adminKeyConfigured: Boolean(process.env.ADMIN_ACCESS_KEY),
    timestamp: new Date()
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Mount Domain API Routes (both /api/* and serverless root paths)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/foods', foodRoutes);
app.use('/api/orders', orderRoutes);
app.use('/orders', orderRoutes);
app.use('/api/offers', offerRoutes);
app.use('/offers', offerRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/admin/analytics', analyticsRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
