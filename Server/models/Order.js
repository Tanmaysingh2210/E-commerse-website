const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:     { type: String, required: true },
  image:    { type: String },
  price:    { type: Number, required: true },
  size:     { type: String },
  color:    { type: String },
  quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
});

const shippingAddressSchema = new mongoose.Schema({
  fullName:   { type: String, required: true },
  phone:      { type: String, required: true },
  street:     { type: String, required: true },
  city:       { type: String, required: true },
  state:      { type: String, required: true },
  postalCode: { type: String, required: true },
  country:    { type: String, default: 'India' },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,   // unique:true handles the index — no schema.index() needed
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    shippingAddress: { type: shippingAddressSchema, required: true },

    subtotal:       { type: Number, required: true },
    shippingCharge: { type: Number, default: 0 },
    discount:       { type: Number, default: 0 },
    total:          { type: Number, required: true },

    coupon: { code: String, discountAmount: Number },

    paymentMethod: { type: String, enum: ['razorpay', 'cod'], required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String, select: false },

    status: {
      type: String,
      enum: ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'],
      default: 'pending',
    },
    statusHistory: [
      {
        status:    String,
        timestamp: { type: Date, default: Date.now },
        note:      String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    trackingNumber:     { type: String },
    deliveredAt:        { type: Date },
    cancelledAt:        { type: Date },
    cancellationReason: { type: String },
    paidAt:             { type: Date },
  },
  { timestamps: true }
);

// ── Indexes — orderNumber is handled by unique:true, NOT repeated here ─────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ razorpayOrderId: 1 });
// orderNumber index is handled by unique:true above

// ── Pre-save: Auto-generate order number ───────────────────────────────────────
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const prefix = `ORD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const random = Math.floor(10000 + Math.random() * 90000);
    this.orderNumber = `${prefix}${random}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;