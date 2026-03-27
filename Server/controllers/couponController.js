const Coupon = require('../models/Coupon');
const { ApiError } = require('../middleware/errorMiddleware');
const { paginatedResponse, buildQueryOptions, successResponse } = require('../utils/apiHelpers');

// ── @desc   Validate a coupon code (user-facing)
// ── @route  POST /api/coupons/validate
// ── @access Private
const validateCoupon = async (req, res, next) => {
  try {
    const { code, orderTotal } = req.body;
    if (!code) return next(new ApiError('Coupon code is required.', 400));

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return next(new ApiError('Invalid coupon code.', 404));

    const validation = coupon.isValid(req.user._id, orderTotal || 0);
    if (!validation.valid) return next(new ApiError(validation.message, 400));

    const discountAmount = coupon.calculateDiscount(orderTotal || 0);

    return successResponse(res, 200, 'Coupon is valid.', {
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minOrderAmount: coupon.minOrderAmount,
        expiresAt: coupon.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get all coupons (Admin)
// ── @route  GET /api/admin/coupons
// ── @access Admin
const getAllCoupons = async (req, res, next) => {
  try {
    const { page, limit, skip, sort } = buildQueryOptions(req.query);
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort(sort).skip(skip).limit(limit).select('-usedBy'),
      Coupon.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: coupons, total, page, limit });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Create coupon (Admin)
// ── @route  POST /api/admin/coupons
// ── @access Admin
const createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);
    return successResponse(res, 201, 'Coupon created.', { coupon });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Update coupon (Admin)
// ── @route  PUT /api/admin/coupons/:id
// ── @access Admin
const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!coupon) return next(new ApiError('Coupon not found.', 404));
    return successResponse(res, 200, 'Coupon updated.', { coupon });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Delete coupon (Admin)
// ── @route  DELETE /api/admin/coupons/:id
// ── @access Admin
const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return next(new ApiError('Coupon not found.', 404));
    return successResponse(res, 200, 'Coupon deleted.');
  } catch (error) {
    next(error);
  }
};

module.exports = { validateCoupon, getAllCoupons, createCoupon, updateCoupon, deleteCoupon };
