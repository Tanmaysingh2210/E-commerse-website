const express = require('express');
const router = express.Router();

const {
    createOrder,
    getMyOrders,
    getOrder,
    cancelOrder,
} = require('../controllers/orderController');

const { protect } = require('../middleware/authMiddleware');
const { orderValidator, paginationValidator } = require('../middleware/validators');

router.use(protect);

router.post('/', orderValidator, createOrder);
router.get('/my-orders', paginationValidator, getMyOrders);
router.get('/:id', getOrder);
router.patch('/:id/cancel', cancelOrder);

module.exports = router;