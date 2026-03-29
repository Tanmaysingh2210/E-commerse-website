import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import Pagination from '../components/common/Pagination';
import { orderAPI } from '../api/index';
import { formatPrice, formatDate, statusVariant, paymentVariant } from '../utils/helpers';
import styles from './Orders.module.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    orderAPI.getMyOrders({ page, limit: 8 })
      .then(({ data }) => { setOrders(data.data); setPagination(data.pagination); })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <Spinner center />;

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-header" style={{ paddingTop: 0 }}>
          <h1 className="page-title">My Orders</h1>
          <p className="page-subtitle">{pagination.total ?? orders.length} orders total</p>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <Package size={56} />
            <h3>No orders yet</h3>
            <p>Your order history will appear here once you make a purchase.</p>
            <Link to="/products" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {orders.map((order) => (
                <Link key={order._id} to={`/orders/${order._id}`} className={styles.orderCard}>
                  <div className={styles.orderTop}>
                    <div>
                      <p className={styles.orderNum}>#{order.orderNumber}</p>
                      <p className={styles.orderDate}>{formatDate(order.createdAt)}</p>
                    </div>
                    <div className={styles.badges}>
                      <span className={`badge ${statusVariant(order.status)}`}>
                        {order.status}
                      </span>
                      <span className={`badge ${paymentVariant(order.paymentStatus)}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Item previews */}
                  <div className={styles.itemPreviews}>
                    {order.items.slice(0, 3).map((item, i) => (
                      <img
                        key={i}
                        src={item.image || 'https://placehold.co/60x75?text=?'}
                        alt={item.name}
                        className={styles.previewImg}
                        onError={(e) => { e.target.src = 'https://placehold.co/60x75?text=?'; }}
                      />
                    ))}
                    {order.items.length > 3 && (
                      <div className={styles.previewMore}>+{order.items.length - 3}</div>
                    )}
                    <p className={styles.itemCount}>
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className={styles.orderBottom}>
                    <div>
                      <p className={styles.payMethod}>
                        {order.paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}
                      </p>
                    </div>
                    <div className={styles.totalWrap}>
                      <strong className={styles.total}>{formatPrice(order.total)}</strong>
                      <ChevronRight size={16} className={styles.arrow} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}