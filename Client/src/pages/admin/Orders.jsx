import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import Spinner from '../../components/common/Spinner';
import { orderAPI } from '../../api/index';
import { formatPrice, formatDate, statusVariant, paymentVariant } from '../../utils/helpers';
import styles from './AdminTable.module.css';

const STATUS_OPTIONS = ['pending','confirmed','processing','shipped','delivered','cancelled'];

export default function AdminOrders() {
  const [orders,    setOrders]    = useState([]);
  const [pagination,setPagination]= useState({ totalPages:1 });
  const [page,      setPage]      = useState(1);
  const [filter,    setFilter]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [updating,  setUpdating]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await orderAPI.getAll({ page, limit: 12, ...(filter && { status: filter }) });
      setOrders(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (orderId, status) => {
    setUpdating(orderId);
    try {
      await orderAPI.updateStatus(orderId, { status });
      toast.success(`Order status updated to "${status}".`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setUpdating(null); }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Orders</h1>
          <p className={styles.sub}>{pagination.total ?? orders.length} total orders</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <select className="form-select" style={{ maxWidth: 180 }}
          value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <Spinner center /> : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Update Status</th></tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td><strong style={{ fontSize: '.88rem' }}>#{o.orderNumber}</strong></td>
                    <td>
                      <p style={{ fontSize: '.88rem', fontWeight:500 }}>{o.user?.name}</p>
                      <p style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{o.user?.email}</p>
                    </td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{formatDate(o.createdAt)}</td>
                    <td style={{ fontWeight: 700 }}>{formatPrice(o.total)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                        <span className={`badge ${paymentVariant(o.paymentStatus)}`}>{o.paymentStatus}</span>
                        <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{o.paymentMethod}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${statusVariant(o.status)}`}>{o.status}</span></td>
                    <td>
                      <select
                        className={styles.statusSelect}
                        value={o.status}
                        disabled={updating === o._id || ['delivered','cancelled','refunded'].includes(o.status)}
                        onChange={(e) => handleStatusChange(o._id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}