const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorMiddleware');
const { paginatedResponse, buildQueryOptions, buildProductFilter, successResponse } = require('../utils/apiHelpers');

// ── @desc   Get all products (with filters + pagination)
// ── @route  GET /api/products
// ── @access Public
const getProducts = async (req, res, next) => {
  try {
    const { page, limit, skip, sort } = buildQueryOptions(req.query);
    const filter = buildProductFilter(req.query);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Product.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: products, total, page, limit, message: 'Products fetched.' });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get single product by slug or ID
// ── @route  GET /api/products/:identifier
// ── @access Public
const getProduct = async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const isId = identifier.match(/^[0-9a-fA-F]{24}$/);
    const query = isId ? { _id: identifier } : { slug: identifier };

    const product = await Product.findOne({ ...query, isActive: true });
    if (!product) return next(new ApiError('Product not found.', 404));

    return successResponse(res, 200, 'Product fetched.', { product });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get featured products
// ── @route  GET /api/products/featured
// ── @access Public
const getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('-__v');

    return successResponse(res, 200, 'Featured products fetched.', { products });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get distinct categories with counts
// ── @route  GET /api/products/categories
// ── @access Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return successResponse(res, 200, 'Categories fetched.', { categories });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Create product (Admin)
// ── @route  POST /api/products
// ── @access Admin
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    return successResponse(res, 201, 'Product created successfully.', { product });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Update product (Admin)
// ── @route  PUT /api/products/:id
// ── @access Admin
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return next(new ApiError('Product not found.', 404));
    return successResponse(res, 200, 'Product updated.', { product });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Delete product (soft delete — Admin)
// ── @route  DELETE /api/products/:id
// ── @access Admin
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!product) return next(new ApiError('Product not found.', 404));
    return successResponse(res, 200, 'Product deleted (soft).');
  } catch (error) {
    next(error);
  }
};

// ── @desc   Update product stock for a specific size
// ── @route  PATCH /api/products/:id/stock
// ── @access Admin
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
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
};
