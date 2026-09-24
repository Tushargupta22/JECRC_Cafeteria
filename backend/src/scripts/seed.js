import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import Food from '../models/Food.js';
import Order from '../models/Order.js';
import Offer from '../models/Offer.js';
import Subscription from '../models/Subscription.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';
import { completeCafeteriaMenu } from './menuData.js';

dotenv.config();

export const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('\n[Seed] Synchronizing cafeteria menu and accounts idempotently...');


    // 1. UPSERT FOOD ITEMS (Idempotent by slug or name)
    console.log(`[Seed] Processing ${completeCafeteriaMenu.length} cafeteria menu items...`);
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of completeCafeteriaMenu) {
      const slug = item.slug || item.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = await Food.findOne({
        $or: [{ slug }, { name: item.name }]
      });

      if (existing) {
        // If price is 0 in seed dataset (unpriced / MRP item) but admin already configured positive price, preserve it
        const preservePrice = (item.price === 0 && existing.price > 0);
        const updateData = {
          ...item,
          slug,
          price: preservePrice ? existing.price : item.price,
          isAvailable: preservePrice ? existing.isAvailable : item.isAvailable,
          stockCount: existing.stockCount !== undefined ? existing.stockCount : item.stockCount
        };
        await Food.updateOne({ _id: existing._id }, { $set: updateData });
        updatedCount++;
      } else {
        await Food.create({
          ...item,
          slug
        });
        insertedCount++;
      }
    }
    console.log(`[Seed] Products synchronized: ${insertedCount} newly created, ${updatedCount} updated.`);

    // 3. CREATE OFFERS
    console.log('[Seed] Seeding offers & coupons...');
    const now = new Date();
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const offersData = [
      {
        title: '20% OFF Cold Coffee',
        description: 'Because you order it frequently',
        discount: 20,
        discountType: 'percentage',
        couponCode: 'COFFEELOVER',
        validFrom: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        validUntil: thirtyDaysAhead,
        targetAudience: 'frequent_coffee',
        badgeText: '☕ Coffee Lover Perk',
        icon: '☕',
        recommendationReason: '☕ Handpicked for you because you love campus coffee',
        perUserLimit: 3,
        minimumOrder: 40,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=400'
      },
      {
        title: '15% OFF Your Favourite Burger',
        description: 'Because you order it frequently',
        discount: 15,
        discountType: 'percentage',
        couponCode: 'BURGERFAN',
        validFrom: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        validUntil: thirtyDaysAhead,
        targetAudience: 'frequent_burgers',
        badgeText: '🍔 Burger Lover Perk',
        icon: '🍔',
        recommendationReason: '🍔 Tailored deal for our campus burger lovers',
        perUserLimit: 3,
        minimumOrder: 60,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400'
      },
      {
        title: 'Special offer on Masala Chai',
        description: 'Because you order it frequently',
        discount: 20,
        discountType: 'percentage',
        couponCode: 'CHAITIME',
        validFrom: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        validUntil: thirtyDaysAhead,
        targetAudience: 'frequent_chai',
        badgeText: '🍵 Chai Lover Perk',
        icon: '🍵',
        recommendationReason: '🍵 Handpicked for you because you love campus chai',
        perUserLimit: 3,
        minimumOrder: 30,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=400'
      },
      {
        title: 'Special Snack Combo Offer',
        description: 'Because you order it frequently',
        discount: 15,
        discountType: 'percentage',
        couponCode: 'SNACK10',
        validFrom: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        validUntil: thirtyDaysAhead,
        targetAudience: 'frequent_snacks',
        badgeText: '🍟 Snack Attack Perk',
        icon: '🍟',
        recommendationReason: '🍟 Recommended based on your frequent snack orders',
        perUserLimit: 3,
        minimumOrder: 50,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&q=80&w=400'
      },
      {
        title: 'Exclusive Dining Club Offer',
        description: 'Exclusive 20% VIP perk and kitchen priority for active Cafeteria Plus members.',
        discount: 20,
        discountType: 'percentage',
        couponCode: 'PLUSHERO',
        validFrom: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        validUntil: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        targetAudience: 'subscribers',
        badgeText: '⭐ VIP Member Perk',
        icon: '⭐',
        recommendationReason: '⭐ Exclusive VIP perk for Cafeteria Plus Members',
        subscriptionRequirement: true,
        perUserLimit: 5,
        minimumOrder: 0,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=400'
      },
      {
        title: 'Special Reward for You',
        description: 'Exclusive 25% off loyalty perk for our top campus foodies.',
        discount: 25,
        discountType: 'percentage',
        couponCode: 'CAMPUSVIP',
        validFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        validUntil: thirtyDaysAhead,
        targetAudience: 'high_spenders',
        badgeText: '👑 Campus VIP Perk',
        icon: '👑',
        recommendationReason: '🪙 Campus VIP high spender bonus',
        perUserLimit: 2,
        minimumOrder: 150,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400'
      },
      {
        title: '15% OFF Welcome Back Treat',
        description: 'We missed you at the cafeteria! Grab your favorite meal today.',
        discount: 15,
        discountType: 'percentage',
        couponCode: 'BACK15',
        validFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        validUntil: thirtyDaysAhead,
        targetAudience: 'inactive_users',
        badgeText: '👋 Welcome Back Perk',
        icon: '👋',
        recommendationReason: 'Welcome back special discount',
        perUserLimit: 1,
        minimumOrder: 50,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400'
      },
      {
        title: 'Flat ₹50 OFF Campus Dining',
        description: 'Welcome to campus cafeteria dining! Instant ₹50 flat discount on your meal.',
        discount: 50,
        discountType: 'fixed',
        couponCode: 'JECRC50',
        validFrom: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        validUntil: thirtyDaysAhead,
        targetAudience: 'new_users',
        badgeText: '🎉 New Student Welcome Perk',
        icon: '🎉',
        recommendationReason: 'Special welcome perk for campus foodies',
        perUserLimit: 1,
        minimumOrder: 100,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400'
      }
    ];

    const existingOffersCount = await Offer.countDocuments();
    if (existingOffersCount === 0) {
      const seededOffers = await Offer.create(offersData);
      console.log(`[Seed] Created ${seededOffers.length} promotional offers.`);
    } else {
      console.log(`[Seed] Offers verified (${existingOffersCount} offers active).`);
    }

    console.log('\n====================================================');
    console.log('✅ JECRC CAFETERIA MENU & OFFERS SEEDED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('Note: Demo accounts have been completely removed.');
    console.log('Real students and admins can register and sign in directly.');
    console.log('====================================================\n');
  } catch (error) {
    console.error('[Seed] Database Seeding Error:', error);
    process.exit(1);
  }
};

// If run directly via node src/scripts/seed.js
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => {
    disconnectDB().then(() => process.exit(0));
  });
}
