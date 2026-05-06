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
import rateLimit from 'express-rate-limit';

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

const router = express.Router();

// Email normalization function - Gmail ignores dots in the local part


// function normalizeEmail(email) {
//   if (!email) return email;

//   let normalized = email.toLowerCase().trim();

//   // Fix ONLY if @ is missing before gmail.com
//   if (!normalized.includes('@') && normalized.includes('gmail.com')) {
//     normalized = normalized.replace('gmail.com', '@gmail.com');
//   }

//   // Remove accidental double @
//   normalized = normalized.replace(/@@+/g, '@');

//   // Gmail normalization
//   if (normalized.endsWith('@gmail.com')) {
//     const [localPart, domain] = normalized.split('@');

//     return `${localPart
//       .replace(/\./g, '')
//       .split('+')[0]
//     }@${domain}`;
//   }

//   return normalized;
// }
function normalizeEmail(email) {
  if (!email) return email;

  let normalized = email.toLowerCase().trim();

  // Fix missing @ only if clearly broken
  if (!normalized.includes('@') && normalized.includes('gmail.com')) {
    normalized = normalized.replace('gmail.com', '@gmail.com');
  }

  // Remove accidental @@
  normalized = normalized.replace(/@@+/g, '@');

  // Remove ONLY + alias (safe)
  if (normalized.endsWith('@gmail.com')) {
    const [localPart, domain] = normalized.split('@');
    return `${localPart.split('+')[0]}@${domain}`;
  }

  return normalized;
}
// FORGOT PASSWORD (send reset token)

router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const { email } = req.body;

  // Normalize email to handle Gmail dot variations
  const normalizedEmail = normalizeEmail(email);

  // console.log(`Forgot password request for email: ${email} (normalized: ${normalizedEmail})`);

  if (!email) {
    // console.log('Forgot password failed: Email required');
    return res.status(400).json({
      success: false,
      message: 'Email is required',
    });
  }

  let user;
  let resetToken;
  
  try {
    // user = await User.findOne({ email: normalizedEmail });
    user = await User.findOne({
  $or: [
    { email: normalizedEmail },
    { email: email.toLowerCase().trim() }
  ]
});
  } catch (dbError) {
    console.error('MongoDB error finding user:', dbError.message);
    // For testing purposes, allow email sending even if MongoDB fails
    // console.log('Proceeding with email send for testing (MongoDB unavailable)');
  }

  // Generate reset token (always generate for testing)
  resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // If user found and MongoDB is working, save reset token and send email
  if (user) {
    // console.log(`Forgot password: User found - ${user.name} (${user._id})`);
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    try {
      await user.save();
      // console.log(`Reset token saved for user: ${user._id}`);

      // Send password reset email
      const notificationService = (await import('../services/notificationService.js')).default;
await notificationService.sendPasswordResetEmail(user.email, resetToken);

// console.log(`📧 Password reset email triggered for: ${email}`);

      res.json({
        success: true,
        message: 'If this email exists, a reset link has been sent',
        data: process.env.NODE_ENV === 'development' ? {
          token: resetToken,
          userId: user._id,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        } : undefined
      });

    } catch (saveError) {
      console.error('Error saving reset token:', saveError.message);
      res.status(500).json({
        success: false,
        message: 'Failed to process password reset request',
      });
    }
  } else {
    // console.log(`Forgot password: User not found for email: ${email}`);
    res.json({
      success: true,
      message: 'If this email exists, a reset link has been sent',
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

  // Find user with valid reset token with retry logic
  let user;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
      break; // Success, exit retry loop
    } catch (dbError) {
      console.error(`MongoDB error finding user (attempt ${retryCount + 1}/${maxRetries}):`, dbError.message);
      retryCount++;
      
      if (retryCount < maxRetries) {
        // console.log(`Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (!user) {
    // console.log('Password reset failed: Invalid or expired token (or MongoDB unavailable)');
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired token. Please request a new password reset link.',
      error: 'INVALID_TOKEN'
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
    
    // Update user password and clear reset token with retry logic
    let updateResult;
    let updateRetryCount = 0;
    const maxUpdateRetries = 3;
    
    while (updateRetryCount < maxUpdateRetries) {
      try {
        updateResult = await User.updateOne(
          { _id: user._id },
          {
            $set: {
              password: hashedPassword,
              resetPasswordToken: undefined,
              resetPasswordExpire: undefined,
            },
          }
        );
        break; // Success, exit retry loop
      } catch (updateError) {
        console.error(`MongoDB error updating password (attempt ${updateRetryCount + 1}/${maxUpdateRetries}):`, updateError.message);
        updateRetryCount++;
        
        if (updateRetryCount < maxUpdateRetries) {
          // console.log(`Retrying update in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw updateError; // Re-throw after max retries
        }
      }
    }

    // console.log(`Update result: ${updateResult.modifiedCount} documents modified`);

    // Verify the update worked by fetching the user again with retry
    let updatedUser;
    let verifyRetryCount = 0;
    const maxVerifyRetries = 3;
    
    while (verifyRetryCount < maxVerifyRetries) {
      try {
        updatedUser = await User.findById(user._id).select('+password');
        break;
      } catch (verifyError) {
        console.error(`MongoDB error verifying user (attempt ${verifyRetryCount + 1}/${maxVerifyRetries}):`, verifyError.message);
        verifyRetryCount++;
        
        if (verifyRetryCount < maxVerifyRetries) {
          // console.log(`Retrying verification in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw verifyError;
        }
      }
    }
    
    // console.log(`Verification - User found: ${updatedUser ? 'Yes' : 'No'}, Password hash length: ${updatedUser?.password?.length || 0}`);

    // Test the new password immediately
    const testPasswordValid = await bcrypt.compare(password, updatedUser.password);
    // console.log(`New password test: ${testPasswordValid}`);

    if (!testPasswordValid) {
      throw new Error('Password verification failed after update');
    }

    console.log(`=== PASSWORD RESET SUCCESS ===`);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });

  } catch (error) {
    console.error('Error updating password:', error);
    // console.log(`=== PASSWORD RESET FAILED ===`);
    res.status(500).json({
      success: false,
      message: 'Failed to update password. Please try again.',
      error: 'UPDATE_FAILED'
    });
  }
});

