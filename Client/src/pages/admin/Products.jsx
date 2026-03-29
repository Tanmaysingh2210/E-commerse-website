import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Spinner from '../../components/common/Spinner';
import { productAPI } from '../../api/products';
import { formatPrice, primaryImage } from '../../utils/helpers';
import styles from './AdminTable.module.css';

const EMPTY_FORM = { name:'', description:'', price:'', discountedPrice:'', category:'men', brand:'', isFeatured:false, sizes:[{size:'S',stock:10},{size:'M',stock:10},{size:'L',stock:10}], images:[{url:'',alt:'',isPrimary:true}] };
const CATEGORIES = ['men','women','kids','accessories','footwear','outerwear','activewear','formals','ethnic','others'];

export default function AdminProducts() {
  const [products,  setProducts]  = useState([]);
  const [pagination,setPagination]= useState({ totalPages:1 });
  const [page,      setPage]      = useState(1);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productAPI.getAll({ page, limit: 10, ...(search && { search }) });
      setProducts(data.data);
      setPagination(data.pagination);
    } catch {}
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit   = (p) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description, price: p.price,
      discountedPrice: p.discountedPrice || '', category: p.category,
      brand: p.brand || '', isFeatured: p.isFeatured,
      sizes: p.sizes?.length ? p.sizes : EMPTY_FORM.sizes,
      images: p.images?.length ? p.images : EMPTY_FORM.images,
    });
    setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        discountedPrice: form.discountedPrice ? parseFloat(form.discountedPrice) : null,
        sizes: form.sizes.map((s) => ({ ...s, stock: parseInt(s.stock) })),
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
    try {
      await productAPI.delete(id);
      toast.success('Product deleted.');
      load();
    } catch { toast.error('Delete failed.'); }
  };

  const updateSize = (i, field, val) => {
    const s = [...form.sizes];
    s[i] = { ...s[i], [field]: val };
    setForm((f) => ({ ...f, sizes: s }));
  };
  const addSize    = () => setForm((f) => ({ ...f, sizes: [...f.sizes, { size: '', stock: 0 }] }));
  const removeSize = (i) => setForm((f) => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }));

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

      {/* Search */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input className="form-input" style={{ paddingLeft: '2.25rem' }}
            placeholder="Search products…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {loading ? <Spinner center /> : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Featured</th><th>Status</th><th style={{width:100}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const img   = primaryImage(p.images);
                  const stock = p.sizes?.reduce((s,i)=>s+i.stock,0) ?? 0;
                  return (
                    <tr key={p._id}>
                      <td>
                        <div className={styles.productCell}>
                          <img src={img} alt={p.name} className={styles.productImg}
                            onError={(e)=>{e.target.src='https://placehold.co/44x55?text=?';}} />
                          <div>
                            <p className={styles.productName}>{p.name}</p>
                            <p className={styles.productBrand}>{p.brand || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-neutral">{p.category}</span></td>
                      <td>
                        <p style={{fontWeight:700}}>{formatPrice(p.discountedPrice ?? p.price)}</p>
                        {p.discountedPrice && <p style={{fontSize:'.78rem',color:'var(--muted)',textDecoration:'line-through'}}>{formatPrice(p.price)}</p>}
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
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit"><Pencil size={14} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p._id)} title="Delete" style={{color:'var(--danger)'}}><Trash2 size={14} /></button>
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

      {/* Create/Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSave} className={styles.modalForm}>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" required value={form.name} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input className="form-input" value={form.brand} onChange={(e)=>setForm(f=>({...f,brand:e.target.value}))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="form-input" rows={3} required value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Price (₹) *</label>
              <input className="form-input" type="number" min="0" step="0.01" required value={form.price} onChange={(e)=>setForm(f=>({...f,price:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Discounted Price (₹)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.discountedPrice} onChange={(e)=>setForm(f=>({...f,discountedPrice:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-select" required value={form.category} onChange={(e)=>setForm(f=>({...f,category:e.target.value}))}>
                {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div className="form-group">
            <label className="form-label">Primary Image URL</label>
            <input className="form-input" placeholder="https://…" value={form.images[0]?.url || ''} onChange={(e)=>{const imgs=[...form.images];imgs[0]={...imgs[0],url:e.target.value};setForm(f=>({...f,images:imgs}));}} />
          </div>

          {/* Sizes */}
          <div>
            <label className="form-label" style={{display:'flex',justifyContent:'space-between'}}>
              Sizes & Stock
              <button type="button" className="btn btn-ghost btn-sm" onClick={addSize}><Plus size={13}/> Add Size</button>
            </label>
            {form.sizes.map((s,i)=>(
              <div key={i} className={styles.sizeRow}>
                <input className="form-input" placeholder="Size" style={{flex:.6}} value={s.size} onChange={(e)=>updateSize(i,'size',e.target.value)} />
                <input className="form-input" type="number" placeholder="Stock" style={{flex:.6}} value={s.stock} onChange={(e)=>updateSize(i,'stock',e.target.value)} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={()=>removeSize(i)} style={{color:'var(--danger)'}}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>

          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.isFeatured} onChange={(e)=>setForm(f=>({...f,isFeatured:e.target.checked}))} />
            Featured product
          </label>

          <div className={styles.modalFooter}>
            <button type="button" className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':editing?'Update Product':'Create Product'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}