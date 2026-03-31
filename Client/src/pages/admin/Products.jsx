import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, Star, MoveUp, MoveDown, ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Spinner from '../../components/common/Spinner';
import { productAPI } from '../../api/products';
import { adminAPI } from '../../api/index';
import { formatPrice, primaryImage } from '../../utils/helpers';
import styles from './AdminTable.module.css';
import imgStyles from './ProductImages.module.css';

const EMPTY_FORM = {
  name: '', description: '', price: '', discountedPrice: '', costPrice: '',
  category: 'men', brand: '', isFeatured: false,
  sizes:  [{ size: 'S', stock: 10 }, { size: 'M', stock: 10 }, { size: 'L', stock: 10 }],
  images: [{ url: '', alt: '', isPrimary: true }],
};
const CATEGORIES = ['men','women','kids','accessories','footwear','outerwear','activewear','formals','ethnic','others'];

// ── Image Manager ──────────────────────────────────────────────────────────────
function ImageManager({ images, onChange }) {
  const [bulkInput, setBulkInput] = useState('');
  const [showBulk,  setShowBulk]  = useState(false);

  // Paste multiple comma/newline separated URLs at once
  const handleBulkAdd = () => {
    const urls = bulkInput
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.startsWith('http'));

    if (urls.length === 0) { toast.error('No valid URLs found.'); return; }

    const current    = images.filter(img => img.url.trim());
    const remaining  = 6 - current.length;
    const toAdd      = urls.slice(0, remaining).map((url, i) => ({
      url,
      alt: '',
      isPrimary: current.length === 0 && i === 0,
    }));

    const updated = [...current, ...toAdd];
    if (updated.length > 0 && !updated.some(img => img.isPrimary)) {
      updated[0].isPrimary = true;
    }

    onChange(updated);
    setBulkInput('');
    setShowBulk(false);
    toast.success(toAdd.length + ' image(s) added.');
  };

  const addRow = () => {
    if (images.length >= 6) { toast.error('Maximum 6 images allowed.'); return; }
    onChange([...images, { url: '', alt: '', isPrimary: false }]);
  };

  const removeRow = (i) => {
    const updated = images.filter((_, idx) => idx !== i);
    if (images[i].isPrimary && updated.length > 0) updated[0].isPrimary = true;
    onChange(updated.length > 0 ? updated : [{ url: '', alt: '', isPrimary: true }]);
  };

  const updateRow = (i, field, val) => {
    onChange(images.map((img, idx) => idx === i ? { ...img, [field]: val } : img));
  };

  const setPrimary = (i) => {
    onChange(images.map((img, idx) => ({ ...img, isPrimary: idx === i })));
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const u = [...images];
    [u[i - 1], u[i]] = [u[i], u[i - 1]];
    onChange(u);
  };

  const moveDown = (i) => {
    if (i === images.length - 1) return;
    const u = [...images];
    [u[i], u[i + 1]] = [u[i + 1], u[i]];
    onChange(u);
  };

  const validImages = images.filter(img => img.url.trim());

  return (
    <div className={imgStyles.manager}>
      {/* Header */}
      <div className={imgStyles.header}>
        <label className="form-label" style={{ margin: 0 }}>
          Product Images
          <span className={imgStyles.count}>{validImages.length} / 6</span>
        </label>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowBulk(!showBulk)}>
            <ImagePlus size={13} /> Paste Multiple
          </button>
          {images.length < 6 && (
            <button type="button" className="btn btn-outline btn-sm" onClick={addRow}>
              <Plus size={13} /> Add Row
            </button>
          )}
        </div>
      </div>

      {/* Bulk paste panel */}
      {showBulk && (
        <div className={imgStyles.bulkPanel}>
          <p className={imgStyles.bulkHint}>
            Paste multiple image URLs separated by commas or new lines (max 6 total):
          </p>
          <textarea
            className="form-input"
            rows={4}
            placeholder={'https://example.com/img1.jpg,\nhttps://example.com/img2.jpg,\nhttps://example.com/img3.jpg'}
            value={bulkInput}
            onChange={e => setBulkInput(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowBulk(false); setBulkInput(''); }}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleBulkAdd}>
              Add Images
            </button>
          </div>
        </div>
      )}

      {/* Live preview strip */}
      {validImages.length > 0 && (
        <div className={imgStyles.previews}>
          {validImages.map((img, i) => (
            <div key={i} className={`${imgStyles.preview} ${img.isPrimary ? imgStyles.previewPrimary : ''}`}>
              <img
                src={img.url}
                alt={img.alt || 'preview'}
                onError={e => { e.target.src = 'https://placehold.co/80x100?text=ERR'; }}
              />
              {img.isPrimary && <span className={imgStyles.primaryBadge}>Primary</span>}
            </div>
          ))}
        </div>
      )}

      {/* Individual rows */}
      <div className={imgStyles.rows}>
        {images.map((img, i) => (
          <div key={i} className={imgStyles.row}>
            {/* Thumb */}
            <div className={imgStyles.thumb}>
              {img.url ? (
                <img
                  src={img.url}
                  alt="thumb"
                  onError={e => { e.target.src = 'https://placehold.co/48x60?text=ERR'; }}
                />
              ) : (
                <div className={imgStyles.thumbEmpty}>
                  <ImagePlus size={16} />
                </div>
              )}
            </div>

            {/* Inputs */}
            <div className={imgStyles.inputs}>
              <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center' }}>
                <span className={imgStyles.imgNum}>{i + 1}</span>
                <input
                  className="form-input"
                  placeholder="Image URL (https://...)"
                  value={img.url}
                  onChange={e => updateRow(i, 'url', e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <input
                className="form-input"
                placeholder="Alt text (optional — e.g. 'Red polo front view')"
                value={img.alt}
                onChange={e => updateRow(i, 'alt', e.target.value)}
                style={{ marginTop: '.35rem', fontSize: '.82rem' }}
              />
            </div>

            {/* Controls */}
            <div className={imgStyles.controls}>
              <button
                type="button"
                className={`${imgStyles.ctrlBtn} ${img.isPrimary ? imgStyles.ctrlStar : ''}`}
                onClick={() => setPrimary(i)}
                title={img.isPrimary ? 'Primary image' : 'Set as primary'}
              >
                <Star size={12} fill={img.isPrimary ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button" className={imgStyles.ctrlBtn}
                onClick={() => moveUp(i)} disabled={i === 0} title="Move up"
              >
                <MoveUp size={12} />
              </button>
              <button
                type="button" className={imgStyles.ctrlBtn}
                onClick={() => moveDown(i)} disabled={i === images.length - 1} title="Move down"
              >
                <MoveDown size={12} />
              </button>
              <button
                type="button"
                className={`${imgStyles.ctrlBtn} ${imgStyles.ctrlDelete}`}
                onClick={() => removeRow(i)}
                title="Remove"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className={imgStyles.hint}>
        ⭐ = primary (shown in listing cards) · reorder with arrows · max 6 images per product
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [products,   setProducts]   = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getProducts({ page, limit: 10, ...(search && { search }) });
      setProducts(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name:            p.name,
      description:     p.description,
      price:           p.price,
      discountedPrice: p.discountedPrice || '',
      category:        p.category,
      brand:           p.brand || '',
      isFeatured:      p.isFeatured,
      sizes:           p.sizes?.length  ? p.sizes  : EMPTY_FORM.sizes,
      images:          p.images?.length ? p.images : EMPTY_FORM.images,
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validImages = form.images.filter(img => img.url.trim());
    if (validImages.length === 0) { toast.error('Add at least one image URL.'); return; }
    if (!validImages.some(img => img.isPrimary)) validImages[0].isPrimary = true;

    setSaving(true);
    try {
      const payload = {
        ...form,
        price:           parseFloat(form.price),
        discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : null,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
        sizes:           form.sizes.map(s => ({ ...s, stock: parseInt(s.stock) })),
        images:          validImages,
      };
      if (editing) {
        await productAPI.update(editing._id, payload);
        toast.success('Product updated!');
      } else {
        await productAPI.create(payload);
        toast.success('Product created!');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await productAPI.delete(id); toast.success('Deleted.'); load(); }
    catch { toast.error('Delete failed.'); }
  };

  const updateSize = (i, field, val) => {
    const s = [...form.sizes]; s[i] = { ...s[i], [field]: val };
    setForm(f => ({ ...f, sizes: s }));
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.sub}>{pagination.total ?? products.length} products</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className="form-input" style={{ paddingLeft: '2.25rem' }}
            placeholder="Search products…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? <Spinner center /> : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Category</th><th>Price</th>
                  <th>Cost / Margin</th>
                  <th>Images</th><th>Stock</th><th>Featured</th>
                  <th>Status</th><th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const stock = p.sizes?.reduce((s, i) => s + i.stock, 0) ?? 0;
                  return (
                    <tr key={p._id}>
                      <td>
                        <div className={styles.productCell}>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {(p.images || []).slice(0, 3).map((im, idx) => (
                              <img key={idx} src={im.url}
                                className={styles.productImg}
                                style={{ border: im.isPrimary ? '2px solid var(--accent)' : '2px solid transparent' }}
                                onError={e => { e.target.src = 'https://placehold.co/44x55?text=?'; }}
                                alt=""
                              />
                            ))}
                            {(p.images?.length || 0) > 3 && (
                              <div style={{ width:44,height:55,borderRadius:6,background:'var(--surface)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem',color:'var(--muted)',fontWeight:700 }}>
                                +{p.images.length - 3}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={styles.productName}>{p.name}</p>
                            <p className={styles.productBrand}>{p.brand || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-neutral">{p.category}</span></td>
                      <td>
                        <p style={{ fontWeight: 700 }}>{formatPrice(p.discountedPrice ?? p.price)}</p>
                        {p.discountedPrice && <p style={{ fontSize:'.78rem',color:'var(--muted)',textDecoration:'line-through' }}>{formatPrice(p.price)}</p>}
                      </td>
                      <td>
                        <span className="badge badge-neutral">{p.images?.length || 0} imgs</span>
                      </td>
                      <td>
                        <span className={`badge ${stock===0?'badge-danger':stock<5?'badge-warning':'badge-success'}`}>
                          {stock} units
                        </span>
                      </td>
                      <td>{p.isFeatured ? <ToggleRight size={20} color="var(--success)" /> : <ToggleLeft size={20} color="var(--muted)" />}</td>
                      <td><span className={`badge ${p.isActive?'badge-success':'badge-danger'}`}>{p.isActive?'Active':'Inactive'}</span></td>
                      <td>
                        <div className={styles.actions}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Pencil size={14} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p._id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </>
      )}

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSave} className={styles.modalForm}>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input className="form-input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-input" rows={3} required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Price (₹) *</label>
              <input className="form-input" type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Discounted Price (₹)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.discountedPrice} onChange={e => setForm(f => ({ ...f, discountedPrice: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Cost Price (₹) <span style={{fontSize:'.75rem',color:'var(--muted)'}}>Admin only</span></label>
              <input
                className="form-input" type="number" min="0" step="0.01"
                placeholder="Your purchase cost"
                value={form.costPrice}
                onChange={(e) => setForm(f => ({ ...f, costPrice: e.target.value }))}
              />
              {form.costPrice && form.price && (
                <p className="form-hint" style={{color: parseFloat(form.price) > parseFloat(form.costPrice) ? 'var(--success)' : 'var(--danger)'}}>
                  {parseFloat(form.price) > parseFloat(form.costPrice)
                    ? 'Profit: ' + Math.round(((parseFloat(form.discountedPrice || form.price) - parseFloat(form.costPrice)) / parseFloat(form.discountedPrice || form.price)) * 100) + '% margin'
                    : '⚠️ Selling below cost price!'}
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* ── Multi-image manager ── */}
          <ImageManager
            images={form.images}
            onChange={imgs => setForm(f => ({ ...f, images: imgs }))}
          />

          {/* ── Sizes ── */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.5rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Sizes & Stock</label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, sizes: [...f.sizes, { size: '', stock: 0 }] }))}>
                <Plus size={13} /> Add Size
              </button>
            </div>
            {form.sizes.map((s, i) => (
              <div key={i} className={styles.sizeRow}>
                <input className="form-input" placeholder="Size" style={{ flex: .7 }} value={s.size} onChange={e => updateSize(i, 'size', e.target.value)} />
                <input className="form-input" type="number" placeholder="Stock" style={{ flex: .5 }} value={s.stock} onChange={e => updateSize(i, 'stock', e.target.value)} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }))} disabled={form.sizes.length === 1} style={{ color: 'var(--danger)' }}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>

          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.isFeatured} onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))} />
            Featured product (shown on homepage)
          </label>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update Product' : 'Create Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}