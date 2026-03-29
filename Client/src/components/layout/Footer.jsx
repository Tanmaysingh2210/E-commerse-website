import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <span className={styles.logo}>DRIP</span>
          <p className={styles.tagline}>Premium clothing resale.<br />Curated. Affordable. Sustainable.</p>
        </div>

        <div className={styles.links}>
          <div className={styles.col}>
            <h4>Shop</h4>
            <Link to="/products">All Products</Link>
            <Link to="/products?category=men">Men</Link>
            <Link to="/products?category=women">Women</Link>
            <Link to="/products?category=kids">Kids</Link>
          </div>
          <div className={styles.col}>
            <h4>Account</h4>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/profile">Profile</Link>
          </div>
          <div className={styles.col}>
            <h4>Info</h4>
            <a href="#">About Us</a>
            <a href="#">Contact</a>
            <a href="#">Returns Policy</a>
            <a href="#">Privacy Policy</a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <div className="container">
          <p>© {new Date().getFullYear()} DRIP. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}