import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Products.css';

const UOM_OPTIONS = ['pcs', 'kg', 'g', 'litre', 'ml', 'box', 'carton', 'case', 'bag', 'bottle', 'set'];
const TAG_TYPES   = ['barcode', 'rfid', 'qrcode'];

function Field({ label, value }) {
  return (
    <div className="detail-field">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value ?? <span className="text-muted">—</span>}</span>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct]       = useState(null);
  const [categories, setCategories] = useState([]);
  const [tenants, setTenants]       = useState([]);
  const [tags, setTags]             = useState([]);
  const [loading, setLoading]       = useState(true);

  const [editing, setEditing]       = useState(false);
  const [editForm, setEditForm]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [editError, setEditError]   = useState('');

  const [tagForm, setTagForm]       = useState({ tag_type: 'barcode', tag_value: '' });
  const [addingTag, setAddingTag]   = useState(false);
  const [tagError, setTagError]     = useState('');
  const [deleting, setDeleting]     = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/products/${id}`).then(r => r?.data ?? r).catch(() => null),
      api.get('/categories').then(r => r?.data ?? []).catch(() => []),
      api.get('/tenants').then(r => r?.data ?? []).catch(() => []),
    ]).then(([prod, cats, tens]) => {
      setProduct(prod);
      setCategories(cats);
      setTenants(tens);
      if (prod) setEditForm({
        name:             prod.name,
        description:      prod.description ?? '',
        category_id:      prod.category_id ?? '',
        uom:              prod.uom,
        weight_kg:        prod.weight_kg ?? '',
        tenant_id:        prod.tenant_id ?? '',
        is_batch_tracked:  prod.is_batch_tracked,
        is_expiry_tracked: prod.is_expiry_tracked,
        is_serialized:     prod.is_serialized,
      });
      setLoading(false);
    });
  }, [id]);

  // Tags are part of the product object if backend returns them, else we'll try a separate call
  useEffect(() => {
    if (product?.tags) { setTags(product.tags); return; }
    // Some backends include tags in product response; if not, no separate endpoint exists currently
    setTags([]);
  }, [product]);

  const catMap    = Object.fromEntries(categories.map(c => [c.id, c.name]));
  const tenantMap = Object.fromEntries(tenants.map(t => [t.id, t.name]));

  function handleEditChange(e) {
    const { name, value, type, checked } = e.target;
    setEditForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editForm.name?.trim()) return;
    setSaving(true); setEditError('');
    try {
      const payload = {
        name:              editForm.name.trim(),
        uom:               editForm.uom,
        is_batch_tracked:  editForm.is_batch_tracked,
        is_expiry_tracked: editForm.is_expiry_tracked,
        is_serialized:     editForm.is_serialized,
      };
      if (editForm.description)  payload.description  = editForm.description.trim();
      if (editForm.category_id)  payload.category_id  = editForm.category_id;
      if (editForm.weight_kg)    payload.weight_kg     = parseFloat(editForm.weight_kg);
      if (editForm.tenant_id)    payload.tenant_id     = editForm.tenant_id;
      const res = await api.put(`/products/${id}`, payload);
      setProduct(res?.data ?? res);
      setEditing(false);
    } catch (err) {
      setEditError(err.message || 'Could not update product.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/products/${id}`);
      navigate('/products');
    } catch (err) {
      alert(err.message || 'Could not delete product.');
      setDeleting(false);
    }
  }

  async function addTag(e) {
    e.preventDefault();
    if (!tagForm.tag_value.trim()) return;
    setAddingTag(true); setTagError('');
    try {
      await api.post(`/products/${id}/tags`, {
        tag_type:  tagForm.tag_type,
        tag_value: tagForm.tag_value.trim(),
      });
      setTags(prev => [...prev, { id: Date.now(), tag_type: tagForm.tag_type, tag_value: tagForm.tag_value.trim() }]);
      setTagForm(f => ({ ...f, tag_value: '' }));
    } catch (err) {
      setTagError(err.message || 'Could not add tag.');
    } finally {
      setAddingTag(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <span className="skeleton" style={{ width: 220, height: 28 }} />
        </div>
        <div className="product-detail-grid">
          <div className="card" style={{ padding: '1.25rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="detail-field">
                <span className="skeleton" style={{ width: 60, height: 9, display: 'block', marginBottom: 6 }} />
                <span className="skeleton" style={{ width: 140, height: 14, display: 'block' }} />
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span className="skeleton" style={{ width: 80, height: 12, display: 'block', marginBottom: 12 }} />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="tag-row">
                <span className="skeleton" style={{ width: 140, height: 14, display: 'block' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>← Products</button>
        <div className="card" style={{ marginTop: '1rem', padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Product not found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>← Products</button>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{product.name}</h1>
            <span className="product-sku-cell" style={{ marginTop: 2, display: 'block' }}>{product.sku}</span>
          </div>
        </div>
        {!editing && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={deleteProduct} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      <div className="product-detail-grid">
        {/* Details card */}
        <div className="card" style={{ padding: '1.25rem' }}>
          {editing ? (
            <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" name="name" value={editForm.name} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" name="description" value={editForm.description} onChange={handleEditChange} rows={2} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">UOM</label>
                  <select className="form-select" name="uom" value={editForm.uom} onChange={handleEditChange}>
                    {UOM_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input className="form-input" name="weight_kg" type="number" step="0.001" min="0" value={editForm.weight_kg} onChange={handleEditChange} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" name="category_id" value={editForm.category_id} onChange={handleEditChange}>
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tenant</label>
                  <select className="form-select" name="tenant_id" value={editForm.tenant_id} onChange={handleEditChange}>
                    <option value="">Unassigned</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Tracking</label>
                <div className="checkbox-group">
                  {[
                    { name: 'is_batch_tracked',  label: 'Batch tracked' },
                    { name: 'is_expiry_tracked', label: 'Expiry tracked' },
                    { name: 'is_serialized',     label: 'Serialized' },
                  ].map(({ name, label }) => (
                    <label key={name} className="checkbox-row">
                      <input type="checkbox" name={name} checked={editForm[name]} onChange={handleEditChange}
                        style={{ width: 15, height: 15, accentColor: 'var(--amber)' }} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {editError && <div style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{editError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <Field label="SKU"         value={<span className="product-sku-cell">{product.sku}</span>} />
              <Field label="Name"        value={product.name} />
              <Field label="Description" value={product.description} />
              <Field label="Category"    value={product.category_id ? catMap[product.category_id] ?? 'Unknown' : null} />
              <Field label="Tenant"      value={product.tenant_id   ? tenantMap[product.tenant_id] ?? 'Unknown' : null} />
              <Field label="UOM"         value={<span className="badge badge-muted">{product.uom}</span>} />
              <Field label="Weight"      value={product.weight_kg ? `${product.weight_kg} kg` : null} />
              <div className="detail-field">
                <span className="detail-label">Tracking Flags</span>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                  {product.is_batch_tracked  && <span className="badge badge-muted">Batch</span>}
                  {product.is_expiry_tracked && <span className="badge badge-amber">Expiry</span>}
                  {product.is_serialized     && <span className="badge badge-green">Serial</span>}
                  {!product.is_batch_tracked && !product.is_expiry_tracked && !product.is_serialized
                    && <span className="text-muted text-sm">None</span>}
                </div>
              </div>
              <Field label="Created" value={product.created_at ? new Date(product.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
            </>
          )}
        </div>

        {/* Tags card */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
              Barcodes &amp; Tags
            </span>
          </div>

          {tags.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>No tags attached yet</div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              {tags.map((tag, i) => (
                <div key={tag.id ?? i} className="tag-row">
                  <div>
                    <div className="tag-value">{tag.tag_value}</div>
                  </div>
                  <span className={`badge tag-type-badge ${tag.tag_type === 'rfid' ? 'badge-green' : tag.tag_type === 'qrcode' ? 'badge-amber' : 'badge-navy'}`}>
                    {tag.tag_type}
                  </span>
                </div>
              ))}
            </div>
          )}

          <hr className="divider" />

          <form onSubmit={addTag} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Tag Type</label>
              <select className="form-select" value={tagForm.tag_type} onChange={e => setTagForm(f => ({ ...f, tag_type: e.target.value }))}>
                {TAG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tag Value</label>
              <input className="form-input mono" value={tagForm.tag_value}
                onChange={e => setTagForm(f => ({ ...f, tag_value: e.target.value }))}
                placeholder="Scan or enter barcode…" />
            </div>
            {tagError && <div style={{ color: 'var(--red)', fontSize: '0.82rem' }}>{tagError}</div>}
            <button type="submit" className="btn btn-secondary w-full" disabled={addingTag || !tagForm.tag_value.trim()}>
              {addingTag ? 'Adding…' : '+ Add Tag'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
