import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Warehouses.css';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SkeletonRows() {
  return Array.from({ length: 3 }).map((_, i) => (
    <tr key={i}>
      <td><span className="skeleton" style={{ width: 160, height: 14, display: 'block', marginBottom: 5 }} /><span className="skeleton" style={{ width: 110, height: 10, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 80,  height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 60,  height: 14, display: 'block' }} /></td>
    </tr>
  ));
}

const EMPTY_FORM = { name: '', city: '', state: '', country: 'India' };

export default function Warehouses() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [fieldErr, setFieldErr]     = useState({});

  function load() {
    setLoading(true);
    api.get('/warehouses')
      .then(res => setWarehouses(res?.data ?? []))
      .catch(() => setWarehouses([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openForm()  { setForm(EMPTY_FORM); setFormError(''); setFieldErr({}); setShowForm(true); }
  function closeForm() { setShowForm(false); setFormError(''); }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setFieldErr(fe => ({ ...fe, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { setFieldErr({ name: 'Name is required' }); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = { name: form.name.trim() };
      if (form.city)    payload.city    = form.city.trim();
      if (form.state)   payload.state   = form.state.trim();
      if (form.country) payload.country = form.country.trim();
      await api.post('/warehouses', payload);
      closeForm();
      load();
    } catch (err) {
      setFormError(err.message || 'Could not save warehouse.');
    } finally {
      setSaving(false);
    }
  }

  function locationLabel(wh) {
    return [wh.city, wh.state, wh.country].filter(Boolean).join(', ') || '—';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Warehouses</h1>
          <p className="page-subtitle">Physical storage facilities managed by your organisation</p>
        </div>
        <button className="btn btn-primary" onClick={openForm}>+ Add Warehouse</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Location</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">
                      <div style={{ fontSize: '2rem', opacity: 0.2 }}>⊞</div>
                      <div>No warehouses yet</div>
                      <div className="text-sm">Add your first warehouse facility</div>
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={openForm}>+ Add Warehouse</button>
                    </div>
                  </td>
                </tr>
              ) : (
                warehouses.map(wh => (
                  <tr key={wh.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/warehouses/${wh.id}`)}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--white)' }}>{wh.name}</div>
                      {(wh.city || wh.state) && (
                        <div className="wh-location-tag">
                          <span>⊙</span>{[wh.city, wh.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="text-sm text-muted">{[wh.city, wh.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="text-sm text-muted">{wh.country || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="slideover">
            <div className="slideover-header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>Add Warehouse</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Warehouse Name *</label>
                <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Bengaluru Central Hub" />
                {fieldErr.name && <span className="text-red text-sm">{fieldErr.name}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" name="city" value={form.city} onChange={handleChange} placeholder="Bengaluru" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" name="state" value={form.state} onChange={handleChange} placeholder="Karnataka" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" name="country" value={form.country} onChange={handleChange} placeholder="India" />
              </div>

              {formError && (
                <div style={{ background: 'rgba(232,107,90,0.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : 'Add Warehouse'}
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
