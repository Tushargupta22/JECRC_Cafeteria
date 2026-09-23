import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let memoryServerInstance = null;
let cachedConnectionPromise = null;

/**
 * Sanitize connection URI:
 * 1. Trims and removes surrounding quotes (common when copying into Vercel dashboard).
 * 2. Checks for tlsCAFile or sslCAFile query parameters; if the file doesn't exist, removes the param
 *    so Node.js uses its built-in trusted root certificates (DigiCert, Let's Encrypt, etc.)
 */
function cleanMongoUri(rawUri) {
  if (!rawUri || typeof rawUri !== 'string') return '';
  let uri = rawUri.trim();

  // Strip enclosing quotes if present
  if ((uri.startsWith('"') && uri.endsWith('"')) || (uri.startsWith("'") && uri.endsWith("'"))) {
    uri = uri.slice(1, -1).trim();
  }

  // Remove missing tlsCAFile or sslCAFile parameters
  try {
    const url = new URL(uri);
    let modified = false;

    for (const caParam of ['tlsCAFile', 'sslCAFile']) {
      if (url.searchParams.has(caParam)) {
        const filePath = url.searchParams.get(caParam);
        if (!fs.existsSync(filePath)) {
          console.warn(`[DB] Notice: Removing missing ${caParam}="${filePath}" from connection URI. Built-in system root certificates will be used.`);
          url.searchParams.delete(caParam);
          modified = true;
        }
      }
    }

    if (modified) {
      uri = url.toString();
    }
  } catch {
    // Regex fallback if URL constructor fails
    uri = uri
      .replace(/([?&])tlsCAFile=[^&#]+/g, '$1')
      .replace(/([?&])sslCAFile=[^&#]+/g, '$1')
      .replace(/\?&/, '?')
      .replace(/&&/, '&')
      .replace(/[?&]$/, '');
  }

  return uri;
}

export const connectDB = async () => {
  // If already connected, reuse connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If a connection is already in progress, await the existing promise
  if (mongoose.connection.readyState === 2 && cachedConnectionPromise) {
    return cachedConnectionPromise;
  }

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production');
  const uriFromEnv = process.env.MONGODB_URI;

  try {
    if (uriFromEnv && uriFromEnv !== 'memory') {
      const cleanUri = cleanMongoUri(uriFromEnv);
      const maskedUri = cleanUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
      console.log(`[DB] Connecting to MongoDB at: ${maskedUri}`);

      const connectionOptions = {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10
      };

      cachedConnectionPromise = mongoose.connect(cleanUri, connectionOptions);
      await cachedConnectionPromise;
      console.log(`[DB] Connected to MongoDB database: ${mongoose.connection.name}`);
      return mongoose.connection;
    }

    // In Serverless/Production, MongoMemoryServer cannot run (no local mongod binary or writable root)
    if (isServerless) {
      const err = new Error(
        'MONGODB_URI environment variable is missing or set to "memory" on Vercel. Please set MONGODB_URI in Vercel Project Settings > Environment Variables to your MongoDB Atlas connection string.'
      );
      console.error(`[DB] Configuration Error: ${err.message}`);
      throw err;
    }

    // Local Development Fallback: In-memory persistent server
    const dbDir = path.resolve(process.env.DB_PATH || './.data/db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log(`[DB] Initializing Local Persistent MongoDB Server at ${dbDir}...`);
    // Dynamic import to avoid bundling mongodb-memory-server in serverless environments
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create({
      instance: {
        dbPath: dbDir,
        storageEngine: 'wiredTiger'
      }
    });
    const memoryUri = memoryServerInstance.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[DB] Local Persistent MongoDB connected successfully at: ${memoryUri}`);
    return mongoose.connection;
  } catch (error) {
    cachedConnectionPromise = null;
    console.error('[DB] Database Connection Error:', error.message);
    // Never call process.exit(1) in serverless environments as it crashes the worker container
    if (!isServerless && (!uriFromEnv || uriFromEnv === 'memory')) {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    cachedConnectionPromise = null;
    console.log('[DB] Disconnected from MongoDB cleanly');
  } catch (err) {
    console.error('[DB] Error during disconnect:', err.message);
  }
};
