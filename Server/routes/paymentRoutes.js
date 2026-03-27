const express = require('express');
const router = express.Router();

const {
  createRazorpayOrder,
  verifyPayment,
  handlePaymentFailure,
  getRazorpayKey,
} = require('../controllers/paymentController');

const { protect } = require('../middleware/authMiddleware');
const { paymentLimiter } = require('../config/rateLimiter');

router.use(protect);

router.get('/key',            getRazorpayKey);
router.post('/create-order',  paymentLimiter, createRazorpayOrder);
router.post('/verify',        paymentLimiter, verifyPayment);
router.post('/failed',        handlePaymentFailure);

module.exports = router;