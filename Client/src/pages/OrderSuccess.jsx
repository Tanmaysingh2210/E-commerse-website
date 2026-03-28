import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, Truck, ArrowRight } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import { orderAPI } from '../api/index';
import { formatPrice, formatDate } from '../utils/helpers';
import styles from './OrderSuccess.module.css';

export default function OrderSuccess() {
  const { id }            = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.getOne(id)
      .then(({ data }) => setOrder(data.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner center />;

  return (
    <div className="section">
      <div className="container">
        <div className={styles.card}>
          <div className={styles.icon}><CheckCircle size={52} /></div>
          <h1 className={styles.title}>Order Confirmed!</h1>
          <p className={styles.sub}>
            Thank you for your purchase. We'll send updates as your order progresses.
          </p>

          {order && (
            <>
              <div className={styles.orderMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Order Number</span>
                  <strong>{order.orderNumber}</strong>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Date</span>
                  <strong>{formatDate(order.createdAt)}</strong>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Payment</span>
                  <strong>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</strong>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Total</span>
                  <strong>{formatPrice(order.total)}</strong>
                </div>
              </div>

              {/* Status tracker */}
              <div className={styles.tracker}>
                {['confirmed', 'processing', 'shipped', 'delivered'].map((s, i) => {
                  const statusOrder = ['pending','confirmed','processing','shipped','delivered'];
                  const currentIdx  = statusOrder.indexOf(order.status);
                  const stepIdx     = statusOrder.indexOf(s);
                  const done        = currentIdx >= stepIdx;
                  return (
                    <React.Fragment key={s}>
                      <div className={`${styles.trackerStep} ${done ? styles.trackerDone : ''}`}>
                        <div className={styles.trackerDot} />
                        <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      </div>
                      {i < 3 && <div className={`${styles.trackerLine} ${done && currentIdx > stepIdx ? styles.trackerLineDone : ''}`} />}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Items */}
              <div className={styles.items}>
                {order.items.map((item) => (
                  <div key={item._id} className={styles.item}>
                    <img src={item.image || 'https://placehold.co/60x75?text=?'} alt={item.name}
                      onError={(e) => { e.target.src='https://placehold.co/60x75?text=?'; }} />
                    <div className={styles.itemInfo}>
                      <p>{item.name}</p>
                      {item.size && <p className={styles.itemMeta}>Size: {item.size}</p>}
                      <p className={styles.itemMeta}>Qty: {item.quantity}</p>
                    </div>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={styles.actions}>
            <Link to={`/orders/${id}`} className="btn btn-outline">
              <Package size={16} /> View Order Details
            </Link>
            <Link to="/products" className="btn btn-primary">
              Continue Shopping <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}