import Food from '../models/Food.js';

export const getFoods = async (req, res, next) => {
  try {
    const { category, search, station, isVeg, isAvailable } = req.query;
    const filter = {};

    if (category && category !== 'All' && category !== 'all') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    if (station && station !== 'All') {
      filter.station = new RegExp(station, 'i');
    }

    if (isVeg !== undefined) {
      filter.isVeg = isVeg === 'true';
    }

    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === 'true';
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    const foods = await Food.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: foods.length,
      foods
    });
  } catch (error) {
    next(error);
  }
};

export const getFoodById = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    res.status(200).json({
      success: true,
      food
    });
  } catch (error) {
    next(error);
  }
};

export const createFood = async (req, res, next) => {
  try {
    const {
      name,
      description,
      category,
      station,
      price,
      originalPrice,
      image,
      rating,
      preparationTime,
      calories,
      tags,
      isVeg,
      isPopular,
      isChefSpecial,
      stockCount,
      slug
    } = req.body;

    if (!name || price === undefined || price === null || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, and price are required fields'
      });
    }

    const itemSlug = slug || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const numPrice = Number(price);
    const initialAvailable = numPrice > 0 && (stockCount === undefined || Number(stockCount) > 0);

    const food = await Food.create({
      name,
      slug: itemSlug,
      description,
      category,
      station: station || 'Main Counter',
      price: numPrice,
      isAvailable: req.body.isAvailable !== undefined ? Boolean(req.body.isAvailable) : initialAvailable,
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      image: image || undefined,
      rating: rating ? Number(rating) : 4.5,
      preparationTime: preparationTime || '8-10 min',
      calories: calories ? Number(calories) : 250,
      tags: Array.isArray(tags) ? tags : [],
      isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
      isPopular: Boolean(isPopular),
      isChefSpecial: Boolean(isChefSpecial),
      stockCount: stockCount !== undefined ? Number(stockCount) : 50
    });

    res.status(201).json({
      success: true,
      message: 'Food item created successfully',
      food
    });
  } catch (error) {
    next(error);
  }
};

export const updateFood = async (req, res, next) => {
  try {
    const updateData = { ...req.body };

    // Support restock delta if supplied (e.g. stockDelta: +20)
    if (updateData.stockDelta !== undefined) {
      const current = await Food.findById(req.params.id);
      if (!current) {
        return res.status(404).json({ success: false, message: 'Food item not found' });
      }
      const newStock = Math.max(0, (current.stockCount || 0) + Number(updateData.stockDelta));
      updateData.stockCount = newStock;
      delete updateData.stockDelta;
    }

    // Automatically synchronize stockCount and isAvailable
    if (updateData.stockCount !== undefined) {
      updateData.stockCount = Math.max(0, parseInt(updateData.stockCount, 10) || 0);
      if (updateData.stockCount === 0) {
        // Requirement 3: stock = 0 must automatically mean Out of Stock
        updateData.isAvailable = false;
      } else if (updateData.isAvailable === undefined) {
        // If stock > 0 and availability wasn't explicitly set to false, activate
        updateData.isAvailable = true;
      }
    } else if (updateData.isAvailable === true) {
      // If setting isAvailable to true but current stock is 0, restock initial batch
      const current = await Food.findById(req.params.id);
      if (current && (current.stockCount || 0) <= 0) {
        updateData.stockCount = 20;
      }
    }

    const food = await Food.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Food item updated successfully',
      food
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFood = async (req, res, next) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);

    if (!food) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Food item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
