/**
 * Standard success response
 */
const successResponse = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data,
  });
};

/**
 * Build paginated response with metadata
 */
const paginatedResponse = (res, { data, total, page, limit, message = 'Success' }) => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

/**
 * Build query options for Mongoose pagination + sorting
 */
const buildQueryOptions = (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = Math.min(parseInt(query.limit, 10) || 12, 50); // Max 50 per page
  const skip = (page - 1) * limit;

  let sort = {};
  if (query.sort) {
    const sortField = query.sort.startsWith('-') ? query.sort.slice(1) : query.sort;
    const sortOrder = query.sort.startsWith('-') ? -1 : 1;
    sort[sortField] = sortOrder;
  } else {
    sort = { createdAt: -1 };  // Default: newest first
  }

  return { page, limit, skip, sort };
};

/**
 * Build product filter from query params
 */
const buildProductFilter = (query) => {
  const filter = { isActive: true };

  if (query.category) filter.category = query.category;
  if (query.brand) filter.brand = new RegExp(query.brand, 'i');

  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = parseFloat(query.minPrice);
    if (query.maxPrice) filter.price.$lte = parseFloat(query.maxPrice);
  }

  if (query.rating) filter.averageRating = { $gte: parseFloat(query.rating) };
  if (query.featured === 'true') filter.isFeatured = true;

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return filter;
};

module.exports = {
  successResponse,
  paginatedResponse,
  buildQueryOptions,
  buildProductFilter,
};