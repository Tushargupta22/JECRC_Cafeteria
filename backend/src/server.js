import express from 'express';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import Food from './models/Food.js';

import { seedDatabase } from './scripts/seed.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize Database
    await connectDB();

    // Auto-seed food menu if freshly started and menu is empty
    const foodCount = await Food.countDocuments();
    if (foodCount === 0) {
      console.log('[Server] Menu is empty. Initializing cafeteria food items...');
      await seedDatabase();
    }

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 JECRC Cafeteria Backend Server running on port ${PORT}`);
      console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server] Failed to launch server:', error);
    process.exit(1);
  }
};

// Export app for Vercel Serverless deployment and testing
export default app;

// In standalone / local environment, start HTTP listener
if (!process.env.VERCEL) {
  startServer();
}
