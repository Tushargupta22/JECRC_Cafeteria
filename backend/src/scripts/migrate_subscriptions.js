import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import { connectDB, disconnectDB } from '../config/db.js';

dotenv.config();

/**
 * Migration script to safely migrate subscriptions to finalized Dining Club plans and schemas:
 * - Maps legacy plan names to new Dining Club plan names and limits
 * - Initializes subscriptionUsageCount, lastSubscriptionDiscountDate, eligibleOrderCount, milestonesAwarded
 * - Keeps historical orders unchanged
 * - Synchronizes User.subscription for active members
 */
export async function migrateSubscriptions() {
  try {
    await connectDB();
    console.log('✅ Connected to database for subscription migration');

    const subscriptions = await Subscription.find({});
    console.log(`\n📊 Found ${subscriptions.length} total subscriptions in database`);

    let migrated = 0;
    for (const sub of subscriptions) {
      let changed = false;
      const lowerPlan = (sub.plan || '').toLowerCase();

      // Migrate plan names and plan types
      if (lowerPlan.includes('weekly') || lowerPlan.includes('snack')) {
        sub.plan = 'Weekly Dining Club';
        sub.planType = 'weekly';
        sub.price = 99;
        sub.minOrder = 31;
        sub.discountType = 'flat';
        sub.discountAmount = 10;
        sub.discountPercentage = 0;
        sub.maxDiscountPerOrder = 10;
        sub.dailyLimit = 1;
        sub.maxDiscountedOrders = 7;
        changed = true;
      } else if (lowerPlan.includes('semester') || lowerPlan.includes('unlimited') || lowerPlan.includes('3-month')) {
        sub.plan = '3-Month Dining Club';
        sub.planType = '3-month';
        sub.price = 499;
        sub.minOrder = 41;
        sub.discountType = 'percentage';
        sub.discountPercentage = 15;
        sub.discountAmount = 0;
        sub.maxDiscountPerOrder = 20;
        sub.dailyLimit = 1;
        sub.maxDiscountedOrders = 20;
        changed = true;
      } else if (lowerPlan.includes('monthly') || lowerPlan.includes('plus')) {
        sub.plan = 'Monthly Dining Club';
        sub.planType = 'monthly';
        sub.price = 199;
        sub.minOrder = 41;
        sub.discountType = 'percentage';
        sub.discountPercentage = 15;
        sub.discountAmount = 0;
        sub.maxDiscountPerOrder = 20;
        sub.dailyLimit = 1;
        sub.maxDiscountedOrders = 8;
        changed = true;
      }

      // Initialize counter fields if missing
      if (sub.subscriptionUsageCount === undefined) {
        sub.subscriptionUsageCount = 0;
        changed = true;
      }
      if (sub.eligibleOrderCount === undefined) {
        sub.eligibleOrderCount = 0;
        changed = true;
      }
      if (!Array.isArray(sub.milestonesAwarded)) {
        sub.milestonesAwarded = [];
        changed = true;
      }

      if (changed) {
        await sub.save();
        migrated++;
        console.log(`  ✓ Migrated subscription [${sub._id}]: ${sub.plan} (${sub.planType})`);

        // If active, also update the User's embedded subscription
        if (sub.isActive && sub.endDate > new Date()) {
          await User.findByIdAndUpdate(sub.userId, {
            subscription: {
              subscriptionId: sub._id,
              plan: sub.plan,
              planType: sub.planType,
              price: sub.price,
              discountPercentage: sub.discountPercentage,
              discountAmount: sub.discountAmount,
              discountType: sub.discountType,
              minOrder: sub.minOrder,
              maxDiscountPerOrder: sub.maxDiscountPerOrder,
              dailyLimit: sub.dailyLimit,
              maxDiscountedOrders: sub.maxDiscountedOrders,
              subscriptionUsageCount: sub.subscriptionUsageCount,
              lastSubscriptionDiscountDate: sub.lastSubscriptionDiscountDate,
              eligibleOrderCount: sub.eligibleOrderCount,
              milestonesAwarded: sub.milestonesAwarded,
              startDate: sub.startDate,
              endDate: sub.endDate,
              isActive: true
            }
          });
        }
      }
    }

    console.log(`\n✅ Successfully verified & migrated ${migrated} subscriptions to finalized Dining Club schema`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

if (process.argv[1]?.endsWith('migrate_subscriptions.js')) {
  migrateSubscriptions()
    .then(() => disconnectDB().then(() => process.exit(0)))
    .catch(() => disconnectDB().then(() => process.exit(1)));
}
