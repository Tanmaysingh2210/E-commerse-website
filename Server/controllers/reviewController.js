const Review  = require('../models/Review');
const Order   = require('../models/Order');
const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorMiddleware');
const { paginatedResponse, buildQueryOptions, successResponse } = require('../utils/apiHelpers');

// ── @desc   Get reviews for a product
// ── @route  GET /api/reviews/product/:productId
// ── @access Public
const getProductReviews = async (req, res, next) => {
  try {
    const { page, limit, skip } = buildQueryOptions(req.query);

    const sortMap = {
      oldest:  { createdAt: 1 },
      rating:  { rating: -1 },
      helpful: { helpfulVotes: -1 },
    };
    const sort = sortMap[req.query.sort] || { createdAt: -1 };

    const filter = { product: req.params.productId, isApproved: true };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort(sort).skip(skip).limit(limit)
        .populate('user', 'name avatar'),
      Review.countDocuments(filter),
    ]);

    const distribution = await Review.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(req.params.productId), isApproved: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: reviews,
      distribution,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) { next(error); }
};

// ── @desc   Create review
// ── @route  POST /api/reviews/product/:productId
// ── @access Private
const createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, title, comment } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new ApiError('Product not found.', 404));
    }

    const existingReview = await Review.findOne({ product: productId, user: req.user._id });
    if (existingReview) {
      return next(new ApiError('You have already reviewed this product.', 409));
    }

    const hasPurchased = await Order.findOne({
      user: req.user._id,
      'items.product': productId,
      status: 'delivered',
    });

    const review = await Review.create({
      product: productId,
      user:    req.user._id,
      rating, title, comment,
      isVerifiedPurchase: !!hasPurchased,
    });

    await review.populate('user', 'name avatar');
    return successResponse(res, 201, 'Review submitted!', { review });
  } catch (error) { next(error); }
};

// ── @desc   Update review
// ── @route  PUT /api/reviews/review/:reviewId
// ── @access Private
const updateReview = async (req, res, next) => {
  try {
    const { rating, title, comment } = req.body;
    const review = await Review.findOne({ _id: req.params.reviewId, user: req.user._id });
    if (!review) return next(new ApiError('Review not found or not authorized.', 404));

    if (rating)            review.rating  = rating;
    if (title !== undefined) review.title = title;
    if (comment)           review.comment = comment;
    await review.save();
    return successResponse(res, 200, 'Review updated.', { review });
  } catch (error) { next(error); }
};

// ── @desc   Delete review
// ── @route  DELETE /api/reviews/review/:reviewId
// ── @access Private (own) or Admin
const deleteReview = async (req, res, next) => {
  try {
    const query = { _id: req.params.reviewId };
    if (req.user.role !== 'admin') query.user = req.user._id;

    const review = await Review.findOne(query);
    if (!review) return next(new ApiError('Review not found or not authorized.', 404));

    await review.deleteOne();
    return successResponse(res, 200, 'Review deleted.');
  } catch (error) { next(error); }
};

// ── @desc   Get user's own reviews
// ── @route  GET /api/reviews/my-reviews
// ── @access Private
const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('product', 'name images slug');
    return successResponse(res, 200, 'Your reviews.', { reviews });
  } catch (error) { next(error); }
};

module.exports = { getProductReviews, createReview, updateReview, deleteReview, getMyReviews };