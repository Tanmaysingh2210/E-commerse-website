const express = require('express');
const router  = express.Router();

const { getAllOrders, updateOrderStatus, getAdminStats, getOrder } = require('../controllers/orderController');
const { getAdminProducts, getAdminProduct }                        = require('../controllers/productController');
const { getAllCoupons, createCoupon, updateCoupon, deleteCoupon }  = require('../controllers/couponController');
const { getAllUsers, getUser, toggleUserStatus, updateUserRole }   = require('../controllers/adminController');

const { protect, authorize }                           = require('../middleware/authMiddleware');
const { couponValidator, paginationValidator }         = require('../middleware/validators');

router.use(protect, authorize('admin'));

// ── Dashboard ──────────────────────────────────────────────────────────────────
router.get('/stats', getAdminStats);

// ── Products (with costPrice) ──────────────────────────────────────────────────
router.get('/products',     paginationValidator, getAdminProducts);
router.get('/products/:id', getAdminProduct);

// ── Orders ─────────────────────────────────────────────────────────────────────
router.get('/orders',              paginationValidator, getAllOrders);
router.get('/orders/:id',          getOrder);
router.patch('/orders/:id/status', updateOrderStatus);

// ── Coupons ────────────────────────────────────────────────────────────────────
router.get('/coupons',        paginationValidator, getAllCoupons);
router.post('/coupons',       couponValidator, createCoupon);
router.put('/coupons/:id',    updateCoupon);
router.delete('/coupons/:id', deleteCoupon);

// ── Users ──────────────────────────────────────────────────────────────────────
router.get('/users',               paginationValidator, getAllUsers);
router.get('/users/:id',           getUser);
router.patch('/users/:id/status',  toggleUserStatus);
router.patch('/users/:id/role',    updateUserRole);

module.exports = router;