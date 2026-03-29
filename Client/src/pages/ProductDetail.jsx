import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Heart, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { StarDisplay, StarInput } from '../components/common/StarRating';
import Spinner from '../components/common/Spinner';
import { productAPI } from '../api/products';
import { reviewAPI } from '../api/index';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatPrice, formatDate, primaryImage } from '../utils/helpers';
import styles from './ProductDetail.module.css';

export default function ProductDetail() {
  const { slug }        = useParams();
  const { addToCart }   = useCart();
  const { user }        = useAuth();

  const [product,    setProduct]    = useState(null);
  const [reviews,    setReviews]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeImg,  setActiveImg]  = useState(0);
  const [selSize,    setSelSize]    = useState('');
  const [quantity,   setQuantity]   = useState(1);
  const [adding,     setAdding]     = useState(false);

  // Review form
  const [rating,     setRating]     = useState(0);
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    productAPI.getOne(slug)
      .then(({ data }) => {
        setProduct(data.product);
        return reviewAPI.getForProduct(data.product._id, { limit: 10 });
      })
      .then(({ data }) => setReviews(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Spinner center />;
  if (!product) return (
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <AlertCircle size={48} />
      <h3>Product not found</h3>
      <Link to="/products" className="btn btn-outline">Back to Products</Link>
    </div>
  );

  const price       = product.discountedPrice ?? product.price;
  const hasDiscount = product.discountedPrice && product.discountedPrice < product.price;
  const selSizeObj  = product.sizes?.find((s) => s.size === selSize);
  const maxQty      = selSizeObj?.stock ?? 0;
  const outOfStock  = product.sizes?.every((s) => s.stock === 0);

  const handleAddToCart = async () => {
    if (!user) { toast.error('Please login to add items to cart.'); return; }
    if (product.sizes?.length > 0 && !selSize) { toast.error('Please select a size.'); return; }
    setAdding(true);
    try {
      await addToCart(product._id, quantity, selSize || undefined);
    } finally { setAdding(false); }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { toast.error('Please select a rating.'); return; }
    setSubmitting(true);
    try {
      const { data } = await reviewAPI.create(product._id, { rating, comment });
      setReviews((prev) => [data.review, ...prev]);
      setRating(0); setComment('');
      toast.success('Review submitted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="section">
      <div className="container">
        <Link to="/products" className={styles.back}>
          <ChevronLeft size={16} /> Back to Products
        </Link>

        {/* ── Product main ── */}
        <div className={styles.productGrid}>
          {/* Images */}
          <div className={styles.gallery}>
            <div className={styles.mainImg}>
              <img
                src={product.images?.[activeImg]?.url || 'https://placehold.co/600x750?text=No+Image'}
                alt={product.name}
              />
              {hasDiscount && (
                <span className={styles.discBadge}>
                  -{Math.round(((product.price - product.discountedPrice) / product.price) * 100)}%
                </span>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className={styles.thumbs}>
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className={styles.info}>
            {product.brand && <p className={styles.brand}>{product.brand}</p>}
            <h1 className={styles.name}>{product.name}</h1>

            {product.reviewCount > 0 && (
              <div style={{ marginTop: '.5rem' }}>
                <StarDisplay rating={product.averageRating} count={product.reviewCount} />
              </div>
            )}

            {/* Price */}
            <div className={styles.priceRow}>
              <span className={styles.price}>{formatPrice(price)}</span>
              {hasDiscount && <span className={styles.origPrice}>{formatPrice(product.price)}</span>}
            </div>

            <p className={styles.desc}>{product.description}</p>

            {/* Sizes */}
            {product.sizes?.length > 0 && (
              <div className={styles.sizeSection}>
                <p className={styles.sizeLabel}>
                  Size {selSize && <strong>— {selSize}</strong>}
                </p>
                <div className={styles.sizes}>
                  {product.sizes.map(({ size, stock }) => (
                    <button
                      key={size}
                      onClick={() => { setSelSize(size); setQuantity(1); }}
                      disabled={stock === 0}
                      className={`${styles.sizeBtn} ${selSize === size ? styles.sizeBtnActive : ''} ${stock === 0 ? styles.sizeBtnOut : ''}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {selSizeObj && (
                  <p className={styles.stockNote}>
                    {selSizeObj.stock > 5
                      ? <><CheckCircle size={13} style={{ color: 'var(--success)' }} /> In Stock</>
                      : selSizeObj.stock > 0
                        ? <><AlertCircle size={13} style={{ color: 'var(--warning)' }} /> Only {selSizeObj.stock} left</>
                        : 'Out of stock'}
                  </p>
                )}
              </div>
            )}

            {/* Quantity */}
            <div className={styles.qtyRow}>
              <span className={styles.sizeLabel}>Quantity</span>
              <div className={styles.qty}>
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1}>−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(maxQty || 10, q + 1))} disabled={quantity >= (maxQty || 10)}>+</button>
              </div>
            </div>

            {/* CTA */}
            <div className={styles.actions}>
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={handleAddToCart}
                disabled={adding || outOfStock}
              >
                <ShoppingBag size={18} />
                {outOfStock ? 'Out of Stock' : adding ? 'Adding…' : 'Add to Cart'}
              </button>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className={styles.tags}>
                {product.tags.map((t) => (
                  <span key={t} className={styles.tag}>#{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Reviews ── */}
        <div className={styles.reviewsSection}>
          <h2 className={styles.reviewsTitle}>
            Reviews {product.reviewCount > 0 && `(${product.reviewCount})`}
          </h2>

          {/* Write review */}
          {user ? (
            <form className={styles.reviewForm} onSubmit={handleReviewSubmit}>
              <h3>Write a Review</h3>
              <StarInput value={rating} onChange={setRating} />
              <textarea
                className="form-input"
                rows={3}
                placeholder="Share your experience with this product…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                maxLength={500}
              />
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          ) : (
            <p className={styles.loginPrompt}>
              <Link to="/login">Login</Link> to write a review.
            </p>
          )}

          {/* Review list */}
          {reviews.length === 0 ? (
            <p className={styles.noReviews}>No reviews yet. Be the first!</p>
          ) : (
            <div className={styles.reviewList}>
              {reviews.map((r) => (
                <div key={r._id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewUser}>
                      <div className={styles.reviewAvatar}>{r.user?.name?.[0]?.toUpperCase()}</div>
                      <div>
                        <p className={styles.reviewName}>{r.user?.name}</p>
                        <p className={styles.reviewDate}>{formatDate(r.createdAt)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <StarDisplay rating={r.rating} size={14} />
                      {r.isVerifiedPurchase && (
                        <span className="badge badge-success">Verified</span>
                      )}
                    </div>
                  </div>
                  {r.title && <p className={styles.reviewTitle}>{r.title}</p>}
                  <p className={styles.reviewComment}>{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}