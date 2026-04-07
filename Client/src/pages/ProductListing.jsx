import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import Pagination from '../components/common/Pagination';
import Spinner from '../components/common/Spinner';
import { productAPI } from '../api/products';
import styles from './ProductListing.module.css';

const CATEGORIES = ['men','women','kids','accessories','footwear','outerwear','activewear','formals','ethnic','others'];
const SORTS = [
  { value: '-createdAt',    label: 'Newest First' },
  { value: 'price',         label: 'Price: Low to High' },
  { value: '-price',        label: 'Price: High to Low' },
  { value: '-averageRating',label: 'Top Rated' },
];

export default function ProductListing() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products,    setProducts]    = useState([]);
  const [pagination,  setPagination]  = useState({ total: 0, totalPages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Local state for price inputs (controlled) ──────────────────────────────
  const [localMin, setLocalMin] = useState(searchParams.get('minPrice') || '');
  const [localMax, setLocalMax] = useState(searchParams.get('maxPrice') || '');
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');

  // Debounce timers
  const searchTimer = useRef(null);
  const priceTimer  = useRef(null);

  // ── Derived filter values from URL ─────────────────────────────────────────
  const page     = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';
  const sort     = searchParams.get('sort')     || '-createdAt';
  const search   = searchParams.get('search')   || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  // Sync local inputs if URL changes externally (e.g. clear filters)
  useEffect(() => {
    setLocalMin(searchParams.get('minPrice') || '');
    setLocalMax(searchParams.get('maxPrice') || '');
    setLocalSearch(searchParams.get('search') || '');
  }, [searchParams.get('minPrice'), searchParams.get('maxPrice'), searchParams.get('search')]);

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value !== '' && value !== null && value !== undefined) {
      p.set(key, value);
    } else {
      p.delete(key);
    }
    if (key !== 'page') p.delete('page');
    setSearchParams(p);
  };

  const setMultipleParams = (updates) => {
    const p = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        p.set(key, value);
      } else {
        p.delete(key);
      }
    });
    p.delete('page');
    setSearchParams(p);
  };

  // ── Fetch products ─────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, sort, limit: 12 };
      if (category) params.category = category;
      if (search)   params.search   = search;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const { data } = await productAPI.getAll(params);
      setProducts(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, category, sort, search, minPrice, maxPrice]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSearchChange = (val) => {
    setLocalSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam('search', val), 400);
  };

  const handleMinChange = (val) => {
    setLocalMin(val);
    clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(() => {
      setMultipleParams({ minPrice: val, maxPrice: localMax });
    }, 600);
  };

  const handleMaxChange = (val) => {
    setLocalMax(val);
    clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(() => {
      setMultipleParams({ minPrice: localMin, maxPrice: val });
    }, 600);
  };

  // Apply both on Enter/blur
  const applyPriceFilter = () => {
    setMultipleParams({ minPrice: localMin, maxPrice: localMax });
  };

  const clearFilters = () => {
    setLocalMin(''); setLocalMax(''); setLocalSearch('');
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
            {loading ? '…' : `${pagination.total} product${pagination.total !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* ── Toolbar ── */}
        <div className={styles.toolbar}>
          <button
            className={`btn btn-outline btn-sm ${filtersOpen ? styles.filterBtnActive : ''}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={15} />
            Filters
            {hasFilters && <span className={styles.filterDot} />}
          </button>

          <div className={styles.toolbarRight}>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={14} /> Clear all
              </button>
            )}
            <select
              className="form-select"
              style={{ padding: '.45rem .75rem', fontSize: '.85rem' }}
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
            >
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Active filter chips ── */}
        {hasFilters && (
          <div className={styles.chips}>
            {category && (
              <span className={styles.chip}>
                {category}
                <button onClick={() => setParam('category', '')}><X size={11} /></button>
              </span>
            )}
            {search && (
              <span className={styles.chip}>
                "{search}"
                <button onClick={() => { setLocalSearch(''); setParam('search', ''); }}><X size={11} /></button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className={styles.chip}>
                ₹{minPrice || '0'} – ₹{maxPrice || '∞'}
                <button onClick={() => { setLocalMin(''); setLocalMax(''); setMultipleParams({ minPrice: '', maxPrice: '' }); }}><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        <div className={styles.layout}>
          {/* ── Sidebar ── */}
          <aside className={`${styles.sidebar} ${filtersOpen ? styles.sidebarOpen : ''}`}>
            {/* Mobile header */}
            <div className={styles.sidebarHeader}>
              <span className={styles.sidebarTitle}>Filters</span>
              <button className={styles.sidebarClose} onClick={() => setFiltersOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className={styles.filterSection}>
              <h4 className={styles.filterTitle}>Search</h4>
              <div className={styles.searchInputWrap}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  className="form-input"
                  style={{ paddingLeft: '2.1rem' }}
                  placeholder="Search products…"
                  value={localSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            {/* Category */}
            <div className={styles.filterSection}>
              <h4 className={styles.filterTitle}>Category</h4>
              <div className={styles.filterOptions}>
                {CATEGORIES.map((c) => (
                  <label key={c} className={`${styles.filterOption} ${category === c ? styles.filterOptionActive : ''}`}>
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

            {/* Price Range — fully controlled inputs */}
            <div className={styles.filterSection}>
              <h4 className={styles.filterTitle}>Price Range</h4>
              <div className={styles.priceRow}>
                <div className={styles.priceField}>
                  <label className={styles.priceLabel}>Min (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={localMin}
                    onChange={(e) => handleMinChange(e.target.value)}
                    onBlur={applyPriceFilter}
                    onKeyDown={(e) => e.key === 'Enter' && applyPriceFilter()}
                  />
                </div>
                <span className={styles.priceSep}>—</span>
                <div className={styles.priceField}>
                  <label className={styles.priceLabel}>Max (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="Any"
                    value={localMax}
                    onChange={(e) => handleMaxChange(e.target.value)}
                    onBlur={applyPriceFilter}
                    onKeyDown={(e) => e.key === 'Enter' && applyPriceFilter()}
                  />
                </div>
              </div>
              {/* Quick price presets */}
              <div className={styles.pricePresets}>
                {[
                  { label: 'Under ₹500',    min: '',    max: '500' },
                  { label: '₹500–₹2000',    min: '500', max: '2000' },
                  { label: '₹2000–₹5000',   min: '2000',max: '5000' },
                  { label: 'Above ₹5000',   min: '5000',max: '' },
                ].map((p) => (
                  <button
                    key={p.label}
                    className={`${styles.preset} ${localMin === p.min && localMax === p.max ? styles.presetActive : ''}`}
                    type="button"
                    onClick={() => {
                      setLocalMin(p.min); setLocalMax(p.max);
                      setMultipleParams({ minPrice: p.min, maxPrice: p.max });
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile apply button */}
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: '.5rem' }}
              onClick={() => setFiltersOpen(false)}
            >
              Show Results ({pagination.total})
            </button>
          </aside>

          {/* Overlay for mobile */}
          {filtersOpen && (
            <div className={styles.overlay} onClick={() => setFiltersOpen(false)} />
          )}

          {/* ── Products Grid ── */}
          <div className={styles.main}>
            {loading ? (
              <Spinner center />
            ) : products.length === 0 ? (
              <div className="empty-state">
                <SlidersHorizontal size={48} />
                <h3>No products found</h3>
                <p>Try adjusting your filters or clearing them.</p>
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