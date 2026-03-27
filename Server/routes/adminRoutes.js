const express = require('express');
const router = express.Router();

const { getAllOrders, updateOrderStatus, getAdminStats } = require('../controllers/orderController');
const { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } = require('../controllers/couponController');
const { getAllUsers, getUser, toggleUserStatus, updateUserRole } = require('../controllers/adminController');

const { protect, authorize } = require('../middleware/authMiddleware');
const { couponValidator, paginationValidator } = require('../middleware/validators');

// Every admin route must be authenticated + admin role
router.use(protect, authorize('admin'));

// ── Dashboard ──────────────────────────────────────────────────────────────────
router.get('/stats', getAdminStats);

// ── Orders ─────────────────────────────────────────────────────────────────────
router.get('/orders',              paginationValidator, getAllOrders);
router.get('/orders/:id',          require('../controllers/orderController').getOrder);
router.patch('/orders/:id/status', updateOrderStatus);

// ── Coupons ────────────────────────────────────────────────────────────────────
router.get('/coupons',       paginationValidator, getAllCoupons);
router.post('/coupons',      couponValidator, createCoupon);
router.put('/coupons/:id',   updateCoupon);
router.delete('/coupons/:id',deleteCoupon);

// ── Users ──────────────────────────────────────────────────────────────────────
router.get('/users',                   paginationValidator, getAllUsers);
router.get('/users/:id',               getUser);
router.patch('/users/:id/status',      toggleUserStatus);
router.patch('/users/:id/role',        updateUserRole);

module.exports = router;