// import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
// import toast from 'react-hot-toast';
// import { authAPI } from '../api/auth';

// const AuthContext = createContext(null);

// export function AuthProvider({ children }) {
//   const [user, setUser]       = useState(null);
//   const [loading, setLoading] = useState(true);
//   const navigate              = useNavigate();

//   // ── Bootstrap: check if user is already logged in ─────────────────────────
//   useEffect(() => {
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       authAPI.getMe()
//         .then(({ data }) => setUser(data.user))
//         .catch(() => localStorage.removeItem('accessToken'))
//         .finally(() => setLoading(false));
//     } else {
//       setLoading(false);
//     }
//   }, []);

//   // ── Listen for forced logout (token refresh failed) ────────────────────────
//   useEffect(() => {
//     const handleForcedLogout = () => {
//       setUser(null);
//       localStorage.removeItem('accessToken');
//       navigate('/login');
//       toast.error('Session expired. Please log in again.');
//     };
//     window.addEventListener('auth:logout', handleForcedLogout);
//     return () => window.removeEventListener('auth:logout', handleForcedLogout);
//   }, [navigate]);

//   const login = useCallback(async (email, password) => {
//     const { data } = await authAPI.login({ email, password });
//     localStorage.setItem('accessToken', data.accessToken);
//     setUser(data.user);
//     toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`);
//     return data.user;
//   }, []);

//   const register = useCallback(async (name, email, password) => {
//     const { data } = await authAPI.register({ name, email, password });
//     console.error(data);
//     localStorage.setItem('accessToken', data.accessToken);
//     setUser(data.user);
//     toast.success('Account created successfully!');
//     return data.user;
//   }, []);

//   const googleLogin = useCallback(async (idToken) => {
//     const { data } = await authAPI.googleLogin(idToken);
//     localStorage.setItem('accessToken', data.accessToken);
//     setUser(data.user);
//     toast.success(`Welcome, ${data.user.name.split(' ')[0]}!`);
//     return data.user;
//   }, []);

//   const logout = useCallback(async () => {
//     try { await authAPI.logout(); } catch {}
//     setUser(null);
//     localStorage.removeItem('accessToken');
//     navigate('/login');
//     toast.success('Logged out.');
//   }, [navigate]);

//   const updateUser = useCallback((updatedUser) => setUser(updatedUser), []);

//   return (
//     <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateUser, isAdmin: user?.role === 'admin' }}>
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export const useAuth = () => {
//   const ctx = useContext(AuthContext);
//   if (!ctx) throw new Error('useAuth must be used within AuthProvider');
//   return ctx;
// };


import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Bootstrap: check if user already logged in
  useEffect(function() {
    var token = localStorage.getItem('accessToken');
    if (token) {
      authAPI.getMe()
        .then(function(res) { setUser(res.data.user); })
        .catch(function() {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(function() { setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for forced logout (refresh token expired)
  useEffect(function() {
    function handleForcedLogout() {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      navigate('/login');
      toast.error('Session expired. Please log in again.');
    }
    window.addEventListener('auth:logout', handleForcedLogout);
    return function() { window.removeEventListener('auth:logout', handleForcedLogout); };
  }, [navigate]);

  var login = useCallback(async function(email, password) {
    var res = await authAPI.login({ email: email, password: password });
    localStorage.setItem('accessToken',  res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
    toast.success('Welcome back, ' + res.data.user.name.split(' ')[0] + '!');
    return res.data.user;
  }, []);

  var register = useCallback(async function(name, email, password) {
    var res = await authAPI.register({ name: name, email: email, password: password });
    localStorage.setItem('accessToken',  res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
    toast.success('Account created successfully!');
    return res.data.user;
  }, []);

  var googleLogin = useCallback(async function(idToken) {
    var res = await authAPI.googleLogin(idToken);
    localStorage.setItem('accessToken',  res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
    toast.success('Welcome, ' + res.data.user.name.split(' ')[0] + '!');
    return res.data.user;
  }, []);

  var logout = useCallback(async function() {
    try { await authAPI.logout(); } catch (e) {}
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/login');
    toast.success('Logged out.');
  }, [navigate]);

  var updateUser = useCallback(function(updatedUser) { setUser(updatedUser); }, []);

  return (
    <AuthContext.Provider value={{
      user:        user,
      loading:     loading,
      login:       login,
      register:    register,
      googleLogin: googleLogin,
      logout:      logout,
      updateUser:  updateUser,
      isAdmin:     user && user.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  var ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}