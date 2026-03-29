import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Tag, ToggleRight, ToggleLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Spinner from '../../components/common/Spinner';
import { couponAPI } from '../../api/index';
import { formatPrice, formatDate } from '../../utils/helpers';
import styles from './AdminTable.module.css';

const EMPTY = {
  code: '', description: '', discountType: 'percent', discountValue: '',
  maxDiscountAmount: '', minOrderAmount: '', usageLimit: '', expiresAt: '',
  isActive: true, isFirstOrderOnly: false,
};

export default function AdminCoupons() {
  const [coupons,    setCoupons]    = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await couponAPI.getAll({ page, limit: 10 });
      setCoupons(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = (c) => {
    setEditing(c);
    setForm({
      code: c.code, description: c.description || '',
      discountType: c.discountType, discountValue: c.discountValue,
      maxDiscountAmount: c.maxDiscountAmount || '', minOrderAmount: c.minOrderAmount || 0,
      usageLimit: c.usageLimit || '', isActive: c.isActive,
      isFirstOrderOnly: c.isFirstOrderOnly,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().split('T')[0] : '',
    });
    setModal(true);
  };

  const setF = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        discountValue:    parseFloat(form.discountValue),
        minOrderAmount:   parseFloat(form.minOrderAmount) || 0,
        maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : null,
        usageLimit:       form.usageLimit ? parseInt(form.usageLimit) : null,
        expiresAt:        new Date(form.expiresAt).toISOString(),
      };
      if (editing) {
        await couponAPI.update(editing._id, payload);
        toast.success('Coupon updated!');
      } else {
        await couponAPI.create(payload);
        toast.success('Coupon created!');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon permanently?')) return;
    try {
      await couponAPI.delete(id);
      toast.success('Coupon deleted.');
      load();
    } catch { toast.error('Delete failed.'); }
  };

  const isExpired = (date) => new Date(date) < new Date();

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Coupons</h1>
          <p className={styles.sub}>{pagination.total ?? coupons.length} coupons</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {loading ? (
        <Spinner center />
      ) : coupons.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem 0' }}>
          <Tag size={48} />
          <h3>No coupons yet</h3>
          <p>Create your first discount coupon to attract customers.</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={15} /> Create Coupon
          </button>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Order</th>
                  <th>Usage</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => {
                  const expired = isExpired(c.expiresAt);
                  return (
                    <tr key={c._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                          <Tag size={14} color="var(--muted)" />
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '.92rem', fontFamily: 'monospace', letterSpacing: '.04em' }}>
                              {c.code}
                            </p>
                            {c.description && (
                              <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.1rem' }}>
                                {c.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <p style={{ fontWeight: 700 }}>
                          {c.discountType === 'percent'
                            ? `${c.discountValue}%`
                            : formatPrice(c.discountValue)
                          }
                        </p>
                        {c.discountType === 'percent' && c.maxDiscountAmount && (
                          <p style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                            Max {formatPrice(c.maxDiscountAmount)}
                          </p>
                        )}
                        {c.isFirstOrderOnly && (
                          <span className="badge badge-info" style={{ marginTop: '.25rem', fontSize: '.65rem' }}>
                            First order
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '.88rem' }}>
                        {c.minOrderAmount > 0 ? formatPrice(c.minOrderAmount) : '—'}
                      </td>
                      <td>
                        <p style={{ fontSize: '.88rem' }}>
                          {c.usageCount}
                          {c.usageLimit ? ` / ${c.usageLimit}` : ' / ∞'}
                        </p>
                        {c.usageLimit && (
                          <div style={{
                            marginTop: '.3rem', height: 4, background: 'var(--border)',
                            borderRadius: 4, overflow: 'hidden', width: 64,
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min((c.usageCount / c.usageLimit) * 100, 100)}%`,
                              background: c.usageCount >= c.usageLimit ? 'var(--danger)' : 'var(--success)',
                              borderRadius: 4,
                            }} />
                          </div>
                        )}
                      </td>
                      <td>
                        <p style={{ fontSize: '.82rem', color: expired ? 'var(--danger)' : 'var(--text)' }}>
                          {formatDate(c.expiresAt)}
                        </p>
                        {expired && (
                          <span className="badge badge-danger" style={{ fontSize: '.65rem', marginTop: '.2rem' }}>
                            Expired
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                          {c.isActive && !expired
                            ? <ToggleRight size={20} color="var(--success)" />
                            : <ToggleLeft  size={20} color="var(--muted)" />
                          }
                          <span className={`badge ${c.isActive && !expired ? 'badge-success' : 'badge-danger'}`}>
                            {c.isActive && !expired ? 'Active' : expired ? 'Expired' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(c)}
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDelete(c._id)}
                            title="Delete"
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title={editing ? `Edit Coupon — ${editing.code}` : 'Create Coupon'}
        size="md"
      >
        <form onSubmit={handleSave} className={styles.modalForm}>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Coupon Code *</label>
              <input
                className="form-input"
                placeholder="SAVE20"
                required
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '.06em' }}
                value={form.code}
                disabled={!!editing}
                onChange={(e) => setF('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
              />
              <p className="form-hint">3–20 alphanumeric characters. Cannot be changed after creation.</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              className="form-input"
              placeholder="20% off for new users"
              value={form.description}
              onChange={(e) => setF('description', e.target.value)}
            />
          </div>

          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Discount Type *</label>
              <select
                className="form-select"
                required
                value={form.discountType}
                onChange={(e) => setF('discountType', e.target.value)}
              >
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Discount Value * {form.discountType === 'percent' ? '(%)' : '(₹)'}
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder={form.discountType === 'percent' ? '20' : '100'}
                value={form.discountValue}
                onChange={(e) => setF('discountValue', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            {form.discountType === 'percent' && (
              <div className="form-group">
                <label className="form-label">Max Discount (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  placeholder="500 (optional cap)"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setF('maxDiscountAmount', e.target.value)}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Min Order Amount (₹)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                placeholder="0"
                value={form.minOrderAmount}
                onChange={(e) => setF('minOrderAmount', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Usage Limit</label>
              <input
                className="form-input"
                type="number"
                min="1"
                placeholder="∞ Unlimited"
                value={form.usageLimit}
                onChange={(e) => setF('usageLimit', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Expiry Date *</label>
            <input
              className="form-input"
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={form.expiresAt}
              onChange={(e) => setF('expiresAt', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setF('isActive', e.target.checked)}
              />
              Active
            </label>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={form.isFirstOrderOnly}
                onChange={(e) => setF('isFirstOrderOnly', e.target.checked)}
              />
              First order only
            </label>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Coupon' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}