// Debug endpoint to list all users (development only)
router.get('/debug/users', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ success: false, message: 'Not allowed in production' });
  }
  
  try {
    const users = await User.find().select('email name _id').lean();
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Debug endpoint to normalize all user emails (development only)
router.post('/debug/normalize-emails', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ success: false, message: 'Not allowed in production' });
  }
  
  try {
    const users = await User.find();
    let updatedCount = 0;
    
    for (const user of users) {
      const normalizedEmail = normalizeEmail(user.email);
      
      if (user.email !== normalizedEmail) {
        // console.log(`Updating email for user ${user._id}: ${user.email} -> ${normalizedEmail}`);
        user.email = normalizedEmail;
        await user.save();
        updatedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Normalized ${updatedCount} user emails`,
      updatedCount
    });
  } catch (error) {
    console.error('Error normalizing emails:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to normalize emails'
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

    // Normalize email to handle Gmail dot variations
    const normalizedEmail = normalizeEmail(email);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // console.log(`Registration attempt for email: ${email} (normalized: ${normalizedEmail})`);

    const existingEmail = await User.findOne({
  $or: [
    { email: normalizedEmail },
    { email: email.toLowerCase().trim() }
  ]
});
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
  email: email.toLowerCase().trim(), // ✅ store ORIGINAL
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
    
    // Normalize email to handle Gmail dot variations
    const normalizedEmail = normalizeEmail(email);
    
    // console.log(`Login attempt for email: ${email} (normalized: ${normalizedEmail})`);
    
    // Find user by email with password field
    // const user = await User.findOne({ email: normalizedEmail }).select('+password');
const user = await User.findOne({
  $or: [
    { email: normalizedEmail },
    { email: email.toLowerCase().trim() }
  ]
}).select('+password');
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
      // console.log(`Login failed: Account deactivated for user: ${user._id}`);
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
    // console.log(`=== LOGIN FAILED ===`);
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
