import React, { useState } from 'react';
import { Star } from 'lucide-react';

export function StarDisplay({ rating = 0, count, size = 16 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={size}
            fill={s <= Math.round(rating) ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
        ))}
      </div>
      {count !== undefined && (
        <span style={{ fontSize: '.8rem', color: 'var(--muted)', marginLeft: 2 }}>
          ({count})
        </span>
      )}
    </div>
  );
}

export function StarInput({ value = 0, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="stars" style={{ cursor: 'pointer', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={24}
          fill={(hovered || value) >= s ? 'currentColor' : 'none'}
          strokeWidth={1.5}
          style={{ transition: 'fill .1s' }}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
        />
      ))}
    </div>
  );
}
