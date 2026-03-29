import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, RefreshCw, ShieldCheck } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import Spinner from '../components/common/Spinner';
import { productAPI } from '../api/products';
import styles from './Home.module.css';

const CATEGORIES = [
  { key: 'men', label: 'Men', img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&q=80' },
  { key: 'women', label: 'Women', img: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600&q=80' },
  { key: 'kids', label: 'Kids', img: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&q=80' },
  { key: 'footwear', label: 'Footwear', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
];

const PERKS = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders above ₹199' },
  { icon: RefreshCw, title: 'Easy Returns', desc: '7-day hassle-free returns' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'Razorpay encrypted checkout' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productAPI.getFeatured()
      .then(({ data }) => setFeatured(data.products))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <span className={styles.heroPill}>New Season Arrivals</span>
            <h1 className={styles.heroTitle}>
              Premium Fashion,<br />
              <span className={styles.heroAccent}>Resold Right.</span>
            </h1>
            <p className={styles.heroSub}>
              Curated pre-loved clothing from top brands. Up to 70% off retail prices.
            </p>
            <div className={styles.heroActions}>
              <Link to="/products" className="btn btn-primary btn-lg">
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link to="/products?featured=true" className="btn btn-outline btn-lg">
                View Featured
              </Link>
            </div>
          </div>
          <div className={styles.heroImg}>
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=85"
              alt="Fashion hero"
            />
          </div>
        </div>
      </section>

      {/* ── Perks bar ── */}
      <section className={styles.perks}>
        <div className={`container ${styles.perksGrid}`}>
          {PERKS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={styles.perk}>
              <Icon size={22} strokeWidth={1.5} />
              <div>
                <p className={styles.perkTitle}>{title}</p>
                <p className={styles.perkDesc}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="section">
        <div className="container">
          <h2 className={styles.sectionTitle}>Shop by Category</h2>
          <div className={styles.categoryGrid}>
            {CATEGORIES.map(({ key, label, img }) => (
              <Link key={key} to={`/products?category=${key}`} className={styles.categoryCard}>
                <img src={img} alt={label} loading="lazy" />
                <div className={styles.categoryOverlay}>
                  <span>{label}</span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="section" style={{ background: 'var(--surface)' }}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Featured Picks</h2>
            <Link to="/products?featured=true" className={styles.seeAll}>
              See all <ArrowRight size={15} />
            </Link>
          </div>

          {loading ? (
            <Spinner center />
          ) : featured.length === 0 ? (
            <div className="empty-state">
              <p>No featured products yet.</p>
            </div>
          ) : (
            <div className="product-grid">
              {featured.slice(0, 8).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={styles.ctaBanner}>
        <div className="container">
          <h2>Got clothes you no longer wear?</h2>
          <p>Partner with us and earn from your wardrobe. We handle everything.</p>
          <a href="mailto:sell@drip.store" className="btn btn-primary btn-lg">
            Sell with DRIP
          </a>
        </div>
      </section>
    </div>
  );
}