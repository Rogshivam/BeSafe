import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { auth } from '../middleware/auth.js';
import {
  validateRegister,
  validateLogin,
  handleValidationErrors
} from '../middleware/validation.js';
import NotificationService from '../services/notificationService.js';
const router = express.Router();

// FORGOT PASSWORD (send reset token)

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  // console.log(`Forgot password request for email: ${email}`);

  if (!email) {
    // console.log('Forgot password failed: Email required');
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }

  const user = await User.findOne({ email });
  if (!user) {
    // console.log(`Forgot password: User not found for email: ${email}`);
    // Always return success=true to avoid leaking existence
    return res.json({
      success: true,
      message: 'If this email exists, a reset link has been sent',
    });
  }

  // console.log(`Forgot password: User found - ${user.name} (${user._id})`);

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log(`Generated reset token for user ${user._id}: ${resetToken.substring(0, 10)}...`);

  // Set reset token and expiration (10 minutes)
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  try {
    await user.save();
    // console.log(`Reset token saved for user: ${user._id}, expires: ${new Date(user.resetPasswordExpire).toISOString()}`);

    // Send password reset email
    const emailSent = await NotificationService.sendPasswordResetEmail(email, resetToken);
    
    if (emailSent) {
      // console.log(`Password reset email sent to: ${email}`);
    } else {
      // console.log(`Failed to send password reset email to: ${email}`);
    }

    res.json({
      success: true,
      message: emailSent
        ? 'If this email exists, a reset link has been sent'
        : 'User found, but email could not be sent. Try again later.',
      data: {
        token: resetToken, // Only for development/testing
        debug: process.env.NODE_ENV === 'development' ? {
          userId: user._id,
          expiresAt: new Date(user.resetPasswordExpire).toISOString()
        } : undefined
      }
    });

  } catch (error) {
    console.error('Error saving reset token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
    });
  }
});
// RESET PASSWORD

router.put('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // console.log(`=== PASSWORD RESET START ===`);
  // console.log(`Token: ${token}`);
  // console.log(`Password length: ${password?.length || 0}`);
  // console.log(`Request body:`, req.body);

  // Validate password
  if (!password || password.length < 6) {
    // console.log('Password reset failed: Password too short');
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters',
    });
  }

  // Hash the token to compare with stored token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // console.log(`Looking for user with hashed token: ${hashedToken.substring(0, 10)}...`);

  // Find user with valid reset token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    // console.log('Password reset failed: Invalid or expired token');
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  // console.log(`Password reset for user: ${user.name} (${user._id})`);
  // console.log(`User has reset token: ${!!user.resetPasswordToken}`);
  // console.log(`Reset token expires: ${user.resetPasswordExpire ? new Date(user.resetPasswordExpire).toISOString() : 'none'}`);

  try {
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // console.log(`Generated new password hash length: ${hashedPassword.length}`);
    
    // Update user password and clear reset token
    // Use direct update to avoid pre-save middleware conflicts
    const updateResult = await User.updateOne(
      { _id: user._id },
      { 
        $set: {
          password: hashedPassword,
          lastActive: new Date()
        },
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpire: 1
        }
      }
    );

    // console.log(`Update result: ${updateResult.modifiedCount} documents modified`);

    // Verify the update worked by fetching the user again
    const updatedUser = await User.findById(user._id).select('+password');
    // console.log(`Verification - User found: ${updatedUser ? 'Yes' : 'No'}, Password hash length: ${updatedUser?.password?.length || 0}`);
    
    // Test the new password immediately
    const testPasswordValid = await bcrypt.compare(password, updatedUser.password);
    // console.log(`New password test: ${testPasswordValid}`);

    // console.log(`=== PASSWORD RESET SUCCESS ===`);

    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        userId: user._id,
        timestamp: new Date().toISOString(),
        passwordUpdated: testPasswordValid
      }
    });

  } catch (error) {
    console.error('Error updating password:', error);
    // console.log(`=== PASSWORD RESET FAILED ===`);
    res.status(500).json({
      success: false,
      message: 'Failed to update password. Please try again.',
    });
  }
});

// Debug endpoint to test reset password without auth
router.get('/debug/reset-test/:token', async (req, res) => {
  const { token } = req.params;
  
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.json({
      success: false,
      message: 'Invalid or expired token',
      debug: {
        token,
        hashedToken,
        currentTime: Date.now(),
        found: false
      }
    });
  }

  res.json({
    success: true,
    message: 'Token is valid',
    debug: {
      token,
      hashedToken,
      currentTime: Date.now(),
      user: {
        id: user._id,
        email: user.email,
        resetPasswordExpire: user.resetPasswordExpire
      },
      found: true
    }
  });
});

// Password verification endpoint for testing
router.post('/debug/verify-password', async (req, res) => {
  const { email, password } = req.body;
  
  // console.log(`Password verification test for email: ${email}`);

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.json({
        success: false,
        message: 'User not found',
        debug: { email }
      });
    }

    // console.log(`User found: ${user._id}, Password hash exists: ${!!user.password}, Hash length: ${user.password?.length || 0}`);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    // console.log(`Password comparison result: ${isPasswordValid}`);

    // Test with a known password hash
    const testPassword = 'test123';
    const testHash = await bcrypt.hash(testPassword, 10);
    const testComparison = await bcrypt.compare(testPassword, testHash);
    // console.log(`Test bcrypt comparison: ${testComparison}`);

    res.json({
      success: isPasswordValid,
      message: isPasswordValid ? 'Password is correct' : 'Password is incorrect',
      debug: {
        userId: user._id,
        email: user.email,
        userName: user.name,
        lastActive: user.lastActive,
        hasResetToken: !!user.resetPasswordToken,
        resetTokenExpires: user.resetPasswordExpire,
        passwordHashLength: user.password?.length || 0,
        passwordHashPrefix: user.password?.substring(0, 10) || 'none',
        testBcryptWorking: testComparison
      }
    });

  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying password',
      error: error.message
    });
  }
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
    
    // console.log(`=== LOGIN ATTEMPT ===`);
    // console.log(`Email: ${email}`);
    // console.log(`Password length: ${password?.length || 0}`);

    // Find user by email with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      // console.log(`Login failed: User not found for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // console.log(`User found: ${user.name} (${user._id})`);
    // console.log(`User active: ${user.isActive}`);
    // console.log(`Password hash exists: ${!!user.password}`);
    // console.log(`Password hash length: ${user.password?.length || 0}`);

    // Check if user is active
    if (!user.isActive) {
      console.log(`Login failed: Account deactivated for user: ${user._id}`);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    // console.log(`Verifying password for user: ${user._id}`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    // console.log(`Password verification result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      // console.log(`Login failed: Invalid password for user: ${user._id}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // console.log(`Login successful for user: ${user._id}`);

    // Update last active and clear any existing reset tokens
    await User.updateOne(
      { _id: user._id },
      { 
        $set: {
          lastActive: new Date()
        },
        $unset: {
          resetPasswordToken: 1,
          resetPasswordExpire: 1
        }
      }
    );

    // Generate token
    const token = generateToken(user._id);

    // console.log(`Token generated for user: ${user._id}`);
    // console.log(`=== LOGIN SUCCESS ===`);

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
          emergencyContacts: user.emergencyContacts,
          lastActive: user.lastActive
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.log(`=== LOGIN FAILED ===`);
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
          emergencyContacts: user.emergencyContacts,
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
