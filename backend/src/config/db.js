import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import fs from 'fs';
import path from 'path';

let memoryServerInstance = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uriFromEnv = process.env.MONGODB_URI;

  try {
    if (uriFromEnv && uriFromEnv !== 'memory') {
      try {
        const maskedUri = uriFromEnv.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
        console.log(`[DB] Attempting connection to MongoDB at: ${maskedUri}`);
        await mongoose.connect(uriFromEnv);
        console.log(`[DB] Connected to MongoDB database: ${mongoose.connection.name}`);
        return;
      } catch (err) {
        console.warn(`[DB] Could not connect to external MongoDB: ${err.message}. Falling back to Persistent Local MongoDB Server.`);
      }
    }

    const dbDir = path.resolve(process.env.DB_PATH || './.data/db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log(`[DB] Initializing Persistent MongoDB Server at ${dbDir}...`);
    memoryServerInstance = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: 'wiredTiger'
      }
    });
    const memoryUri = memoryServerInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[DB] Persistent MongoDB connected successfully at: ${memoryUri}`);
  } catch (error) {
    console.error('[DB] Fatal Database Connection Error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    console.log('[DB] Disconnected from MongoDB cleanly');
  } catch (err) {
    console.error('[DB] Error during disconnect:', err.message);
  }
};
