require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
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

app.use(helmet());

// ── CORS — must be before any routes ──────────────────────────────────────────
const allowedOrigins = [
  'https://drip-beryl.vercel.app',   // your Vercel frontend
];

// Also allow any origin set via env var on Render
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (Postman, curl, mobile apps, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    logger.warn('CORS blocked origin: ' + origin);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,  
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

var sanitizeBody = function(obj) {
  if (!obj || typeof obj !== 'object') return;
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key.startsWith('$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeBody(obj[key]);
    } else if (typeof obj[key] === 'string') {
      obj[key] = obj[key].replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    }
  }
};

app.use(function(req, res, next) {
  if (req.body) sanitizeBody(req.body);
  next();
});

app.use(morgan('dev'));

app.get('/api/health', function(req, res) {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.options('*', cors());
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/reviews',  reviewRoutes);
app.use('/api/coupons',  couponRoutes);
app.use('/api/payment',  paymentRoutes);
app.use('/api/admin',    adminRoutes);


app.use(notFound);
app.use(errorHandler);


var PORT = process.env.PORT || 5000;
var server = app.listen(PORT, function() {
  logger.info('Server running on port ' + PORT);
  logger.info('Allowed origins: ' + allowedOrigins.join(', '));
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