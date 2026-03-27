const express = require('express');
const router = express.Router();

const { validateCoupon } = require('../controllers/couponController');
const { protect } = require('../middleware/authMiddleware');

// User: validate a coupon before checkout
router.post('/validate', protect, validateCoupon);

module.exports = router;