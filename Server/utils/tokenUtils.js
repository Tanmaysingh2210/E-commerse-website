const jwt = require('jsonwebtoken');

const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const accessToken  = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);

  const isProduction = process.env.NODE_ENV === 'production';

  // ── Set HttpOnly cookies (NOT signed — no COOKIE_SECRET needed) ────────────
  // The frontend also receives tokens in the response body for localStorage.
  res
    .cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: isProduction ? 'strict' : 'lax',
      secure:   isProduction,
      maxAge:   15 * 60 * 1000,           // 15 minutes
    })
    .cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: isProduction ? 'strict' : 'lax',
      secure:   isProduction,
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .status(statusCode)
    .json({
      success: true,
      message,
      accessToken,   // frontend stores this in localStorage
      refreshToken,  // frontend uses this for refresh calls
      user: {
        _id:    user._id,
        name:   user.name,
        email:  user.email,
        role:   user.role,
        avatar: user.avatar,
      },
    });
};

const clearTokenCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res
    .clearCookie('accessToken',  { httpOnly: true, secure: isProduction })
    .clearCookie('refreshToken', { httpOnly: true, secure: isProduction });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  sendTokenResponse,
  clearTokenCookies,
};