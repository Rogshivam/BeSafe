import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { auth } from '../middleware/auth.js';
import {
  validateRegister,
  validateLogin,
  handleValidationErrors
} from '../middleware/validation.js';
import crypto from 'crypto';
import NotificationService from '../services/notificationService.js';
const router = express.Router();

// FORGOT PASSWORD (send reset token)
// router.post('/forgot-password', async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.json({
//         success: true,
//         message: 'If this email exists, a reset link has been sent'
//       });
//     }

//     const resetToken = crypto.randomBytes(32).toString('hex');

//     const hashedToken = crypto
//       .createHash('sha256')
//       .update(resetToken)
//       .digest('hex');

//     user.resetPasswordToken = hashedToken;
//     user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

//     await user.save();

//     console.log("Reset token:", resetToken); // testing

//     res.json({
//       success: true,
//       message: 'Reset token generated',
//       data: { resetToken }
//     });

//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Always return success=true to avoid leaking existence
    return res.json({
      success: true,
      message: 'If this email exists, a reset link has been sent',
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save();

  const emailSent = await NotificationService.sendPasswordResetEmail(email, resetToken);

  res.json({
    success: true,
    message: emailSent
      ? 'If this email exists, a reset link has been sent'
      : 'User found, but email could not be sent. Try again later.',
  });
});
// RESET PASSWORD
// router.put('/reset-password/:token', async (req, res) => {
//   try {
//     const { token } = req.params;
//     const { password } = req.body;
//     if (!password || password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: 'Password must be at least 6 characters'
//       });
//     }
//     // Hash token from params
//     const hashedToken = crypto
//       .createHash('sha256')
//       .update(token)
//       .digest('hex');

//     const user = await User.findOne({
//       resetPasswordToken: hashedToken,
//       resetPasswordExpire: { $gt: Date.now() }
//     });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid or expired token'
//       });
//     }

//     // Hash new password
//     const salt = await bcrypt.genSalt(10);
//     user.password = await bcrypt.hash(password, salt);

//     // Clear reset fields
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;

//     await user.save();

//     res.json({
//       success: true,
//       message: 'Password reset successful'
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error resetting password'
//     });
//   }
// });
router.put('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters',
    });
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.json({
    success: true,
    message: 'Password reset successful',
  });
});

// Register user
router.post('/register', validateRegister, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, phone, password, userType, age } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      userType,
      age
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          age: user.age,
          status: user.status
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Login user
router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          age: user.age,
          status: user.status,
          currentLocation: user.currentLocation,
          emergencyContacts: user.emergencyContacts
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('emergencyContacts.memberId', 'name phone email');

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          age: user.age,
          status: user.status,
          currentLocation: user.currentLocation,
          emergencyContacts: user.emergencyContacts,
          emergencySettings: user.emergencySettings,
          notifications: user.notifications,
          profileImage: user.profileImage,
          lastActive: user.lastActive
        }
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user data'
    });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, age, profileImage, emergencySettings, notifications } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (age) user.age = age;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (emergencySettings) user.emergencySettings = { ...user.emergencySettings, ...emergencySettings };
    if (notifications) user.notifications = { ...user.notifications, ...notifications };

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          age: user.age,
          status: user.status,
          emergencySettings: user.emergencySettings,
          notifications: user.notifications,
          profileImage: user.profileImage
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedNewPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
});

export default router;
