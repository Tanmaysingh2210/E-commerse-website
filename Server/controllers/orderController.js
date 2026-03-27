const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { ApiError } = require('../middleware/errorMiddleware');
const { paginatedResponse, buildQueryOptions, successResponse } = require('../utils/apiHelpers');

const SHIPPING_THRESHOLD = 999;  // Free shipping over ₹999
const SHIPPING_CHARGE = 99;

// ── @desc   Create order from cart
// ── @route  POST /api/orders
// ── @access Private
const createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, couponCode } = req.body;

    // 1. Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return next(new ApiError('Your cart is empty.', 400));
    }

    // 2. Validate stock and build order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        return next(new ApiError(`Product "${item.product?.name || 'Unknown'}" is no longer available.`, 400));
      }

      if (item.size) {
        const sizeObj = product.sizes.find((s) => s.size === item.size);
        if (!sizeObj || sizeObj.stock < item.quantity) {
          return next(new ApiError(`Insufficient stock for "${product.name}" (${item.size}).`, 400));
        }
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || '',
        price: item.price,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      });
    }

    // 3. Calculate pricing
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCharge = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    let discount = 0;
    let appliedCoupon = null;

    // 4. Validate and apply coupon
    if (couponCode || cart.appliedCoupon?.code) {
      const code = (couponCode || cart.appliedCoupon.code).toUpperCase();
      const coupon = await Coupon.findOne({ code });

      if (coupon) {
        const validation = coupon.isValid(req.user._id, subtotal);
        if (validation.valid) {
          discount = coupon.calculateDiscount(subtotal);
          appliedCoupon = { code: coupon.code, discountAmount: discount };

          // Mark coupon as used
          await Coupon.findByIdAndUpdate(coupon._id, {
            $inc: { usageCount: 1 },
            $addToSet: { usedBy: req.user._id },
          });
        }
      }
    }

    const total = Math.max(0, subtotal + shippingCharge - discount);

    // 5. Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingCharge,
      discount,
      total,
      coupon: appliedCoupon,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
      statusHistory: [
        {
          status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
          note: paymentMethod === 'cod' ? 'Order placed with Cash on Delivery.' : 'Order created. Awaiting payment.',
          updatedBy: req.user._id,
        },
      ],
    });

    // 6. Decrement stock
    const stockUpdates = orderItems.map((item) => {
      if (item.size) {
        return Product.findOneAndUpdate(
          { _id: item.product, 'sizes.size': item.size },
          { $inc: { 'sizes.$.stock': -item.quantity } }
        );
      }
      return null;
    });
    await Promise.all(stockUpdates.filter(Boolean));

    // 7. Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], appliedCoupon: null }
    );

    return successResponse(res, 201, 'Order created successfully.', { order });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get logged-in user's orders
// ── @route  GET /api/orders/my-orders
// ── @access Private
const getMyOrders = async (req, res, next) => {
  try {
    const { page, limit, skip, sort } = buildQueryOptions(req.query);

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-razorpaySignature -__v')
        .populate('items.product', 'name images slug'),
      Order.countDocuments({ user: req.user._id }),
    ]);

    return paginatedResponse(res, { data: orders, total, page, limit, message: 'Orders fetched.' });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get single order
// ── @route  GET /api/orders/:id
// ── @access Private
const getOrder = async (req, res, next) => {
  try {
    const query = {
      _id: req.params.id,
      // Admins can view any order; users only their own
      ...(req.user.role !== 'admin' && { user: req.user._id }),
    };

    const order = await Order.findOne(query)
      .select('-razorpaySignature')
      .populate('user', 'name email')
      .populate('items.product', 'name images slug');

    if (!order) return next(new ApiError('Order not found.', 404));
    return successResponse(res, 200, 'Order fetched.', { order });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Cancel order (user)
// ── @route  PATCH /api/orders/:id/cancel
// ── @access Private
const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return next(new ApiError('Order not found.', 404));

    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      return next(new ApiError(`Cannot cancel an order with status "${order.status}".`, 400));
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = req.body.reason || 'Cancelled by customer.';
    order.statusHistory.push({
      status: 'cancelled',
      note: order.cancellationReason,
      updatedBy: req.user._id,
    });

    // Restore stock
    for (const item of order.items) {
      if (item.size) {
        await Product.findOneAndUpdate(
          { _id: item.product, 'sizes.size': item.size },
          { $inc: { 'sizes.$.stock': item.quantity } }
        );
      }
    }

    // Mark payment as refunded if it was paid
    if (order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
    }

    await order.save();
    return successResponse(res, 200, 'Order cancelled.', { order });
  } catch (error) {
    next(error);
  }
};

// ── ADMIN CONTROLLERS ──────────────────────────────────────────────────────────

// ── @desc   Get all orders (Admin)
// ── @route  GET /api/admin/orders
// ── @access Admin
const getAllOrders = async (req, res, next) => {
  try {
    const { page, limit, skip, sort } = buildQueryOptions(req.query);

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-razorpaySignature -__v')
        .populate('user', 'name email'),
      Order.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: orders, total, page, limit, message: 'All orders fetched.' });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Update order status (Admin)
// ── @route  PATCH /api/admin/orders/:id/status
// ── @access Admin
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note, trackingNumber } = req.body;

    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
      refunded: [],
    };

    const order = await Order.findById(req.params.id);
    if (!order) return next(new ApiError('Order not found.', 404));

    if (!validTransitions[order.status]?.includes(status)) {
      return next(
        new ApiError(
          `Cannot transition from "${order.status}" to "${status}".`,
          400
        )
      );
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (status === 'delivered') order.deliveredAt = new Date();
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      order.cancellationReason = note || 'Cancelled by admin.';
      // Restore stock
      for (const item of order.items) {
        if (item.size) {
          await Product.findOneAndUpdate(
            { _id: item.product, 'sizes.size': item.size },
            { $inc: { 'sizes.$.stock': item.quantity } }
          );
        }
      }
    }

    order.statusHistory.push({
      status,
      note: note || `Status updated to ${status} by admin.`,
      updatedBy: req.user._id,
    });

    await order.save();
    return successResponse(res, 200, 'Order status updated.', { order });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Admin dashboard stats
// ── @route  GET /api/admin/stats
// ── @access Admin
const getAdminStats = async (req, res, next) => {
  try {
    const User = require('../models/User');

    const [
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalUsers,
      totalProducts,
      recentOrders,
      revenueByMonth,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'processing'] } }),
      User.countDocuments({ role: 'user' }),
      Product.countDocuments({ isActive: true }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name email')
        .select('orderNumber total status paymentMethod createdAt'),
      Order.aggregate([
        { $match: { paymentStatus: 'paid', createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return successResponse(res, 200, 'Admin stats fetched.', {
      stats: {
        totalRevenue: totalRevenue[0]?.total || 0,
        totalOrders,
        pendingOrders,
        totalUsers,
        totalProducts,
      },
      recentOrders,
      revenueByMonth,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getAdminStats,
};
