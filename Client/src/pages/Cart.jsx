import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, Tag, X, ChevronRight } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import { useCart } from '../context/CartContext';
import { formatPrice, primaryImage } from '../utils/helpers';
import styles from './Cart.module.css';

const SHIPPING_THRESHOLD = 999;
const SHIPPING_CHARGE    = 99;

export default function Cart() {
  const { cart, cartLoading, updateItem, removeItem, subtotal, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [updatingId,   setUpdatingId]   = useState(null);

  if (cartLoading) return <Spinner center />;

  const items    = cart?.items || [];
  const discount = cart?.appliedCoupon?.discountAmount || 0;
  const shipping  = subtotal >= SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_CHARGE;
  const total     = Math.max(0, subtotal - discount + shipping);

  const handleQty = async (itemId, qty) => {
    setUpdatingId(itemId);
    await updateItem(itemId, qty).catch(() => {});
    setUpdatingId(null);
  };

  const handleCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try { await applyCoupon(couponCode.trim()); setCouponCode(''); }
    catch {}
    finally { setCouponLoading(false); }
  };

  if (items.length === 0) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty-state">
            <ShoppingBag size={64} />
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added anything yet.</p>
            <Link to="/products" className="btn btn-primary">Start Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">
        <div className="page-header" style={{ paddingTop: 0 }}>
          <h1 className="page-title">Shopping Cart</h1>
          <p className="page-subtitle">{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>

        <div className={styles.layout}>
          {/* ── Items ── */}
          <div className={styles.items}>
            {items.map((item) => {
              const product = item.product;
              const img     = typeof product === 'object'
                ? primaryImage(product?.images)
                : 'https://placehold.co/120x150?text=?';
              const name    = typeof product === 'object' ? product?.name : 'Product';
              const slug    = typeof product === 'object' ? product?.slug : '#';

              return (
                <div key={item._id} className={styles.item}>
                  <Link to={`/products/${slug}`}>
                    <img src={img} alt={name} className={styles.itemImg}
                      onError={(e) => { e.target.src = 'https://placehold.co/120x150?text=?'; }}
                    />
                  </Link>
                  <div className={styles.itemInfo}>
                    <Link to={`/products/${slug}`} className={styles.itemName}>{name}</Link>
                    {item.size  && <p className={styles.itemMeta}>Size: <strong>{item.size}</strong></p>}
                    {item.color && <p className={styles.itemMeta}>Color: <strong>{item.color}</strong></p>}
                    <p className={styles.itemPrice}>{formatPrice(item.price)}</p>
                  </div>
                  <div className={styles.itemActions}>
                    <div className={styles.qty}>
                      <button disabled={item.quantity <= 1 || updatingId === item._id} onClick={() => handleQty(item._id, item.quantity - 1)}>−</button>
                      <span>{updatingId === item._id ? '…' : item.quantity}</span>
                      <button disabled={item.quantity >= 10 || updatingId === item._id} onClick={() => handleQty(item._id, item.quantity + 1)}>+</button>
                    </div>
                    <p className={styles.lineTotal}>{formatPrice(item.price * item.quantity)}</p>
                    <button className={styles.removeBtn} onClick={() => removeItem(item._id)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Summary ── */}
          <div className={styles.summary}>
            <h3 className={styles.summaryTitle}>Order Summary</h3>

            {/* Coupon */}
            {cart?.appliedCoupon ? (
              <div className={styles.couponApplied}>
                <div>
                  <Tag size={14} />
                  <span><strong>{cart.appliedCoupon.code}</strong> applied</span>
                </div>
                <button onClick={removeCoupon} title="Remove coupon"><X size={15} /></button>
              </div>
            ) : (
              <form onSubmit={handleCoupon} className={styles.couponForm}>
                <input
                  className="form-input"
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <button className="btn btn-outline btn-sm" type="submit" disabled={couponLoading}>
                  {couponLoading ? '…' : 'Apply'}
                </button>
              </form>
            )}

            <div className="divider" />

            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className={`${styles.summaryRow} ${styles.discount}`}>
                  <span>Discount</span>
                  <span>−{formatPrice(discount)}</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span>Shipping</span>
                <span>{shipping === 0 ? <span style={{ color: 'var(--success)' }}>Free</span> : formatPrice(shipping)}</span>
              </div>
            </div>

            {shipping > 0 && (
              <p className={styles.freeShippingNote}>
                Add {formatPrice(SHIPPING_THRESHOLD - subtotal)} more for free shipping
              </p>
            )}

            <div className="divider" />

            <div className={styles.totalRow}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>

            <Link to="/checkout" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '1.25rem' }}>
              Proceed to Checkout <ChevronRight size={16} />
            </Link>
            <Link to="/products" className="btn btn-ghost btn-full btn-sm" style={{ marginTop: '.5rem' }}>
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}