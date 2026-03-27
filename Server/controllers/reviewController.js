const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorMiddleware');
const { paginatedResponse, buildQueryOptions, successResponse } = require('../utils/apiHelpers');

// ── @desc   Get reviews for a product
// ── @route  GET /api/reviews/:productId
// ── @access Public
const getProductReviews = async (req, res, next) => {
  try {
    const { page, limit, skip } = buildQueryOptions(req.query);

    const sort = req.query.sort === 'oldest'
      ? { createdAt: 1 }
      : req.query.sort === 'rating'
        ? { rating: -1 }
        : { createdAt: -1 };

    const filter = { product: req.params.productId, isApproved: true };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'name avatar'),
      Review.countDocuments(filter),
    ]);

    // Rating distribution
    const distribution = await Review.aggregate([
      { $match: filter },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    return paginatedResponse(res, {
      data: reviews,
      total,
      page,
      limit,
      message: 'Reviews fetched.',
    });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Create review (only for users who bought the product)
// ── @route  POST /api/reviews/:productId
// ── @access Private
const createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    // Check product exists
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new ApiError('Product not found.', 404));
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({ product: productId, user: req.user._id });
    if (existingReview) {
      return next(new ApiError('You have already reviewed this product.', 409));
    }

    // Check verified purchase
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'items.product': productId,
      status: 'delivered',
      paymentStatus: 'paid',
    });

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      rating,
      title,
      comment,
      isVerifiedPurchase: !!hasPurchased,
    });

    await review.populate('user', 'name avatar');

    return successResponse(res, 201, 'Review submitted successfully.', { review });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Update own review
// ── @route  PUT /api/reviews/:reviewId
// ── @access Private
const updateReview = async (req, res, next) => {
  try {
    const { rating, title, comment } = req.body;
    const review = await Review.findOne({ _id: req.params.reviewId, user: req.user._id });
    if (!review) return next(new ApiError('Review not found or not authorized.', 404));

    if (rating) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment) review.comment = comment;
    await review.save();

    return successResponse(res, 200, 'Review updated.', { review });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Delete review
// ── @route  DELETE /api/reviews/:reviewId
// ── @access Private (own review) or Admin
const deleteReview = async (req, res, next) => {
  try {
    const query = { _id: req.params.reviewId };
    if (req.user.role !== 'admin') {
      query.user = req.user._id;  // Users can only delete their own
    }

    const review = await Review.findOne(query);
    if (!review) return next(new ApiError('Review not found or not authorized.', 404));

    await review.deleteOne();
    return successResponse(res, 200, 'Review deleted.');
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get user's own reviews
// ── @route  GET /api/reviews/my-reviews
// ── @access Private
const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('product', 'name images slug');

    return successResponse(res, 200, 'Your reviews fetched.', { reviews });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProductReviews, createReview, updateReview, deleteReview, getMyReviews };
