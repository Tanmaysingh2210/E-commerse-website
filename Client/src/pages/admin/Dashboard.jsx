import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Users, Package, DollarSign, TrendingUp, Clock } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import { adminAPI } from '../../api/index';
import { formatPrice, formatDate, statusVariant } from '../../utils/helpers';
import styles from './Dashboard.module.css';

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getStats()
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner center />;

  const { stats, recentOrders = [], revenueByMonth = [] } = data || {};

  const CARDS = [
    { label: 'Total Revenue',  value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign, color: '#16a34a' },
    { label: 'Total Orders',   value: stats?.totalOrders   || 0,             icon: ShoppingBag, color: '#1d4ed8' },
    { label: 'Pending Orders', value: stats?.pendingOrders || 0,             icon: Clock,       color: '#d97706' },
    { label: 'Total Users',    value: stats?.totalUsers    || 0,             icon: Users,       color: '#7c3aed' },
    { label: 'Products Live',  value: stats?.totalProducts || 0,             icon: Package,     color: '#0891b2' },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.sub}>Welcome back! Here's what's happening.</p>
      </div>

      {/* Stat cards */}
      <div className={styles.statsGrid}>
        {CARDS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: color + '18', color }}>
              <Icon size={20} />
            </div>
            <div>
              <p className={styles.statLabel}>{label}</p>
              <p className={styles.statValue}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* Revenue chart (simple bar) */}
        <div className={styles.chartCard}>
          <h2 className={styles.cardTitle}><TrendingUp size={16} /> Revenue (Last 6 Months)</h2>
          {revenueByMonth.length === 0 ? (
            <p className={styles.empty}>No revenue data yet.</p>
          ) : (
            <div className={styles.barChart}>
              {revenueByMonth.slice(-6).map((m) => {
                const max = Math.max(...revenueByMonth.map((x) => x.revenue));
                const pct = max > 0 ? (m.revenue / max) * 100 : 0;
                return (
                  <div key={m._id} className={styles.barWrap}>
                    <div className={styles.barLabel}>{formatPrice(m.revenue)}</div>
                    <div className={styles.bar} style={{ height: `${Math.max(pct, 4)}%` }} />
                    <div className={styles.barMonth}>{m._id}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className={styles.chartCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className={styles.cardTitle}><ShoppingBag size={16} /> Recent Orders</h2>
            <Link to="/admin/orders" className={styles.viewAll}>View all →</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className={styles.empty}>No orders yet.</p>
          ) : (
            <div className={styles.orderList}>
              {recentOrders.map((o) => (
                <Link key={o._id} to={`/orders/${o._id}`} className={styles.orderRow}>
                  <div>
                    <p className={styles.orderNum}>#{o.orderNumber}</p>
                    <p className={styles.orderUser}>{o.user?.name}</p>
                  </div>
                  <div className={styles.orderRight}>
                    <span className={`badge ${statusVariant(o.status)}`}>{o.status}</span>
                    <p className={styles.orderAmount}>{formatPrice(o.total)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}