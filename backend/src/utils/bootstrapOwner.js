import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import HighlightSettings from '../models/HighlightSettings.js';

export const bootstrapOwner = async () => {
  try {
    const targetUsername = (process.env.OWNER_USERNAME || 'owner').trim().toLowerCase();
    const targetEmail = (process.env.OWNER_EMAIL || 'owner@jecrc.edu').trim().toLowerCase();
    const defaultPassword = process.env.OWNER_DEFAULT_PASSWORD || 'TTBrothers';

    // 1. Search for existing owner by role, username, OR email
    let owner = await User.findOne({
      $or: [
        { role: 'owner' },
        { username: targetUsername },
        { email: targetEmail }
      ]
    }).select('+passwordHash');

    if (!owner) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);

      owner = await User.create({
        name: 'Cafeteria Owner',
        username: targetUsername,
        email: targetEmail,
        passwordHash,
        role: 'owner',
        mustChangePassword: true,
        phone: '9876543210'
      });

      console.log('🔒 [Bootstrap] Owner account initialized successfully with secure credentials.');
    } else {
      let needsSave = false;

      // Ensure proper role, username, and email are persisted
      if (owner.role !== 'owner') {
        owner.role = 'owner';
        needsSave = true;
      }
      if (!owner.username || owner.username !== targetUsername) {
        owner.username = targetUsername;
        needsSave = true;
      }
      if (!owner.email) {
        owner.email = targetEmail;
        needsSave = true;
      }

      // If owner has never changed initial password, ensure default password is valid
      if (owner.mustChangePassword !== false) {
        const isMatch = owner.passwordHash
          ? await bcrypt.compare(defaultPassword, owner.passwordHash)
          : false;

        if (!isMatch) {
          const salt = await bcrypt.genSalt(10);
          owner.passwordHash = await bcrypt.hash(defaultPassword, salt);
          owner.mustChangePassword = true;
          needsSave = true;
          console.log('🔒 [Bootstrap] Synchronized initial default password for unactivated owner account.');
        }
      }

      if (needsSave) {
        await owner.save();
        console.log('🔒 [Bootstrap] Owner account attributes updated and verified.');
      } else {
        console.log('🔒 [Bootstrap] Owner account verified.');
      }
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
