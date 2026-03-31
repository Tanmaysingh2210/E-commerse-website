const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountedPrice: {
      type: Number,
      min: [0, 'Discounted price cannot be negative'],
      default: null,
    },
    // ── Admin-only: cost price (hidden from public API) ──────────────────────
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative'],
      default: null,
      select: false,   // Never returned in public queries — must explicitly request
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['men','women','kids','accessories','footwear','outerwear','activewear','formals','ethnic','others'],
    },
    brand:  { type: String, trim: true },
    images: [
      {
        url:       { type: String, required: true },
        alt:       { type: String, default: '' },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    sizes: [
      {
        size:  { type: String, required: true },
        stock: { type: Number, required: true, min: 0, default: 0 },
      },
    ],
    colors:    [{ name: String, hex: String }],
    tags:      [{ type: String, lowercase: true, trim: true }],
    isFeatured: { type: Boolean, default: false },
    isActive:   { type: Boolean, default: true },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: (val) => Math.round(val * 10) / 10,
    },
    reviewCount:     { type: Number, default: 0 },
    metaTitle:       { type: String },
    metaDescription: { type: String },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });

// ── Virtuals ───────────────────────────────────────────────────────────────────
productSchema.virtual('effectivePrice').get(function () {
  return this.discountedPrice !== null && this.discountedPrice < this.price
    ? this.discountedPrice : this.price;
});

productSchema.virtual('totalStock').get(function () {
  return this.sizes.reduce((total, s) => total + s.stock, 0);
});

productSchema.virtual('discountPercent').get(function () {
  if (this.discountedPrice && this.discountedPrice < this.price) {
    return Math.round(((this.price - this.discountedPrice) / this.price) * 100);
  }
  return 0;
});

// ── Virtual: profit margin (only meaningful when costPrice is selected) ────────
productSchema.virtual('profitMargin').get(function () {
  if (!this.costPrice) return null;
  const sellPrice = this.discountedPrice ?? this.price;
  return Math.round(((sellPrice - this.costPrice) / sellPrice) * 100);
});

// ── Pre-save: Auto-generate slug ───────────────────────────────────────────────
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() +
      '-' + this._id.toString().slice(-6);
  }
  next();
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;