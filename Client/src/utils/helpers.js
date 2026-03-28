// ── Format currency (INR) ──────────────────────────────────────────────────────
export const formatPrice = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

// ── Format date ────────────────────────────────────────────────────────────────
export const formatDate = (date, opts = {}) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', ...opts,
  });

// ── Order status badge variant ─────────────────────────────────────────────────
export const statusVariant = (status) => ({
  pending:    'badge-warning',
  confirmed:  'badge-info',
  processing: 'badge-info',
  shipped:    'badge-info',
  delivered:  'badge-success',
  cancelled:  'badge-danger',
  refunded:   'badge-neutral',
}[status] || 'badge-neutral');

// ── Payment status variant ─────────────────────────────────────────────────────
export const paymentVariant = (status) => ({
  paid:     'badge-success',
  pending:  'badge-warning',
  failed:   'badge-danger',
  refunded: 'badge-neutral',
}[status] || 'badge-neutral');

// ── Truncate text ──────────────────────────────────────────────────────────────
export const truncate = (str, len = 80) =>
  str?.length > len ? str.slice(0, len) + '…' : str;

// ── Get primary image ──────────────────────────────────────────────────────────
export const primaryImage = (images, fallback = '/placeholder.jpg') =>
  images?.find((i) => i.isPrimary)?.url || images?.[0]?.url || fallback;

// ── Razorpay loader ────────────────────────────────────────────────────────────
export const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ── Debounce ───────────────────────────────────────────────────────────────────
export const debounce = (fn, ms = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};