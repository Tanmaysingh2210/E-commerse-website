import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

export default function Register() {
  const { register: registerUser, user } = useAuth();
  const navigate                         = useNavigate();
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  useEffect(() => { if (user) navigate('/'); }, [user]);

  const onSubmit = async ({ name, email, password }) => {
    setError('');
    setLoading(true);
    try {
      await registerUser(name, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.top}>
          <Link to="/" className={styles.logo}>DRIP</Link>
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.sub}>Join DRIP and start shopping</p>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form} noValidate>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className={`form-input ${errors.name ? 'error' : ''}`}
              type="text" placeholder="John Doe" autoComplete="name"
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name must be at least 2 characters' } })}
            />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className={`form-input ${errors.email ? 'error' : ''}`}
              type="email" placeholder="you@example.com" autoComplete="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
              })}
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className={styles.pwWrap}>
              <input
                className={`form-input ${errors.password ? 'error' : ''}`}
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 6 characters" autoComplete="new-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Include uppercase, lowercase and a number' },
                })}
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              type="password" placeholder="Re-enter password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (v) => v === password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p className={styles.terms}>
            By creating an account you agree to our{' '}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </form>

        <p className={styles.switch}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}