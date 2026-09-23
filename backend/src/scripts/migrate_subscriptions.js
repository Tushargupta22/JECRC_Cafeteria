import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subscription from '../models/Subscription.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

/**
 * Migration script to add planType field to existing subscriptions
 * This ensures backward compatibility with existing data
 */
async function migrateSubscriptions() {
  let mongod = null;
  
  try {
    // Handle in-memory MongoDB
    if (MONGO_URI === 'memory') {
      console.log('🔧 Using MongoDB Memory Server...');
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✅ Connected to MongoDB Memory Server');
    } else {
      await mongoose.connect(MONGO_URI);
      console.log('✅ Connected to MongoDB');
    }

    // Find all subscriptions without planType
    const subscriptionsToMigrate = await Subscription.find({
      $or: [
        { planType: { $exists: false } },
        { planType: null }
      ]
    });

    console.log(`\n📊 Found ${subscriptionsToMigrate.length} subscriptions to migrate`);

    if (subscriptionsToMigrate.length === 0) {
      console.log('✅ No subscriptions need migration');
      await mongoose.connection.close();
      if (mongod) await mongod.stop();
      return;
    }

    let migrated = 0;
    for (const sub of subscriptionsToMigrate) {
      let planType = 'monthly'; // default

      // Determine planType from plan name
      const planName = sub.plan.toLowerCase();
      if (planName.includes('weekly') || planName.includes('snack')) {
        planType = 'weekly';
      } else if (planName.includes('semester') || planName.includes('unlimited')) {
        planType = 'semester';
      } else if (planName.includes('monthly') || planName.includes('plus')) {
        planType = 'monthly';
      }

      sub.planType = planType;
      await sub.save();
      migrated++;
      console.log(`  ✓ Migrated: ${sub.plan} → planType: ${planType}`);
    }

    console.log(`\n✅ Successfully migrated ${migrated} subscriptions`);
    console.log('Migration complete!');

    await mongoose.connection.close();
    if (mongod) await mongod.stop();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (mongod) await mongod.stop();
    process.exit(1);
  }
}

// Run migration
migrateSubscriptions();
