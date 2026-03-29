const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'], max: [10, 'Cannot add more than 10 of the same item'] },
  size:     { type: String },
  color:    { type: String },
  price:    { type: Number, required: true },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,   // unique:true handles the index — no schema.index() needed
    },
    items: [cartItemSchema],
    appliedCoupon: {
      code:           String,
      discountAmount: Number,
      discountType:   String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── NO schema.index({ user:1 }) — unique:true above already creates it ─────────

cartSchema.virtual('subtotal').get(function () {
  return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;