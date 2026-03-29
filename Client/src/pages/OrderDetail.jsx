import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MapPin, CreditCard, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';
import { orderAPI } from '../api/index';
import { formatPrice, formatDate, statusVariant, paymentVariant } from '../utils/helpers';
import styles from './OrderDetail.module.css';

export default function OrderDetail() {
  const { id }                = useParams();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    orderAPI.getOne(id)
      .then(({ data }) => setOrder(data.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const { data } = await orderAPI.cancel(id, 'Cancelled by customer.');
      setOrder(data.order);
      toast.success('Order cancelled successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order.');
    } finally { setCancelling(false); }
  };

  if (loading) return <Spinner center />;
  if (!order)  return <div className="empty-state"><p>Order not found.</p><Link to="/orders" className="btn btn-outline">Back to Orders</Link></div>;

  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 800 }}>
        <Link to="/orders" className={styles.back}><ChevronLeft size={16} /> Back to Orders</Link>

        <div className={styles.header}>
          <div>
            <h1 className="page-title" style={{ marginBottom: '.25rem' }}>Order #{order.orderNumber}</h1>
            <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{formatDate(order.createdAt, { weekday: 'long' })}</p>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <span className={`badge ${statusVariant(order.status)}`} style={{ fontSize: '.82rem', padding: '.3rem .8rem' }}>{order.status}</span>
            <span className={`badge ${paymentVariant(order.paymentStatus)}`} style={{ fontSize: '.82rem', padding: '.3rem .8rem' }}>{order.paymentStatus}</span>
          </div>
        </div>

        {/* Items */}
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3 className={styles.sectionTitle}><Package size={16} /> Items ({order.items.length})</h3>
          <div className={styles.items}>
            {order.items.map((item) => (
              <div key={item._id} className={styles.item}>
                <img src={item.image || 'https://placehold.co/70x88?text=?'} alt={item.name}
                  onError={(e) => { e.target.src='https://placehold.co/70x88?text=?'; }} />
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>{item.name}</p>
                  <p className={styles.itemMeta}>{[item.size && `Size: ${item.size}`, `Qty: ${item.quantity}`].filter(Boolean).join(' · ')}</p>
                  <p className={styles.itemPrice}>{formatPrice(item.price)} each</p>
                </div>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.twoCol}>
          {/* Shipping */}
          <div className="card">
            <h3 className={styles.sectionTitle}><MapPin size={16} /> Shipping Address</h3>
            <div className={styles.address}>
              <p><strong>{order.shippingAddress.fullName}</strong></p>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
              <p style={{ marginTop: '.5rem', color: 'var(--muted)' }}>{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="card">
            <h3 className={styles.sectionTitle}><CreditCard size={16} /> Payment Summary</h3>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
              {order.discount > 0 && <div className={`${styles.summaryRow} ${styles.green}`}><span>Discount{order.coupon?.code ? ` (${order.coupon.code})` : ''}</span><span>−{formatPrice(order.discount)}</span></div>}
              <div className={styles.summaryRow}><span>Shipping</span><span>{order.shippingCharge === 0 ? <span className={styles.green}>Free</span> : formatPrice(order.shippingCharge)}</span></div>
              <div className="divider" style={{ margin: '.5rem 0' }} />
              <div className={`${styles.summaryRow} ${styles.totalRow}`}><span>Total</span><strong>{formatPrice(order.total)}</strong></div>
              <div className={styles.summaryRow}><span>Payment Method</span><span>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span></div>
              {order.razorpayPaymentId && <div className={styles.summaryRow}><span>Payment ID</span><span style={{ fontSize: '.78rem', fontFamily: 'monospace' }}>{order.razorpayPaymentId}</span></div>}
            </div>
          </div>
        </div>

        {/* Status history */}
        {order.statusHistory?.length > 0 && (
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <h3 className={styles.sectionTitle}>Order Timeline</h3>
            <div className={styles.timeline}>
              {[...order.statusHistory].reverse().map((h, i) => (
                <div key={i} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div>
                    <p className={styles.timelineStatus}>{h.status.charAt(0).toUpperCase() + h.status.slice(1)}</p>
                    {h.note && <p className={styles.timelineNote}>{h.note}</p>}
                    <p className={styles.timelineDate}>{formatDate(h.timestamp, { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {canCancel && (
          <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
            <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}