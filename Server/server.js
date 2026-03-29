require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');

const authRoutes    = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes    = require('./routes/cartRoutes');
const orderRoutes   = require('./routes/orderRoutes');
const reviewRoutes  = require('./routes/reviewRoutes');
const couponRoutes  = require('./routes/couponRoutes');
const adminRoutes   = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

connectDB();

const app = express();

// ── CORS must be THE VERY FIRST middleware — before helmet, before everything ──
// We do it manually so we have full control and no dependency on the cors package
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://drip-beryl.vercel.app',
];

// Add env-based origin if set
if (process.env.CLIENT_URL && !ALLOWED_ORIGINS.includes(process.env.CLIENT_URL)) {
  ALLOWED_ORIGINS.push(process.env.CLIENT_URL);
}

app.use(function(req, res, next) {
  var origin = req.headers.origin;

  // Set CORS headers on EVERY response (including errors)
  if (origin && ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Vary', 'Origin');

  // Handle preflight — respond immediately with 200, no further processing
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// ── Security headers (after CORS so it doesn't interfere) ─────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ── NoSQL injection sanitizer ──────────────────────────────────────────────────
function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach(function(key) {
    if (key.startsWith('$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeBody(obj[key]);
    } else if (typeof obj[key] === 'string') {
      obj[key] = obj[key].replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    }
  });
}

app.use(function(req, res, next) {
  if (req.body) sanitizeBody(req.body);
  next();
});

// ── Logging ────────────────────────────────────────────────────────────────────
app.use(morgan('dev'));

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/api/health', function(req, res) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    allowedOrigins: ALLOWED_ORIGINS,
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/coupons',  couponRoutes);
app.use('/api/payment',  paymentRoutes);
app.use('/api/admin',    adminRoutes);

// ── 404 + error handler ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
var PORT = process.env.PORT || 5000;
var server = app.listen(PORT, function() {
  logger.info('Server running on port ' + PORT);
  logger.info('Allowed origins: ' + ALLOWED_ORIGINS.join(', '));
});

process.on('unhandledRejection', function(err) {
  logger.error('Unhandled Rejection: ' + err.message);
  server.close(function() { process.exit(1); });
});

process.on('uncaughtException', function(err) {
  logger.error('Uncaught Exception: ' + err.message);
  process.exit(1);
});

module.exports = app;
