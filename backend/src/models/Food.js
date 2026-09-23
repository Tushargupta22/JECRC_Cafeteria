import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Food category is required'],
      trim: true,
      index: true
    },
    station: {
      type: String,
      default: 'Main Counter',
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Food price is required'],
      min: [0, 'Price cannot be negative']
    },
    originalPrice: {
      type: Number,
      default: null
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400'
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 0,
      max: 5
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true
    },
    stockCount: {
      type: Number,
      default: 50,
      min: [0, 'Stock cannot be negative']
    },
    preparationTime: {
      type: String,
      default: '8-10 min'
    },
    calories: {
      type: Number,
      default: 250
    },
    tags: {
      type: [String],
      default: []
    },
    isVeg: {
      type: Boolean,
      default: true
    },
    isPopular: {
      type: Boolean,
      default: false
    },
    isChefSpecial: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Search index on name, description and tags
foodSchema.index({ name: 'text', description: 'text', tags: 'text' });

const Food = mongoose.model('Food', foodSchema);
export default Food;
