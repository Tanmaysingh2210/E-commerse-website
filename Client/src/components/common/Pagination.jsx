import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left  = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);

  for (let i = left; i <= right; i++) pages.push(i);

  return (
    <div className={styles.wrap}>
      <button
        className={styles.btn}
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={16} />
      </button>

      {left > 1 && (
        <>
          <button className={styles.btn} onClick={() => onPageChange(1)}>1</button>
          {left > 2 && <span className={styles.ellipsis}>…</span>}
        </>
      )}

      {pages.map((p) => (
        <button
          key={p}
          className={`${styles.btn} ${p === page ? styles.active : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      {right < totalPages && (
        <>
          {right < totalPages - 1 && <span className={styles.ellipsis}>…</span>}
          <button className={styles.btn} onClick={() => onPageChange(totalPages)}>{totalPages}</button>
        </>
      )}

      <button
        className={styles.btn}
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}