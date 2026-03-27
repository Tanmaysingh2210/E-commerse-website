const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]{3,20}$/, 'Coupon code must be 3-20 alphanumeric characters'],
    },
    description: {
      type: String,
      maxlength: 200,
    },
    discountType: {
      type: String,
      enum: ['percent', 'flat'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [0, 'Discount value cannot be negative'],
    },
    // ── Constraints ────────────────────────────────────────────────────────────
    maxDiscountAmount: {
      type: Number,  // Cap for percentage discounts
      default: null,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    // ── Usage ──────────────────────────────────────────────────────────────────
    usageLimit: {
      type: Number,
      default: null,  // null = unlimited
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // ── Validity ───────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // ── Targeting ─────────────────────────────────────────────────────────────
    applicableCategories: [{ type: String }],  // Empty = all categories
    isFirstOrderOnly: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, expiresAt: 1 });

// ── Instance method: Validate coupon for a user + order ────────────────────────
couponSchema.methods.isValid = function (userId, orderTotal) {
  const now = new Date();

  if (!this.isActive) return { valid: false, message: 'Coupon is inactive.' };
  if (this.expiresAt < now) return { valid: false, message: 'Coupon has expired.' };
  if (this.usageLimit !== null && this.usageCount >= this.usageLimit)
    return { valid: false, message: 'Coupon usage limit reached.' };
  if (orderTotal < this.minOrderAmount)
    return {
      valid: false,
      message: `Minimum order amount of ₹${this.minOrderAmount} required.`,
    };

  const alreadyUsed = this.usedBy.some((id) => id.toString() === userId.toString());
  if (alreadyUsed) return { valid: false, message: 'You have already used this coupon.' };

  return { valid: true };
};

// ── Instance method: Calculate discount amount ─────────────────────────────────
couponSchema.methods.calculateDiscount = function (orderTotal) {
  let discount = 0;
  if (this.discountType === 'percent') {
    discount = (orderTotal * this.discountValue) / 100;
    if (this.maxDiscountAmount) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else {
    discount = this.discountValue;
  }
  return Math.min(discount, orderTotal);  // Can't discount more than total
};

const Coupon = mongoose.model('Coupon', couponSchema);
module.exports = Coupon;