import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import Pagination from '../components/common/Pagination';
import Spinner from '../components/common/Spinner';
import { productAPI } from '../api/products';
import { debounce } from '../utils/helpers';
import styles from './ProductListing.module.css';

const CATEGORIES = ['men','women','kids','accessories','footwear','outerwear','activewear','formals','ethnic','others'];
const SORTS = [
  { value: '-createdAt', label: 'Newest' },
  { value: 'price',      label: 'Price: Low to High' },
  { value: '-price',     label: 'Price: High to Low' },
  { value: '-averageRating', label: 'Top Rated' },
];

export default function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products,    setProducts]    = useState([]);
  const [pagination,  setPagination]  = useState({ total: 0, totalPages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Filter state derived from URL ─────────────────────────────────────────
  const page     = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';
  const sort     = searchParams.get('sort')     || '-createdAt';
  const search   = searchParams.get('search')   || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    value ? p.set(key, value) : p.delete(key);
    if (key !== 'page') p.delete('page');
    setSearchParams(p);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getAll({
        page, sort, limit: 12,
        ...(category && { category }),
        ...(search   && { search }),
        ...(minPrice && { minPrice }),
        ...(maxPrice && { maxPrice }),
      });
      setProducts(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, category, sort, search, minPrice, maxPrice]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const debouncedSearch = useCallback(
    debounce((val) => setParam('search', val), 400), []
  );

  const clearFilters = () => {
    setSearchParams({ sort: '-createdAt' });
  };

  const hasFilters = category || search || minPrice || maxPrice;

  return (
    <div className="section">
      <div className="container">
        <div className="page-header" style={{ paddingTop: 0 }}>
          <h1 className="page-title">
            {category ? category.charAt(0).toUpperCase() + category.slice(1) : 'All Products'}
          </h1>
          <p className="page-subtitle">
            {loading ? '…' : `${pagination.total} products found`}
          </p>
        </div>

        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          <button className="btn btn-outline btn-sm" onClick={() => setFiltersOpen(!filtersOpen)}>
            <SlidersHorizontal size={15} /> Filters
            {hasFilters && <span className={styles.filterDot} />}
          </button>

          <div className={styles.toolbarRight}>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={14} /> Clear
              </button>
            )}
            <div className={styles.sortWrap}>
              <select
                className="form-select"
                style={{ padding: '.45rem .8rem', fontSize: '.85rem' }}
                value={sort}
                onChange={(e) => setParam('sort', e.target.value)}
              >
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.layout}>
          {/* ── Sidebar Filters ── */}
          <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.filterSection}>
              <h4 className={styles.filterTitle}>Search</h4>
              <input
                className="form-input"
                placeholder="Search products…"
                defaultValue={search}
                onChange={(e) => debouncedSearch(e.target.value)}
              />
            </div>

            <div className={styles.filterSection}>
              <h4 className={styles.filterTitle}>Category</h4>
              <div className={styles.filterOptions}>
                {CATEGORIES.map((c) => (
                  <label key={c} className={styles.filterOption}>
                    <input
                      type="radio"
                      name="category"
                      checked={category === c}
                      onChange={() => setParam('category', category === c ? '' : c)}
                    />
                    <span>{c.charAt(0).toUpperCase() + c.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <h4 className={styles.filterTitle}>Price Range</h4>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <input
                  className="form-input"
                  type="number"
                  placeholder="Min"
                  defaultValue={minPrice}
                  onChange={(e) => debounce(() => setParam('minPrice', e.target.value), 500)()}
                  onBlur={(e) => setParam('minPrice', e.target.value)}
                />
                <span style={{ color: 'var(--muted)' }}>—</span>
                <input
                  className="form-input"
                  type="number"
                  placeholder="Max"
                  defaultValue={maxPrice}
                  onBlur={(e) => setParam('maxPrice', e.target.value)}
                />
              </div>
            </div>
          </aside>

          {/* ── Products Grid ── */}
          <div className={styles.main}>
            {loading ? (
              <Spinner center />
            ) : products.length === 0 ? (
              <div className="empty-state">
                <SlidersHorizontal size={48} />
                <h3>No products found</h3>
                <p>Try adjusting your filters.</p>
                <button className="btn btn-outline" onClick={clearFilters}>Clear filters</button>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {products.map((p) => <ProductCard key={p._id} product={p} />)}
                </div>
                <Pagination
                  page={page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setParam('page', p)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}