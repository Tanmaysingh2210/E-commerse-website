const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { ApiError } = require('../middleware/errorMiddleware');
const { successResponse } = require('../utils/apiHelpers');

// ── Helper: Populate cart items with current product data ─────────────────────
const getPopulatedCart = async (userId) => {
  return Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    select: 'name images price discountedPrice sizes isActive slug',
  });
};

// ── @desc   Get user's cart
// ── @route  GET /api/cart
// ── @access Private
const getCart = async (req, res, next) => {
  try {
    let cart = await getPopulatedCart(req.user._id);
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }
    return successResponse(res, 200, 'Cart fetched.', { cart });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Add item to cart
// ── @route  POST /api/cart/add
// ── @access Private
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;
    if (!productId) return next(new ApiError('Product ID is required.', 400));

    // Validate product and stock
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new ApiError('Product not found or unavailable.', 404));
    }

    // Check stock for selected size
    if (size) {
      const sizeObj = product.sizes.find((s) => s.size === size);
      if (!sizeObj) return next(new ApiError('Selected size not available.', 400));
      if (sizeObj.stock < quantity) {
        return next(new ApiError(`Only ${sizeObj.stock} items left in stock.`, 400));
      }
    }

    const itemPrice = product.discountedPrice ?? product.price;

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Check if same product+size already in cart
    const existingIdx = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (existingIdx >= 0) {
      const newQty = cart.items[existingIdx].quantity + quantity;
      if (newQty > 10) return next(new ApiError('Maximum 10 items of the same product allowed.', 400));
      cart.items[existingIdx].quantity = newQty;
    } else {
      cart.items.push({ product: productId, quantity, size, color, price: itemPrice });
    }

    await cart.save();
    cart = await getPopulatedCart(req.user._id);

    return successResponse(res, 200, 'Item added to cart.', { cart });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Update cart item quantity
// ── @route  PUT /api/cart/:itemId
// ── @access Private
const updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) return next(new ApiError('Quantity must be at least 1.', 400));
    if (quantity > 10) return next(new ApiError('Maximum quantity is 10.', 400));

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return next(new ApiError('Cart not found.', 404));

    const item = cart.items.id(req.params.itemId);
    if (!item) return next(new ApiError('Cart item not found.', 404));

    // Validate stock
    const product = await Product.findById(item.product);
    if (item.size) {
      const sizeObj = product.sizes.find((s) => s.size === item.size);
      if (sizeObj && sizeObj.stock < quantity) {
        return next(new ApiError(`Only ${sizeObj.stock} items available.`, 400));
      }
    }

    item.quantity = quantity;
    await cart.save();

    const populatedCart = await getPopulatedCart(req.user._id);
    return successResponse(res, 200, 'Cart updated.', { cart: populatedCart });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Remove item from cart
// ── @route  DELETE /api/cart/:itemId
// ── @access Private
const removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return next(new ApiError('Cart not found.', 404));

    cart.items = cart.items.filter(
      (item) => item._id.toString() !== req.params.itemId
    );
    await cart.save();

    const populatedCart = await getPopulatedCart(req.user._id);
    return successResponse(res, 200, 'Item removed from cart.', { cart: populatedCart });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Clear entire cart
// ── @route  DELETE /api/cart
// ── @access Private
const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], appliedCoupon: null }
    );
    return successResponse(res, 200, 'Cart cleared.');
  } catch (error) {
    next(error);
  }
};

// ── @desc   Apply coupon to cart
// ── @route  POST /api/cart/coupon
// ── @access Private
const applyCoupon = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return next(new ApiError('Coupon code is required.', 400));

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return next(new ApiError('Invalid coupon code.', 404));

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return next(new ApiError('Your cart is empty.', 400));
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Check first-order only coupons
    if (coupon.isFirstOrderOnly) {
      const Order = require('../models/Order');
      const orderCount = await Order.countDocuments({ user: req.user._id });
      if (orderCount > 0) {
        return next(new ApiError('This coupon is for first orders only.', 400));
      }
    }

    const validationResult = coupon.isValid(req.user._id, subtotal);
    if (!validationResult.valid) {
      return next(new ApiError(validationResult.message, 400));
    }

    const discountAmount = coupon.calculateDiscount(subtotal);

    cart.appliedCoupon = {
      code: coupon.code,
      discountAmount,
      discountType: coupon.discountType,
    };
    await cart.save();

    return successResponse(res, 200, `Coupon applied! You save ₹${discountAmount}.`, {
      coupon: { code: coupon.code, discountAmount, discountType: coupon.discountType },
    });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Remove applied coupon
// ── @route  DELETE /api/cart/coupon
// ── @access Private
const removeCoupon = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { appliedCoupon: null }
    );
    return successResponse(res, 200, 'Coupon removed.');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
};
