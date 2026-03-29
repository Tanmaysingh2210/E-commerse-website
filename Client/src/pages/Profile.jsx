import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';
import styles from './Profile.module.css';

export default function Profile() {
  const { user, updateUser }   = useAuth();
  const [tab, setTab]          = useState('profile');
  const [saving,   setSaving]  = useState(false);
  const [pwSaving, setPwSaving]= useState(false);

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: pe } } = useForm({
    defaultValues: { name: user?.name || '', email: user?.email || '' },
  });

  const { register: regPw, handleSubmit: handlePw, formState: { errors: we }, watch, reset: resetPw } = useForm();
  const newPassword = watch('newPassword');

  const onSaveProfile = async ({ name }) => {
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile({ name });
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  };

  const onChangePassword = async ({ currentPassword, newPassword }) => {
    setPwSaving(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      toast.success('Password changed. Please log in again.');
      resetPw();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.');
    } finally { setPwSaving(false); }
  };

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <h1 className="page-title" style={{ marginBottom: '2rem' }}>My Profile</h1>

        {/* Avatar + info */}
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} />
              : <span>{user?.name?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div>
            <h2 className={styles.profileName}>{user?.name}</h2>
            <p className={styles.profileEmail}>{user?.email}</p>
            <span className={`badge ${user?.role === 'admin' ? 'badge-info' : 'badge-neutral'}`} style={{ marginTop: '.4rem' }}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'profile' ? styles.tabActive : ''}`} onClick={() => setTab('profile')}>
            <User size={15} /> Profile Info
          </button>
          <button className={`${styles.tab} ${tab === 'password' ? styles.tabActive : ''}`} onClick={() => setTab('password')}>
            <Lock size={15} /> Change Password
          </button>
        </div>

        {/* Profile form */}
        {tab === 'profile' && (
          <form onSubmit={handleProfile(onSaveProfile)} className={styles.form}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className={`form-input ${pe.name ? 'error' : ''}`}
                {...regProfile('name', { required: 'Name is required' })}
              />
              {pe.name && <p className="form-error">{pe.name.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" disabled
                {...regProfile('email')}
                style={{ background: 'var(--surface)', cursor: 'not-allowed' }}
              />
              <p className="form-hint">Email cannot be changed.</p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        )}

        {/* Password form */}
        {tab === 'password' && (
          <form onSubmit={handlePw(onChangePassword)} className={styles.form}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                className={`form-input ${we.currentPassword ? 'error' : ''}`}
                type="password"
                {...regPw('currentPassword', { required: 'Current password is required' })}
              />
              {we.currentPassword && <p className="form-error">{we.currentPassword.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className={`form-input ${we.newPassword ? 'error' : ''}`}
                type="password"
                {...regPw('newPassword', {
                  required: 'New password is required',
                  minLength: { value: 6, message: 'Min 6 characters' },
                  pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Include uppercase, lowercase and a number' },
                })}
              />
              {we.newPassword && <p className="form-error">{we.newPassword.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                className={`form-input ${we.confirmPassword ? 'error' : ''}`}
                type="password"
                {...regPw('confirmPassword', {
                  required: 'Please confirm new password',
                  validate: (v) => v === newPassword || 'Passwords do not match',
                })}
              />
              {we.confirmPassword && <p className="form-error">{we.confirmPassword.message}</p>}
            </div>
            <button type="submit" className="btn btn-primary" disabled={pwSaving}>
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}