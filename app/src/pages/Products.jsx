import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Products.css';

const UOM_OPTIONS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'carton', 'case', 'bag', 'bottle', 'set'];

const EMPTY_FORM = {
  sku: '', name: '', description: '', category_id: '', uom: 'pcs',
  weight_kg: '', tenant_id: '',
  is_batch_tracked: false, is_expiry_tracked: false, is_serialized: false,
};

function SkeletonRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i}>
      <td><span className="skeleton" style={{ width: 80,  height: 12, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 150, height: 14, display: 'block', marginBottom: 4 }} /><span className="skeleton" style={{ width: 110, height: 10, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 80,  height: 20, display: 'block', borderRadius: 999 }} /></td>
      <td><span className="skeleton" style={{ width: 40,  height: 20, display: 'block', borderRadius: 999 }} /></td>
      <td><span className="skeleton" style={{ width: 100, height: 20, display: 'block', borderRadius: 999 }} /></td>
    </tr>
  ));
}

export default function Products() {
  const navigate = useNavigate();

  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [tenants, setTenants]       = useState([]);
  const [loading, setLoading]       = useState(true);

  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterTenant, setFilterTenant] = useState('');

  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [fieldErr, setFieldErr]     = useState({});
  const [deletingId, setDeletingId] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/products').then(r => r?.data ?? []).catch(() => []),
      api.get('/categories').then(r => r?.data ?? []).catch(() => []),
      api.get('/tenants').then(r => r?.data ?? []).catch(() => []),
    ]).then(([prods, cats, tens]) => {
      setProducts(prods);
      setCategories(cats);
      setTenants(tens);
      setLoading(false);
    });
  }

  useEffect(load, []);

  const catMap    = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c.name])), [categories]);
  const tenantMap = useMemo(() => Object.fromEntries(tenants.map(t => [t.id, t.name])),    [tenants]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const matchCat    = !filterCat    || p.category_id === filterCat;
      const matchTenant = !filterTenant || p.tenant_id   === filterTenant;
      return matchSearch && matchCat && matchTenant;
    });
  }, [products, search, filterCat, filterTenant]);

  function openForm()  { setForm(EMPTY_FORM); setFormError(''); setFieldErr({}); setShowForm(true); }
  function closeForm() { setShowForm(false); setFormError(''); }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setFieldErr(fe => ({ ...fe, [name]: '' }));
  }

  async function handleDelete(p, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setDeletingId(p.id);
    try {
      await api.delete(`/products/${p.id}`);
      load();
    } catch (err) {
      alert(err.message || 'Could not delete product.');
    } finally {
      setDeletingId(null);
    }
  }

  function validate() {
    const errs = {};
    if (!form.sku.trim())  errs.sku  = 'SKU is required';
    if (!form.name.trim()) errs.name = 'Name is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErr(errs); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        sku:              form.sku.trim().toUpperCase(),
        name:             form.name.trim(),
        uom:              form.uom,
        is_batch_tracked:  form.is_batch_tracked,
        is_expiry_tracked: form.is_expiry_tracked,
        is_serialized:     form.is_serialized,
      };
      if (form.description)  payload.description  = form.description.trim();
      if (form.category_id)  payload.category_id  = form.category_id;
      if (form.weight_kg)    payload.weight_kg     = parseFloat(form.weight_kg);
      if (form.tenant_id)    payload.tenant_id     = form.tenant_id;
      await api.post('/products', payload);
      closeForm();
      load();
    } catch (err) {
      setFormError(err.message || 'Could not save product.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Product catalogue — SKUs stored across your warehouses</p>
        </div>
        <button className="btn btn-primary" onClick={openForm}>+ Add Product</button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          className="form-input filter-search"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="form-select" value={filterTenant} onChange={e => setFilterTenant(e.target.value)}>
          <option value="">All Tenants</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {(search || filterCat || filterTenant) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterCat(''); setFilterTenant(''); }}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>UOM</th>
                <th>Tracking</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <div style={{ fontSize: '2rem', opacity: 0.2 }}>◈</div>
                      <div>{products.length === 0 ? 'No products yet' : 'No products match your filter'}</div>
                      {products.length === 0 && (
                        <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={openForm}>+ Add Product</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${p.id}`)}>
                    <td><span className="product-sku-cell">{p.sku}</span></td>
                    <td>
                      <div className="product-name-cell">{p.name}</div>
                      {p.description && <div className="product-desc-cell">{p.description}</div>}
                    </td>
                    <td>
                      {p.category_id
                        ? <span className="badge badge-navy">{catMap[p.category_id] ?? 'Unknown'}</span>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td><span className="badge badge-muted">{p.uom}</span></td>
                    <td>
                      <div className="tracking-flags">
                        {p.is_batch_tracked  && <span className="badge badge-muted">Batch</span>}
                        {p.is_expiry_tracked && <span className="badge badge-amber">Expiry</span>}
                        {p.is_serialized     && <span className="badge badge-green">Serial</span>}
                        {!p.is_batch_tracked && !p.is_expiry_tracked && !p.is_serialized && <span className="text-muted text-sm">—</span>}
                      </div>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="btn btn-danger btn-sm"
                        disabled={deletingId === p.id}
                        onClick={e => handleDelete(p, e)}>
                        {deletingId === p.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product slide-over */}
      {showForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="slideover" style={{ width: 480 }}>
            <div className="slideover-header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>Add Product</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">SKU *</label>
                  <input className="form-input mono" name="sku" value={form.sku} onChange={handleChange}
                    placeholder="e.g. NES-MAGI-200G" style={{ textTransform: 'uppercase' }} />
                  {fieldErr.sku && <span className="text-red text-sm">{fieldErr.sku}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">UOM</label>
                  <select className="form-select" name="uom" value={form.uom} onChange={handleChange}>
                    {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-input" name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Maggi Noodles 200g" />
                {fieldErr.name && <span className="text-red text-sm">{fieldErr.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Description <span className="text-muted">(optional)</span></label>
                <textarea className="form-textarea" name="description" value={form.description}
                  onChange={handleChange} placeholder="Brief description of the product…" rows={2} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" name="category_id" value={form.category_id} onChange={handleChange}>
                    <option value="">No category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg) <span className="text-muted">(optional)</span></label>
                  <input className="form-input" name="weight_kg" type="number" step="0.001" min="0"
                    value={form.weight_kg} onChange={handleChange} placeholder="0.200" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tenant <span className="text-muted">(optional)</span></label>
                <select className="form-select" name="tenant_id" value={form.tenant_id} onChange={handleChange}>
                  <option value="">Unassigned</option>
                  {tenants.length === 0
                    ? <option disabled>No tenants — add from Tenants page</option>
                    : tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tracking</label>
                <div className="checkbox-group">
                  {[
                    { name: 'is_batch_tracked',  label: 'Batch tracked — track by batch/lot number' },
                    { name: 'is_expiry_tracked', label: 'Expiry tracked — track best-before date' },
                    { name: 'is_serialized',     label: 'Serialized — each unit has a unique serial' },
                  ].map(({ name, label }) => (
                    <label key={name} className="checkbox-row">
                      <input type="checkbox" name={name} checked={form[name]} onChange={handleChange}
                        style={{ width: 15, height: 15, accentColor: 'var(--amber)' }} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formError && (
                <div style={{ background: 'rgba(232,107,90,0.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : 'Add Product'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
