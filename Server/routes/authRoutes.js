const express = require('express');
const router = express.Router();

const {
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../config/rateLimiter');
const { registerValidator, loginValidator } = require('../middleware/validators');

// ── Public routes ──────────────────────────────────────────────────────────────
router.post('/register', authLimiter, registerValidator, register);
router.post('/login',    authLimiter, loginValidator, login);
router.post('/google',   authLimiter, googleAuth);
router.post('/refresh',  refreshToken);

// ── Protected routes ───────────────────────────────────────────────────────────
router.post('/logout',          protect, logout);
router.get('/me',               protect, getMe);
router.put('/me',               protect, updateProfile);
router.put('/change-password',  protect, changePassword);

module.exports = router;