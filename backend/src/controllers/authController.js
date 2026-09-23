import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { calculateUserDailyRankAndSpend } from './leaderboardController.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, department, year, studentId, role, profileImage, adminAccessCode, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and password are required'
      });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and Confirm Password do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    // Role validation: Admin role requires verified server-side Admin Access Code
    let assignedRole = 'student';
    const VALID_ADMIN_CODE = process.env.ADMIN_ACCESS_CODE || 'JECRC_ADMIN_2026';

    if (role === 'admin') {
      if (!adminAccessCode || adminAccessCode.trim() !== VALID_ADMIN_CODE) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or missing Admin Access Code. Admin registration is unauthorized.'
        });
      }
      assignedRole = 'admin';
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      department: department || (assignedRole === 'admin' ? 'Campus Administration' : 'B.Tech CS'),
      year: year || (assignedRole === 'admin' ? 'Staff' : 'Year 3'),
      studentId: studentId || (assignedRole === 'admin' ? `ADM${Math.floor(1000 + Math.random() * 9000)}` : `STU${Math.floor(1000 + Math.random() * 9000)}`),
      phone: phone ? phone.trim() : '',
      role: assignedRole,
      profileImage: profileImage || undefined
    });

    const token = generateToken({
      id: newUser._id,
      role: newUser.role,
      email: newUser.email
    });

    res.status(201).json({
      success: true,
      message: `${assignedRole === 'admin' ? 'Admin' : 'Student'} account created successfully`,
      user: {
        ...newUser.toJSON(),
        dailyRank: 0,
        dailySpend: 0
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user including passwordHash
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email
    });

    const rankData = await calculateUserDailyRankAndSpend(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        ...user.toJSON(),
        dailyRank: rankData.dailyRank,
        dailySpend: rankData.dailySpend
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const rankData = await calculateUserDailyRankAndSpend(req.user._id);
    res.status(200).json({
      success: true,
      user: {
        ...req.user.toJSON(),
        dailyRank: rankData.dailyRank,
        dailySpend: rankData.dailySpend
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your registered campus email'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this email'
      });
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirm password do not match'
        });
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully. You can now sign in with your new password.'
      });
    }

    // Step 1: Verification passed
    return res.status(200).json({
      success: true,
      message: 'Account verified. Please enter your new password to complete reset.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update authenticated user's own profile
 * Strict security: Only updates req.user._id (never an arbitrary userId)
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, shortName, department, year, phone, profileImage } = req.body;

    const allowedUpdates = {};
    if (name !== undefined) allowedUpdates.name = String(name).trim();
    if (shortName !== undefined) allowedUpdates.shortName = String(shortName).trim();
    if (department !== undefined) allowedUpdates.department = String(department).trim();
    if (year !== undefined) allowedUpdates.year = String(year).trim();
    if (phone !== undefined) allowedUpdates.phone = String(phone).trim();
    if (profileImage !== undefined) allowedUpdates.profileImage = String(profileImage).trim();

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid profile fields provided for update'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      allowedUpdates,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    const rankData = await calculateUserDailyRankAndSpend(updatedUser._id);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        ...updatedUser.toJSON(),
        dailyRank: rankData.dailyRank,
        dailySpend: rankData.dailySpend
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload and save user avatar image to disk (public/uploads)
 * Clean abstraction: avoids storing large image binaries in MongoDB
 */
export const uploadAvatar = async (req, res, next) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      });
    }

    // Match data URI scheme (e.g. data:image/png;base64,...)
    const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Expected base64 data URI.'
      });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Limit image size to 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image file size exceeds maximum limit of 5MB'
      });
    }

    const uploadsDir = path.resolve('./public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `avatar-${req.user._id}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    // Build URL (supporting localhost:5000 in dev or host header)
    const host = req.get('host') || 'localhost:5000';
    const protocol = req.protocol || 'http';
    const imageUrl = `${protocol}://${host}/uploads/${filename}`;

    // Update user's profileImage in MongoDB
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: imageUrl },
      { new: true }
    );

    const rankData = await calculateUserDailyRankAndSpend(updatedUser._id);

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      imageUrl,
      user: {
        ...updatedUser.toJSON(),
        dailyRank: rankData.dailyRank,
        dailySpend: rankData.dailySpend
      }
    });
  } catch (error) {
    next(error);
  }
};
