

// require('dotenv').config();
// const express = require('express');
// const cookieParser = require('cookie-parser');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');

// const connectDB = require('./config/db');
// const { errorHandler, notFound } = require('./middleware/errorMiddleware');
// const logger = require('./utils/logger');

// const authRoutes    = require('./routes/authRoutes');
// const productRoutes = require('./routes/productRoutes');
// const cartRoutes    = require('./routes/cartRoutes');
// const orderRoutes   = require('./routes/orderRoutes');
// const reviewRoutes  = require('./routes/reviewRoutes');
// const couponRoutes  = require('./routes/couponRoutes');
// const adminRoutes   = require('./routes/adminRoutes');
// const paymentRoutes = require('./routes/paymentRoutes');

// connectDB();

// const app = express();

// app.use(helmet());

// const allowedOrigins = [
//   'https://drip-beryl.vercel.app',
//   process.env.CLIENT_URL,
// ].filter(Boolean);

// app.use(cors({
//   origin: (origin, callback) => {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) return callback(null, true);
//     callback(new Error(`CORS blocked: ${origin}`));
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

// app.use(express.json({ limit: '10kb' }));
// app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// app.use(cookieParser());


// const sanitizeBody = (obj) => {
//   if (!obj || typeof obj !== 'object') return;
//   for (const key of Object.keys(obj)) {
//     if (key.startsWith('$')) {
//       delete obj[key];
//     } else if (typeof obj[key] === 'object' && obj[key] !== null) {
//       sanitizeBody(obj[key]);
//     } else if (typeof obj[key] === 'string') {
//       obj[key] = obj[key].replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
//     }
//   }
// };

// app.use((req, res, next) => {
//   if (req.body) sanitizeBody(req.body);
//   next();
// });

// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

// app.get('/api/health', (req, res) => {
//   res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
// });

// app.use('/api/auth',     authRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/cart',     cartRoutes);
// app.use('/api/orders',   orderRoutes);
// app.use('/api/reviews',  reviewRoutes);
// app.use('/api/coupons',  couponRoutes);
// app.use('/api/payment',  paymentRoutes);
// app.use('/api/admin',    adminRoutes);

// app.use(notFound);
// app.use(errorHandler);

// const PORT = process.env.PORT || 5000;
// const server = app.listen(PORT, () => {
//   logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
// });

// process.on('unhandledRejection', (err) => {
//   logger.error(`Unhandled Rejection: ${err.message}`);
//   server.close(() => process.exit(1));
// });

// process.on('uncaughtException', (err) => {
//   logger.error(`Uncaught Exception: ${err.message}`);
//   process.exit(1);
// });

// module.exports = app;


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

const allowedOrigins = [
  'https://drip-beryl.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

// app.use(cors({
//   origin: function(origin, callback) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
//     return callback(new Error('CORS blocked: ' + origin));
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));


// const allowedOrigins = [
//   'https://drip-beryl.vercel.app',
// ];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin); // 👈 debug
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

const sanitizeBody = function(obj) {
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

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/api/health', function(req, res) {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
  logger.info('Server running in ' + process.env.NODE_ENV + ' mode on port ' + PORT);
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