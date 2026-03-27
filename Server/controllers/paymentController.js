const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const { ApiError } = require('../middleware/errorMiddleware');
const { successResponse } = require('../utils/apiHelpers');

// ── Initialize Razorpay instance ───────────────────────────────────────────────
const oauthToken =
  process.env.RAZORPAY_OAUTH_TOKEN ||
  process.env.OAUTH_TOKEN ||
  process.env.oauthToken;

const razorpayConfig = oauthToken
  ? { oauthToken }
  : {
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    };

if (!razorpayConfig.oauthToken && (!razorpayConfig.key_id || !razorpayConfig.key_secret)) {
  throw new Error(
    'Razorpay credentials are required. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or RAZORPAY_OAUTH_TOKEN (or OAUTH_TOKEN).'
  );
}

const razorpay = new Razorpay(razorpayConfig);

// ── @desc   Create Razorpay order
// ── @route  POST /api/payment/create-order
// ── @access Private
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return next(new ApiError('Order ID is required.', 400));

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return next(new ApiError('Order not found.', 404));

    if (order.paymentStatus === 'paid') {
      return next(new ApiError('Order is already paid.', 400));
    }

    // Amount must be in paise (INR × 100)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(order.total * 100),
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        userId: req.user._id.toString(),
      },
    });

    // Store Razorpay order ID for later verification
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return successResponse(res, 200, 'Razorpay order created.', {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderNumber: order.orderNumber,
      prefill: {
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Verify Razorpay payment signature (CRITICAL — server-side only)
// ── @route  POST /api/payment/verify
// ── @access Private
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      return next(new ApiError('All payment verification fields are required.', 400));
    }

    // ── SIGNATURE VERIFICATION ─────────────────────────────────────────────────
    // Razorpay signs: razorpay_order_id + "|" + razorpay_payment_id
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValidSignature = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpaySignature, 'hex')
    );

    if (!isValidSignature) {
      // Log potential fraud attempt
      const logger = require('../utils/logger');
      logger.warn(`Invalid payment signature attempt - User: ${req.user._id}, Order: ${orderId}`);
      return next(new ApiError('Payment verification failed. Possible tampered data.', 400));
    }

    // ── Update order on verified payment ──────────────────────────────────────
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return next(new ApiError('Order not found.', 404));

    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.paidAt = new Date();
    order.statusHistory.push({
      status: 'confirmed',
      note: `Payment confirmed via Razorpay. Payment ID: ${razorpayPaymentId}`,
      updatedBy: req.user._id,
    });
    await order.save();

    return successResponse(res, 200, 'Payment verified. Order confirmed!', {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Handle Razorpay payment failure
// ── @route  POST /api/payment/failed
// ── @access Private
const handlePaymentFailure = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, error } = req.body;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return next(new ApiError('Order not found.', 404));

    order.paymentStatus = 'failed';
    order.statusHistory.push({
      status: 'pending',
      note: `Payment failed. Reason: ${error?.description || 'Unknown'}`,
      updatedBy: req.user._id,
    });
    await order.save();

    return successResponse(res, 200, 'Payment failure recorded.', { orderId });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get Razorpay key (for frontend initialization)
// ── @route  GET /api/payment/key
// ── @access Private
const getRazorpayKey = (req, res) => {
  res.status(200).json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
};

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  handlePaymentFailure,
  getRazorpayKey,
};
