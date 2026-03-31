const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorMiddleware');
const {
  paginatedResponse,
  buildQueryOptions,
  buildProductFilter,
  successResponse,
} = require('../utils/apiHelpers');

// ── @desc   Get all products (public — costPrice excluded) ─────────────────────
// ── @route  GET /api/products
const getProducts = async (req, res, next) => {
  try {
    const { page, limit, skip, sort } = buildQueryOptions(req.query);
    const filter = buildProductFilter(req.query);

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).select('-__v'),
      Product.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: products, total, page, limit, message: 'Products fetched.' });
  } catch (error) { next(error); }
};

// ── @desc   Get single product (public — costPrice excluded) ───────────────────
// ── @route  GET /api/products/:identifier
const getProduct = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const isId  = identifier.match(/^[0-9a-fA-F]{24}$/);
    const query = isId ? { _id: identifier } : { slug: identifier };

    const product = await Product.findOne({ ...query, isActive: true });
    if (!product) return next(new ApiError('Product not found.', 404));
    return successResponse(res, 200, 'Product fetched.', { product });
  } catch (error) { next(error); }
};

// ── @desc   Get featured products (public) ─────────────────────────────────────
// ── @route  GET /api/products/featured
const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .sort({ createdAt: -1 }).limit(8).select('-__v');
    return successResponse(res, 200, 'Featured products fetched.', { products });
  } catch (error) { next(error); }
};

// ── @desc   Get categories with counts (public) ────────────────────────────────
// ── @route  GET /api/products/categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return successResponse(res, 200, 'Categories fetched.', { categories });
  } catch (error) { next(error); }
};

// ── @desc   Admin: Get all products INCLUDING costPrice ────────────────────────
// ── @route  GET /api/admin/products
const getAdminProducts = async (req, res, next) => {
  try {
    const { page, limit, skip, sort } = buildQueryOptions(req.query);

    const filter = {};
    if (req.query.search) filter.$text = { $search: req.query.search };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('+costPrice')   // explicitly include the hidden field
        .sort(sort).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: products, total, page, limit, message: 'Admin products fetched.' });
  } catch (error) { next(error); }
};

// ── @desc   Admin: Get single product with costPrice ──────────────────────────
// ── @route  GET /api/admin/products/:id
const getAdminProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select('+costPrice');
    if (!product) return next(new ApiError('Product not found.', 404));
    return successResponse(res, 200, 'Product fetched.', { product });
  } catch (error) { next(error); }
};

// ── @desc   Admin: Create product ─────────────────────────────────────────────
// ── @route  POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    // Re-fetch with costPrice to return to admin
    const full = await Product.findById(product._id).select('+costPrice');
    return successResponse(res, 201, 'Product created successfully.', { product: full });
  } catch (error) { next(error); }
};

// ── @desc   Admin: Update product ─────────────────────────────────────────────
// ── @route  PUT /api/products/:id
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, req.body,
      { new: true, runValidators: true }
    ).select('+costPrice');
    if (!product) return next(new ApiError('Product not found.', 404));
    return successResponse(res, 200, 'Product updated.', { product });
  } catch (error) { next(error); }
};

// ── @desc   Admin: Soft delete ────────────────────────────────────────────────
// ── @route  DELETE /api/products/:id
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, { isActive: false }, { new: true }
    );
    if (!product) return next(new ApiError('Product not found.', 404));
    return successResponse(res, 200, 'Product deleted.');
  } catch (error) { next(error); }
};

// ── @desc   Admin: Update stock ───────────────────────────────────────────────
// ── @route  PATCH /api/products/:id/stock
const updateStock = async (req, res, next) => {
  try {
    const { size, stock } = req.body;
    if (!size || stock === undefined) {
      return next(new ApiError('Size and stock quantity are required.', 400));
    }
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, 'sizes.size': size },
      { $set: { 'sizes.$.stock': stock } },
      { new: true, runValidators: true }
    );
    if (!product) return next(new ApiError('Product or size not found.', 404));
    return successResponse(res, 200, 'Stock updated.', { product });
  } catch (error) { next(error); }
};

module.exports = {
  getProducts, getProduct, getFeaturedProducts, getCategories,
  getAdminProducts, getAdminProduct,
  createProduct, updateProduct, deleteProduct, updateStock,
};