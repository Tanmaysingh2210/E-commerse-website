const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../config/rateLimiter');
const { productValidator, paginationValidator } = require('../middleware/validators');

// ── Public ─────────────────────────────────────────────────────────────────────
router.get('/',          apiLimiter, paginationValidator, getProducts);
router.get('/featured',  apiLimiter, getFeaturedProducts);
router.get('/categories',apiLimiter, getCategories);
router.get('/:identifier', apiLimiter, getProduct);

// ── Admin only ─────────────────────────────────────────────────────────────────
router.post(  '/',          protect, authorize('admin'), productValidator, createProduct);
router.put(   '/:id',       protect, authorize('admin'), updateProduct);
router.delete('/:id',       protect, authorize('admin'), deleteProduct);
router.patch( '/:id/stock', protect, authorize('admin'), updateStock);

module.exports = router;