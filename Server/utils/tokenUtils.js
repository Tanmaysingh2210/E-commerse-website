const jwt = require('jsonwebtoken');

/**
 * Generate an access token (short-lived)
 */
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
  );
};

/**
 * Generate a refresh token (long-lived)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

/**
 * Send tokens as HTTP-only signed cookies + return in response body
 */
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const isProduction = process.env.NODE_ENV === 'production';

  // ── Cookie options ─────────────────────────────────────────────────────────
  const cookieOptions = {
    httpOnly: true,      // Not accessible via JS
    signed: true,        // Tamper-proof via cookie-parser secret
    sameSite: isProduction ? 'strict' : 'lax',
    secure: isProduction,  // HTTPS only in production
  };

  res
    .cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,  // 15 minutes
    })
    .cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
      path: '/api/auth/refresh',  // Only sent to refresh endpoint
    })
    .status(statusCode)
    .json({
      success: true,
      message,
      accessToken,  // Also send in body for mobile clients
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
};

/**
 * Clear auth cookies on logout
 */
const clearTokenCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res
    .clearCookie('accessToken', { httpOnly: true, secure: isProduction, signed: true })
    .clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      signed: true,
      path: '/api/auth/refresh',
    });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  sendTokenResponse,
  clearTokenCookies,
};