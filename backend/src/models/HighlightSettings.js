import mongoose from 'mongoose';

const highlightSettingsSchema = new mongoose.Schema(
  {
    overlayEnabled: {
      type: Boolean,
      default: true
    },
    overlayIntensity: {
      type: String,
      enum: ['light', 'medium', 'dark', 'strong'],
      default: 'medium'
    },
    heading: {
      type: String,
      default: "Today's Special Highlights",
      trim: true
    },
    subtitle: {
      type: String,
      default: "Chef's curated picks with exclusive campus discounts",
      trim: true
    },
    badgeText: {
      type: String,
      default: "Chef's Special",
      trim: true
    },
    ctaText: {
      type: String,
      default: "Order Now",
      trim: true
    },
    backgroundImage: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const HighlightSettings = mongoose.model('HighlightSettings', highlightSettingsSchema);
export default HighlightSettings;
