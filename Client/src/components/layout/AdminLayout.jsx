import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag,
  LogOut, Menu, X, ExternalLink, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './AdminLayout.module.css';

const NAV = [
  { to: '/admin',           icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/products',  icon: Package,          label: 'Products' },
  { to: '/admin/orders',    icon: ShoppingBag,      label: 'Orders' },
  { to: '/admin/users',     icon: Users,            label: 'Users' },
  { to: '/admin/coupons',   icon: Tag,              label: 'Coupons' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <span className={styles.logo}>{collapsed ? 'D' : 'DRIP'}</span>
          <button className={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <a href="/" target="_blank" rel="noreferrer" className={styles.navItem}>
            <ExternalLink size={18} />
            {!collapsed && <span>View Store</span>}
          </a>
          <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={logout}>
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button className={styles.mobileMenuBtn} onClick={() => setCollapsed(!collapsed)}>
              <Menu size={20} />
            </button>
            <span className={styles.adminLabel}>Admin Panel</span>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.adminUser}>
              <div className={styles.avatarFallback}>{user?.name?.[0]?.toUpperCase()}</div>
              <span className={styles.adminName}>{user?.name}</span>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}