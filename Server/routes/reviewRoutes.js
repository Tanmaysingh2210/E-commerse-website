const express = require('express');
const router  = express.Router();

const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
} = require('../controllers/reviewController');

const { protect }                          = require('../middleware/authMiddleware');
const { reviewValidator, paginationValidator } = require('../middleware/validators');

// ── Public ─────────────────────────────────────────────────────────────────────
router.get('/product/:productId', paginationValidator, getProductReviews);

// ── Private — specific paths BEFORE param paths to avoid conflicts ─────────────
router.get('/my-reviews',        protect, getMyReviews);
router.post('/product/:productId', protect, reviewValidator, createReview);
router.put('/review/:reviewId',    protect, reviewValidator, updateReview);
router.delete('/review/:reviewId', protect, deleteReview);

module.exports = router;