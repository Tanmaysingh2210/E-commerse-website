const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { ApiError } = require('../middleware/errorMiddleware');
const { sendTokenResponse, generateAccessToken, generateRefreshToken, clearTokenCookies } = require('../utils/tokenUtils');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── @desc   Register new user
// ── @route  POST /api/auth/register
// ── @access Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ApiError('Email already registered. Please login.', 409));
    }

    const user = await User.create({ name, email, password });

    sendTokenResponse(user, 201, res, 'Account created successfully.');
  } catch (error) {
    next(error);
  }
};

// ── @desc   Login user
// ── @route  POST /api/auth/login
// ── @access Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Must include password (select: false in schema)
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');
    if (!user || !user.password) {
      return next(new ApiError('Invalid email or password.', 401));
    }

    // Check account lock
    if (user.isLocked) {
      return next(new ApiError('Account temporarily locked due to failed login attempts. Try again later.', 423));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return next(new ApiError('Invalid email or password.', 401));
    }

    if (!user.isActive) {
      return next(new ApiError('Account deactivated. Contact support.', 403));
    }

    // Reset login attempts on success
    await User.findByIdAndUpdate(user._id, {
      $set: { loginAttempts: 0 },
      $unset: { lockUntil: 1 },
    });

    // Save refresh token in DB
    const refreshToken = generateRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    sendTokenResponse(user, 200, res, 'Login successful.');
  } catch (error) {
    next(error);
  }
};

// ── @desc   Google OAuth login/register
// ── @route  POST /api/auth/google
// ── @access Public
const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return next(new ApiError('Google ID token is required.', 400));

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, name, email, picture } = ticket.getPayload();

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // New user — create account
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        isEmailVerified: true,
      });
    } else if (!user.googleId) {
      // Existing email user — link Google account
      user.googleId = googleId;
      user.avatar = user.avatar || picture;
      await user.save();
    }

    if (!user.isActive) {
      return next(new ApiError('Account deactivated. Contact support.', 403));
    }

    const refreshToken = generateRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken });

    sendTokenResponse(user, 200, res, 'Google authentication successful.');
  } catch (error) {
    next(error);
  }
};

// ── @desc   Refresh access token using refresh token
// ── @route  POST /api/auth/refresh
// ── @access Public (requires valid refresh token)
const refreshToken = async (req, res, next) => {
  try {
    const token = req.signedCookies?.refreshToken || req.body.refreshToken;
    if (!token) return next(new ApiError('Refresh token missing.', 401));

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return next(new ApiError('Invalid refresh token. Please log in again.', 401));
    }

    if (!user.isActive) {
      return next(new ApiError('Account deactivated.', 403));
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate refresh token
    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    const isProduction = process.env.NODE_ENV === 'production';
    res
      .cookie('accessToken', newAccessToken, {
        httpOnly: true, signed: true,
        sameSite: isProduction ? 'strict' : 'lax',
        secure: isProduction,
        maxAge: 15 * 60 * 1000,
      })
      .cookie('refreshToken', newRefreshToken, {
        httpOnly: true, signed: true,
        sameSite: isProduction ? 'strict' : 'lax',
        secure: isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh',
      })
      .status(200)
      .json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Logout user
// ── @route  POST /api/auth/logout
// ── @access Private
const logout = async (req, res, next) => {
  try {
    // Invalidate refresh token in DB
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    clearTokenCookies(res);
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get current logged-in user profile
// ── @route  GET /api/auth/me
// ── @access Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Update user profile
// ── @route  PUT /api/auth/me
// ── @access Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, addresses } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (addresses) updates.addresses = addresses;

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true, runValidators: true,
    });

    res.status(200).json({ success: true, message: 'Profile updated.', user });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Change password
// ── @route  PUT /api/auth/change-password
// ── @access Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return next(new ApiError('Both current and new password are required.', 400));
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return next(new ApiError('Current password is incorrect.', 401));

    user.password = newPassword;
    await user.save();

    clearTokenCookies(res);
    res.status(200).json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, googleAuth, refreshToken, logout, getMe, updateProfile, changePassword };