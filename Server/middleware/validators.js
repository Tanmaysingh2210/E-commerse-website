const { body, param, query, validationResult } = require('express-validator');
const { ApiError } = require('./errorMiddleware');

// ── Helper: Run validation and return errors ───────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join(', ');
    return next(new ApiError(messages, 422));
  }
  next();
};

// ── Auth validators ────────────────────────────────────────────────────────────
const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  validate,
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

// ── Product validators ─────────────────────────────────────────────────────────
const productValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('sizes')
    .isArray({ min: 1 }).withMessage('At least one size is required'),
  validate,
];

// ── Review validators ──────────────────────────────────────────────────────────
const reviewValidator = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .notEmpty().withMessage('Comment is required')
    .isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters'),
  validate,
];

// ── Order validators ───────────────────────────────────────────────────────────
const orderValidator = [
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid Indian phone number'),
  body('shippingAddress.street').trim().notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('shippingAddress.state').trim().notEmpty().withMessage('State is required'),
  body('shippingAddress.postalCode')
    .trim()
    .notEmpty().withMessage('Postal code is required')
    .matches(/^\d{6}$/).withMessage('Enter a valid 6-digit postal code'),
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['razorpay', 'cod']).withMessage('Invalid payment method'),
  validate,
];

// ── Coupon validators ──────────────────────────────────────────────────────────
const couponValidator = [
  body('code').trim().notEmpty().withMessage('Coupon code is required').toUpperCase(),
  body('discountType')
    .notEmpty().withMessage('Discount type is required')
    .isIn(['percent', 'flat']).withMessage('Discount type must be percent or flat'),
  body('discountValue')
    .notEmpty().withMessage('Discount value is required')
    .isFloat({ min: 0 }).withMessage('Discount value must be positive'),
  body('expiresAt')
    .notEmpty().withMessage('Expiry date is required')
    .isISO8601().withMessage('Enter a valid date'),
  validate,
];

// ── Pagination query validator ─────────────────────────────────────────────────
const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt(),
  validate,
];

module.exports = {
  registerValidator,
  loginValidator,
  productValidator,
  reviewValidator,
  orderValidator,
  couponValidator,
  paginationValidator,
  validate,
};