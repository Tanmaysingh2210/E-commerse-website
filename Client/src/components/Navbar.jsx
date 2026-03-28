import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, ChevronDown, LogOut, Package, Settings, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { itemCount }             = useCart();
  const navigate                  = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu]     = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navLinkClass = ({ isActive }) =>
    `${styles.navLink} ${isActive ? styles.active : ''}`;

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>DRIP</Link>

        {/* Desktop nav */}
        <nav className={styles.nav}>
          <NavLink to="/products"               className={navLinkClass}>All Products</NavLink>
          <NavLink to="/products?category=men"  className={navLinkClass}>Men</NavLink>
          <NavLink to="/products?category=women"className={navLinkClass}>Women</NavLink>
          <NavLink to="/products?category=kids" className={navLinkClass}>Kids</NavLink>
        </nav>

        {/* Right actions */}
        <div className={styles.actions}>
          <Link to="/cart" className={styles.cartBtn}>
            <ShoppingBag size={20} />
            {itemCount > 0 && <span className={styles.badge}>{itemCount > 9 ? '9+' : itemCount}</span>}
          </Link>

          {user ? (
            <div className={styles.userMenu}>
              <button className={styles.userBtn} onClick={() => setUserMenu(!userMenu)}>
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className={styles.avatar} />
                  : <div className={styles.avatarFallback}>{user.name[0].toUpperCase()}</div>
                }
                <ChevronDown size={14} />
              </button>
              {userMenu && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <p className={styles.dropdownName}>{user.name}</p>
                    <p className={styles.dropdownEmail}>{user.email}</p>
                  </div>
                  <hr />
                  {isAdmin && (
                    <Link to="/admin" className={styles.dropdownItem} onClick={() => setUserMenu(false)}>
                      <LayoutDashboard size={15} /> Admin Panel
                    </Link>
                  )}
                  <Link to="/profile" className={styles.dropdownItem} onClick={() => setUserMenu(false)}>
                    <Settings size={15} /> Profile
                  </Link>
                  <Link to="/orders" className={styles.dropdownItem} onClick={() => setUserMenu(false)}>
                    <Package size={15} /> My Orders
                  </Link>
                  <hr />
                  <button className={`${styles.dropdownItem} ${styles.logoutItem}`} onClick={logout}>
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          )}

          {/* Mobile hamburger */}
          <button className={styles.hamburger} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <nav className={styles.mobileNav}>
            {[['/', 'Home'], ['/products', 'All Products'], ['/products?category=men', 'Men'], ['/products?category=women', 'Women'], ['/products?category=kids', 'Kids']].map(([to, label]) => (
              <Link key={to} to={to} className={styles.mobileLink} onClick={() => setMobileOpen(false)}>{label}</Link>
            ))}
            <hr />
            {user ? (
              <>
                <Link to="/orders"  className={styles.mobileLink} onClick={() => setMobileOpen(false)}>My Orders</Link>
                <Link to="/profile" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Profile</Link>
                {isAdmin && <Link to="/admin" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Admin Panel</Link>}
                <button className={`${styles.mobileLink} ${styles.logoutItem}`} onClick={() => { logout(); setMobileOpen(false); }}>Logout</button>
              </>
            ) : (
              <Link to="/login" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Login / Register</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}