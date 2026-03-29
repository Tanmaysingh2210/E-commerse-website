import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();

  // ── Bootstrap: check if user is already logged in ─────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authAPI.getMe()
        .then(({ data }) => setUser(data.user))
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── Listen for forced logout (token refresh failed) ────────────────────────
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
      navigate('/login');
      toast.error('Session expired. Please log in again.');
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [navigate]);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    console.error(data);
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    toast.success('Account created successfully!');
    return data.user;
  }, []);

  const googleLogin = useCallback(async (idToken) => {
    const { data } = await authAPI.googleLogin(idToken);
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    toast.success(`Welcome, ${data.user.name.split(' ')[0]}!`);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    setUser(null);
    localStorage.removeItem('accessToken');
    navigate('/login');
    toast.success('Logged out.');
  }, [navigate]);

  const updateUser = useCallback((updatedUser) => setUser(updatedUser), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateUser, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};