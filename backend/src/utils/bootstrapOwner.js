import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import HighlightSettings from '../models/HighlightSettings.js';

export const bootstrapOwner = async () => {
  try {
    const ownerExists = await User.findOne({
      $or: [{ role: 'owner' }, { username: 'owner' }]
    });

    if (!ownerExists) {
      const defaultPassword = process.env.OWNER_DEFAULT_PASSWORD || 'TTBrothers';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      await User.create({
        name: 'Cafeteria Owner',
        username: 'owner',
        email: process.env.OWNER_EMAIL || 'owner@jecrc.edu',
        passwordHash,
        role: 'owner',
        mustChangePassword: true,
        phone: '9876543210'
      });

      console.log('🔒 [Bootstrap] Owner account initialized successfully with secure credentials.');
    } else {
      console.log('🔒 [Bootstrap] Owner account verified.');
    }

    // Initialize HighlightSettings if none exists
    const settingsCount = await HighlightSettings.countDocuments();
    if (settingsCount === 0) {
      await HighlightSettings.create({
        overlayEnabled: true,
        overlayIntensity: 'medium',
        heading: "Today's Special Highlights",
        subtitle: "Chef's curated picks with exclusive campus discounts",
        badgeText: "Chef's Special",
        ctaText: "Order Now"
      });
      console.log('✨ [Bootstrap] Default Highlight Settings initialized.');
    }
  } catch (error) {
    console.error('❌ [Bootstrap] Failed to bootstrap Owner or Highlight Settings:', error.message);
  }
};
