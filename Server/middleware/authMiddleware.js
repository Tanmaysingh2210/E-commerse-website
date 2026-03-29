const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError } = require('./errorMiddleware');

// ── Protect: Verify access token ────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    // 1) Authorization header (Bearer) — primary method used by frontend
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2) Fallback: plain httpOnly cookie (NOT signed)
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new ApiError('Not authenticated. Please log in.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return next(new ApiError('User no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new ApiError('Your account has been deactivated. Contact support.', 403));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// ── Authorize: Role-based access control ────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(`Role '${req.user.role}' is not authorized to access this resource.`, 403)
      );
    }
    next();
  };
};

// ── Optional auth: attach user if token present, don't block if not ─────────────
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (user && user.isActive) req.user = user;
    }
    next();
  } catch {
    next(); // silently ignore — user just won't be attached
  }
};

module.exports = { protect, authorize, optionalAuth };