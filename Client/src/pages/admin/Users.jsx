import React, { useState, useEffect, useCallback } from 'react';
import { Search, ShieldCheck, ShieldOff, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import Spinner from '../../components/common/Spinner';
import { adminAPI } from '../../api/index';
import { formatDate } from '../../utils/helpers';
import styles from './AdminTable.module.css';

export default function AdminUsers() {
  const [users,      setUsers]      = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [actionId,   setActionId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getUsers({
        page, limit: 12,
        ...(search     && { search }),
        ...(roleFilter && { role: roleFilter }),
      });
      setUsers(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (userId, currentActive) => {
    if (!window.confirm(`${currentActive ? 'Deactivate' : 'Activate'} this user?`)) return;
    setActionId(userId);
    try {
      await adminAPI.toggleUserStatus(userId);
      toast.success(`User ${currentActive ? 'deactivated' : 'activated'}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally { setActionId(null); }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this user's role to "${newRole}"?`)) return;
    setActionId(userId);
    try {
      await adminAPI.updateUserRole(userId, newRole);
      toast.success('Role updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Role update failed.');
    } finally { setActionId(null); }
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Users</h1>
          <p className={styles.sub}>{pagination.total ?? users.length} registered users</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="form-select"
          style={{ maxWidth: 160 }}
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? (
        <Spinner center />
      ) : users.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem 0' }}>
          <p>No users found.</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Auth</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} style={{ opacity: actionId === u._id ? 0.5 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: u.avatar ? 'transparent' : 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, overflow: 'hidden',
                        }}>
                          {u.avatar
                            ? <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: '#fff', fontSize: '.8rem', fontWeight: 700 }}>{u.name?.[0]?.toUpperCase()}</span>
                          }
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '.88rem' }}>{u.name}</p>
                          <p style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-neutral'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">
                        {u.googleId ? '🔗 Google' : '🔑 Email'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {/* Toggle role */}
                        <button
                          className="btn btn-ghost btn-sm"
                          title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                          disabled={actionId === u._id}
                          onClick={() => handleRoleChange(u._id, u.role === 'admin' ? 'user' : 'admin')}
                        >
                          {u.role === 'admin'
                            ? <ShieldOff size={15} style={{ color: 'var(--warning)' }} />
                            : <ShieldCheck size={15} style={{ color: 'var(--success)' }} />
                          }
                        </button>

                        {/* Toggle active */}
                        <button
                          className="btn btn-ghost btn-sm"
                          title={u.isActive ? 'Deactivate user' : 'Activate user'}
                          disabled={actionId === u._id}
                          onClick={() => handleToggleStatus(u._id, u.isActive)}
                        >
                          {u.isActive
                            ? <UserX size={15} style={{ color: 'var(--danger)' }} />
                            : <UserCheck size={15} style={{ color: 'var(--success)' }} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
}