import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}