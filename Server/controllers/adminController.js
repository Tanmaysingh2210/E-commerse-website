const User = require('../models/User');
const { ApiError } = require('../middleware/errorMiddleware');
const { paginatedResponse, buildQueryOptions, successResponse } = require('../utils/apiHelpers');

// ── @desc   Get all users (Admin)
// ── @route  GET /api/admin/users
// ── @access Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip, sort } = buildQueryOptions(req.query);
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit).select('-password -refreshToken'),
      User.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: users, total, page, limit });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Get single user (Admin)
// ── @route  GET /api/admin/users/:id
// ── @access Admin
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');
    if (!user) return next(new ApiError('User not found.', 404));
    return successResponse(res, 200, 'User fetched.', { user });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Activate/Deactivate user (Admin)
// ── @route  PATCH /api/admin/users/:id/status
// ── @access Admin
const toggleUserStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return next(new ApiError('Cannot deactivate your own account.', 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) return next(new ApiError('User not found.', 404));

    user.isActive = !user.isActive;
    // Invalidate refresh token to force logout
    if (!user.isActive) user.refreshToken = null;
    await user.save();

    return successResponse(res, 200, `User ${user.isActive ? 'activated' : 'deactivated'}.`, {
      user: { _id: user._id, isActive: user.isActive },
    });
  } catch (error) {
    next(error);
  }
};

// ── @desc   Change user role (Admin)
// ── @route  PATCH /api/admin/users/:id/role
// ── @access Admin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return next(new ApiError('Invalid role.', 400));
    }
    if (req.params.id === req.user._id.toString()) {
      return next(new ApiError('Cannot change your own role.', 400));
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) return next(new ApiError('User not found.', 404));
    return successResponse(res, 200, 'User role updated.', { user });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, getUser, toggleUserStatus, updateUserRole };
