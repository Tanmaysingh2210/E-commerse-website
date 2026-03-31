import api from './axios';

// ── Cart ───────────────────────────────────────────────────────────────────────
export const cartAPI = {
  get:          ()           => api.get('/cart'),
  add:          (data)       => api.post('/cart/add', data),
  update:       (id, data)   => api.put('/cart/' + id, data),
  remove:       (id)         => api.delete('/cart/' + id),
  clear:        ()           => api.delete('/cart'),
  applyCoupon:  (code)       => api.post('/cart/coupon', { code }),
  removeCoupon: ()           => api.delete('/cart/coupon'),
};

// ── Orders ─────────────────────────────────────────────────────────────────────
export const orderAPI = {
  create:          (data)   => api.post('/orders', data),
  getUpiDiscount:  ()       => api.get('/orders/upi-discount'),
  getMyOrders:     (params) => api.get('/orders/my-orders', { params }),
  getOne:          (id)     => api.get('/orders/' + id),
  cancel:          (id, reason) => api.patch('/orders/' + id + '/cancel', { reason }),

  // Admin
  getAll:          (params) => api.get('/admin/orders', { params }),
  updateStatus:    (id, data)   => api.patch('/admin/orders/' + id + '/status', data),
};

// ── Payment ────────────────────────────────────────────────────────────────────
export const paymentAPI = {
  getKey:              ()     => api.get('/payment/key'),
  createRazorpayOrder: (id)   => api.post('/payment/create-order', { orderId: id }),
  verify:              (data) => api.post('/payment/verify', data),
  failed:              (data) => api.post('/payment/failed', data),
};

// ── Reviews ────────────────────────────────────────────────────────────────────
export const reviewAPI = {
  getForProduct: (productId, params) => api.get('/reviews/product/' + productId, { params }),
  create:        (productId, data)   => api.post('/reviews/product/' + productId, data),
  update:        (id, data)          => api.put('/reviews/' + id, data),
  delete:        (id)                => api.delete('/reviews/' + id),
  getMyReviews:  ()                  => api.get('/reviews/my-reviews'),
};

// ── Coupons ────────────────────────────────────────────────────────────────────
export const couponAPI = {
  validate: (code, orderTotal) => api.post('/coupons/validate', { code, orderTotal }),
  getAll:   (params) => api.get('/admin/coupons', { params }),
  create:   (data)   => api.post('/admin/coupons', data),
  update:   (id, d)  => api.put('/admin/coupons/' + id, d),
  delete:   (id)     => api.delete('/admin/coupons/' + id),
};

// ── Admin ──────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats:        ()        => api.get('/admin/stats'),
  getProducts:     (params)  => api.get('/admin/products', { params }),
  getProduct:      (id)      => api.get('/admin/products/' + id),
  getUsers:        (params)  => api.get('/admin/users', { params }),
  toggleUserStatus:(id)      => api.patch('/admin/users/' + id + '/status'),
  updateUserRole:  (id, role)=> api.patch('/admin/users/' + id + '/role', { role }),
};