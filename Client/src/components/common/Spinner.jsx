import React from 'react';

export default function Spinner({ size = 24, center = false }) {
  const el = (
    <div
      className="spinner"
      style={{ width: size, height: size, borderWidth: size > 32 ? 3 : 2.5 }}
    />
  );
  if (center) return <div className="spinner-page">{el}</div>;
  return el;
}