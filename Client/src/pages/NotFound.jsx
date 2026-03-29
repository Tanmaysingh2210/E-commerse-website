import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="empty-state" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <p style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--border)' }}>404</p>
      <h3 style={{ fontSize: '1.25rem' }}>Page not found</h3>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}