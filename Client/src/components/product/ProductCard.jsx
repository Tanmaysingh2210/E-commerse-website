import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart } from 'lucide-react';
import { StarDisplay } from '../common/StarRating';
import { formatPrice, primaryImage } from '../../utils/helpers';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import styles from './ProductCard.module.css';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user }      = useAuth();

  const image        = primaryImage(product.images);
  const price        = product.discountedPrice ?? product.price;
  const hasDiscount  = product.discountedPrice && product.discountedPrice < product.price;
  const discountPct  = hasDiscount ? Math.round(((product.price - product.discountedPrice) / product.price) * 100) : 0;
  const totalStock   = product.sizes?.reduce((s, i) => s + i.stock, 0) ?? 0;
  const isOutOfStock = totalStock === 0;

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!user) { window.location.href = '/login'; return; }
    if (isOutOfStock) return;
    // If product has one size, add directly; else navigate to PDP
    const singleSize = product.sizes?.length === 1 ? product.sizes[0].size : null;
    await addToCart(product._id, 1, singleSize);
  };

  return (
    <Link to={`/products/${product.slug}`} className={styles.card}>
      <div className={styles.imgWrap}>
        <img
          src={image}
          alt={product.name}
          className={styles.img}
          loading="lazy"
          onError={(e) => { e.target.src = 'https://placehold.co/400x500?text=No+Image'; }}
        />
        {hasDiscount && <span className={styles.discountBadge}>-{discountPct}%</span>}
        {isOutOfStock && <div className={styles.outOfStock}>Out of Stock</div>}
        <button
          className={styles.quickAdd}
          onClick={handleQuickAdd}
          disabled={isOutOfStock}
          title={product.sizes?.length > 1 ? 'Select size' : 'Add to cart'}
        >
          <ShoppingBag size={16} />
          {product.sizes?.length > 1 ? 'Select Size' : 'Add to Cart'}
        </button>
      </div>

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
  );
}