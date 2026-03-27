const express = require('express');
const router = express.Router();

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
} = require('../controllers/cartController');

const { protect } = require('../middleware/authMiddleware');

// All cart routes require authentication
router.use(protect);

router.get('/',              getCart);
router.post('/add',          addToCart);
router.put('/:itemId',       updateCartItem);
router.delete('/:itemId',    removeFromCart);
router.delete('/',           clearCart);
router.post('/coupon',       applyCoupon);
router.delete('/coupon',     removeCoupon);

module.exports = router;