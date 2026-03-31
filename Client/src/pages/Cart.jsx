import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, Tag, X, ChevronRight, Plus, Minus, ArrowRight, Truck, Shield, RefreshCw } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import { useCart } from '../context/CartContext';
import { formatPrice, primaryImage } from '../utils/helpers';
import styles from './Cart.module.css';

const SHIPPING_THRESHOLD = 999;
const SHIPPING_CHARGE    = 99;

export default function Cart() {
  const { cart, cartLoading, updateItem, removeItem, subtotal, applyCoupon, removeCoupon } = useCart();
  const [couponCode,    setCouponCode]    = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [updatingId,    setUpdatingId]    = useState(null);
  const [removingId,    setRemovingId]    = useState(null);

  if (cartLoading) return <Spinner center />;

  const items      = cart?.items || [];
  const discount   = cart?.appliedCoupon?.discountAmount || 0;
  const shipping   = subtotal >= SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_CHARGE;
  const total      = Math.max(0, subtotal - discount + shipping);
  const progressPct = Math.min((subtotal / SHIPPING_THRESHOLD) * 100, 100);
  const totalQty   = items.reduce((s, i) => s + i.quantity, 0);

  const handleQty = async (itemId, qty) => {
    setUpdatingId(itemId);
    await updateItem(itemId, qty).catch(() => {});
    setUpdatingId(null);
  };

  const handleRemove = async (itemId) => {
    setRemovingId(itemId);
    await removeItem(itemId).catch(() => {});
    setRemovingId(null);
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
      <div className={styles.emptyPage}>
        <div className={styles.emptyInner}>
          <div className={styles.emptyIcon}><ShoppingBag size={52} strokeWidth={1.2} /></div>
          <h2 className={styles.emptyTitle}>Your cart is empty</h2>
          <p className={styles.emptySub}>Looks like you haven't added anything yet.</p>
          <Link to="/products" className="btn btn-primary btn-lg">
            Browse Products <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="container">

        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>Shopping Cart</h1>
            <p className={styles.subtitle}>{totalQty} item{totalQty !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/products" className={styles.continueLink}>
            <ArrowRight size={14} /> Continue Shopping
          </Link>
        </div>

        {/* ── Free shipping progress bar ── */}
        <div className={styles.shippingBanner}>
          {shipping === 0 ? (
            <div className={styles.shippingUnlocked}>
              <Truck size={15} />
              <span>You've unlocked <strong>free shipping!</strong> 🎉</span>
            </div>
          ) : (
            <>
              <div className={styles.shippingLocked}>
                <Truck size={15} />
                <span>Add <strong>{formatPrice(SHIPPING_THRESHOLD - subtotal)}</strong> more to get free shipping</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: progressPct + '%' }} />
              </div>
            </>
          )}
        </div>

        {/* ── Main layout ── */}
        <div className={styles.layout}>

          {/* ── LEFT: Items ── */}
          <div className={styles.itemsCol}>
            <div className={styles.itemsCard}>
              {items.map((item, index) => {
                const product    = item.product;
                const img        = typeof product === 'object' ? primaryImage(product?.images) : '';
                const name       = typeof product === 'object' ? product?.name : 'Product';
                const slug       = typeof product === 'object' ? product?.slug : '#';
                const isRemoving = removingId === item._id;
                const isUpdating = updatingId === item._id;

                return (
                  <React.Fragment key={item._id}>
                    <div className={`${styles.item} ${isRemoving ? styles.removing : ''}`}>

                      {/* Product image */}
                      <Link to={`/products/${slug}`} className={styles.imgLink}>
                        <img
                          src={img || 'https://placehold.co/90x115?text=?'}
                          alt={name}
                          className={styles.img}
                          onError={(e) => { e.target.src = 'https://placehold.co/90x115?text=?'; }}
                        />
                      </Link>

                      {/* Product info */}
                      <div className={styles.itemContent}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemDetails}>
                            {product?.brand && <p className={styles.brand}>{product.brand}</p>}
                            <Link to={`/products/${slug}`} className={styles.name}>{name}</Link>
                            <div className={styles.tags}>
                              {item.size  && <span className={styles.tag}>Size: <b>{item.size}</b></span>}
                              {item.color && <span className={styles.tag}>Color: <b>{item.color}</b></span>}
                            </div>
                            <p className={styles.unitPrice}>{formatPrice(item.price)} / piece</p>
                          </div>
                          <button
                            className={styles.removeBtn}
                            onClick={() => handleRemove(item._id)}
                            disabled={isRemoving}
                            aria-label="Remove"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <div className={styles.itemFooter}>
                          <div className={styles.qtyWrap}>
                            <button
                              className={styles.qtyBtn}
                              onClick={() => handleQty(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || isUpdating}
                            >
                              <Minus size={12} />
                            </button>
                            <span className={styles.qty}>
                              {isUpdating ? <span className={styles.qtyLoading}>…</span> : item.quantity}
                            </span>
                            <button
                              className={styles.qtyBtn}
                              onClick={() => handleQty(item._id, item.quantity + 1)}
                              disabled={item.quantity >= 10 || isUpdating}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className={styles.lineTotal}>
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {index < items.length - 1 && <div className={styles.itemDivider} />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Trust row */}
            <div className={styles.trustRow}>
              <div className={styles.trustItem}><Shield size={13} /><span>Secure Payment</span></div>
              <div className={styles.trustItem}><RefreshCw size={13} /><span>7-Day Returns</span></div>
              <div className={styles.trustItem}><Truck size={13} /><span>Fast Delivery</span></div>
            </div>
          </div>

          {/* ── RIGHT: Summary ── */}
          <div className={styles.summaryCol}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Order Summary</h2>

              {/* Coupon */}
              {cart?.appliedCoupon ? (
                <div className={styles.couponApplied}>
                  <div className={styles.couponLeft}>
                    <div className={styles.couponDot}><Tag size={12} /></div>
                    <div>
                      <p className={styles.couponCode}>{cart.appliedCoupon.code}</p>
                      <p className={styles.couponSaving}>−{formatPrice(discount)} off</p>
                    </div>
                  </div>
                  <button className={styles.couponRemoveBtn} onClick={removeCoupon}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCoupon} className={styles.couponForm}>
                  <div className={styles.couponField}>
                    <Tag size={14} className={styles.couponFieldIcon} />
                    <input
                      className={styles.couponInput}
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    type="submit"
                    disabled={couponLoading || !couponCode.trim()}
                    style={{ flexShrink: 0 }}
                  >
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </form>
              )}

              <div className={styles.divider} />

              {/* Breakdown */}
              <div className={styles.rows}>
                <div className={styles.row}>
                  <span>Subtotal <span className={styles.rowMuted}>({totalQty} items)</span></span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className={`${styles.row} ${styles.green}`}>
                    <span>Coupon discount</span>
                    <span>−{formatPrice(discount)}</span>
                  </div>
                )}
                <div className={styles.row}>
                  <span>Shipping</span>
                  {shipping === 0
                    ? <span className={styles.green}>FREE</span>
                    : <span>{formatPrice(shipping)}</span>
                  }
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.totalRow}>
                <span>Total</span>
                <span className={styles.totalAmt}>{formatPrice(total)}</span>
              </div>

              {discount > 0 && (
                <div className={styles.savingsBadge}>
                  🎉 You save {formatPrice(discount)} on this order
                </div>
              )}

              <Link to="/checkout" className={`btn btn-primary btn-full ${styles.checkoutBtn}`}>
                Proceed to Checkout <ChevronRight size={16} />
              </Link>

              <p className={styles.secureText}>
                <Shield size={11} /> 256-bit SSL secured checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}