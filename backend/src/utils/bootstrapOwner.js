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
      // Create new owner record with default credentials
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
      console.log('🔒 [Bootstrap] Owner record located in database.');

      // Safely determine whether the stored password matches the configured default password
      const isDefaultMatch = owner.passwordHash
        ? await bcrypt.compare(defaultPassword, owner.passwordHash)
        : false;

      // An account is an activated Owner account if:
      // - mustChangePassword is false
      // - AND it has been initialized by bootstrap (phone === '9876543210')
      // - AND its password does not match default (owner has set a custom password)
      const isActivatedOwner = (owner.mustChangePassword === false && owner.phone === '9876543210' && !isDefaultMatch);

      if (isActivatedOwner) {
        // PRESERVE ACTIVATED CUSTOM PASSWORD
        // Only verify essential identity attributes without touching credentials
        let updateFields = {};
        if (owner.role !== 'owner') updateFields.role = 'owner';
        if (owner.username !== targetUsername) updateFields.username = targetUsername;
        if (!owner.email) updateFields.email = targetEmail;

        if (Object.keys(updateFields).length > 0) {
          await User.findOneAndUpdate({ _id: owner._id }, { $set: updateFields });
          console.log('🔒 [Bootstrap] Owner account attributes verified.');
        } else {
          console.log('🔒 [Bootstrap] Owner account verified (activated custom password preserved).');
        }
      } else {
        // UNINITIALIZED / LEGACY ACCOUNT REQUIRING SYNCHRONIZATION:
        // Either the account is unactivated, predates initial bootstrap, or password hash is out of sync.
        console.log('🔒 [Bootstrap] Repairing and synchronizing uninitialized/legacy owner credentials...');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        await User.findOneAndUpdate(
          { _id: owner._id },
          {
            $set: {
              name: owner.name || 'Cafeteria Owner',
              username: targetUsername,
              email: targetEmail,
              role: 'owner',
              passwordHash,
              mustChangePassword: true,
              phone: '9876543210'
            }
          },
          { new: true }
        );

        console.log('🔒 [Bootstrap] Owner account successfully repaired and synchronized with default credentials.');
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
