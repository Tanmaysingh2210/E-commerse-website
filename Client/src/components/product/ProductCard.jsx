import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, X, Check } from 'lucide-react';
import { StarDisplay } from '../common/StarRating';
import { formatPrice, primaryImage } from '../../utils/helpers';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { addToCart }   = useCart();
  const { user }        = useAuth();
  const [showSizes, setShowSizes]   = useState(false);
  const [adding,    setAdding]      = useState(false);
  const [added,     setAdded]       = useState(false);
  const popupRef = useRef(null);

  const image        = primaryImage(product.images);
  const price        = product.discountedPrice ?? product.price;
  const hasDiscount  = product.discountedPrice && product.discountedPrice < product.price;
  const discountPct  = hasDiscount ? Math.round(((product.price - product.discountedPrice) / product.price) * 100) : 0;
  const totalStock   = product.sizes?.reduce((s, i) => s + i.stock, 0) ?? 0;
  const isOutOfStock = totalStock === 0;
  const hasSizes     = product.sizes && product.sizes.length > 1;

  // Close popup on outside click
  useEffect(() => {
    if (!showSizes) return;
    const handler = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowSizes(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSizes]);

  // Close popup on Escape
  useEffect(() => {
    if (!showSizes) return;
    const handler = (e) => { if (e.key === 'Escape') setShowSizes(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showSizes]);

  const handleCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user)        { window.location.href = '/login'; return; }
    if (isOutOfStock) return;

    // Single size — add directly, no popup needed
    if (!hasSizes) {
      const size = product.sizes?.[0]?.size || undefined;
      doAddToCart(size);
      return;
    }

    // Multiple sizes — show inline popup
    setShowSizes(true);
  };

  const doAddToCart = async (size) => {
    setAdding(true);
    setShowSizes(false);
    try {
      await addToCart(product._id, 1, size);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {}
    finally { setAdding(false); }
  };

  return (
    <div className={styles.cardWrap}>
      <Link to={`/products/${product.slug}`} className={styles.card}>

        {/* ── Image ── */}
        <div className={styles.imgWrap}>
          <img
            src={image}
            alt={product.name}
            className={styles.img}
            loading="lazy"
            onError={(e) => { e.target.src = 'https://placehold.co/400x500?text=No+Image'; }}
          />
          {hasDiscount  && <span className={styles.discountBadge}>-{discountPct}%</span>}
          {isOutOfStock && <div className={styles.outOfStock}>Out of Stock</div>}

          {/* Quick-add button */}
          {!isOutOfStock && (
            <button
              className={`${styles.quickAdd} ${added ? styles.quickAddDone : ''}`}
              onClick={handleCartClick}
              disabled={adding}
            >
              {added ? (
                <><Check size={15} /> Added!</>
              ) : adding ? (
                <><ShoppingBag size={15} /> Adding…</>
              ) : hasSizes ? (
                <><ShoppingBag size={15} /> Select Size</>
              ) : (
                <><ShoppingBag size={15} /> Add to Cart</>
              )}
            </button>
          )}
        </div>

        {/* ── Info ── */}
        <div className={styles.info}>
          {product.brand && <p className={styles.brand}>{product.brand}</p>}
          <h3 className={styles.name}>{product.name}</h3>
          {product.reviewCount > 0 && (
            <StarDisplay rating={product.averageRating} count={product.reviewCount} size={13} />
          )}
          <div className={styles.priceRow}>
            <span className={styles.price}>{formatPrice(price)}</span>
            {hasDiscount && (
              <span className={styles.originalPrice}>{formatPrice(product.price)}</span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Size Picker Popup ── */}
      {showSizes && (
        <div className={styles.sizePopup} ref={popupRef}>
          <div className={styles.sizePopupHeader}>
            <span className={styles.sizePopupTitle}>Select Size</span>
            <button className={styles.sizePopupClose} onClick={() => setShowSizes(false)}>
              <X size={14} />
            </button>
          </div>
          <div className={styles.sizeGrid}>
            {product.sizes.map(({ size, stock }) => (
              <button
                key={size}
                className={`${styles.sizeBtn} ${stock === 0 ? styles.sizeBtnOut : ''}`}
                disabled={stock === 0 || adding}
                onClick={(e) => { e.stopPropagation(); doAddToCart(size); }}
              >
                <span>{size}</span>
                {stock === 0 && <span className={styles.sizeOut}>Out</span>}
                {stock > 0 && stock <= 3 && <span className={styles.sizeLow}>{stock} left</span>}
              </button>
            ))}
          </div>
          <p className={styles.sizeHint}>
            Not sure? <Link to={`/products/${product.slug}`} onClick={() => setShowSizes(false)}>View size guide</Link>
          </p>
        </div>
      )}
    </div>
  );
}