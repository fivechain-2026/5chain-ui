import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Tenants.css';

function validateGSTIN(v) {
  return !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.toUpperCase());
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function SkeletonRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i}>
      <td><span className="skeleton" style={{ width: 140, height: 14, display: 'block', marginBottom: 4 }} /><span className="skeleton" style={{ width: 110, height: 10, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 120, height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 150, height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 80,  height: 14, display: 'block' }} /></td>
    </tr>
  ));
}

const EMPTY_FORM = { name: '', gstin: '', contact_email: '', contact_phone: '' };

export default function Tenants() {
  const navigate = useNavigate();
  const [tenants, setTenants]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErr, setFieldErr]   = useState({});

  function load() {
    setLoading(true);
    api.get('/tenants')
      .then(res => setTenants(res?.data ?? []))
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openForm() { setForm(EMPTY_FORM); setFormError(''); setFieldErr({}); setShowForm(true); }
  function closeForm() { setShowForm(false); setFormError(''); }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setFieldErr(fe => ({ ...fe, [name]: '' }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim())          errs.name          = 'Name is required';
    if (!form.contact_email.trim()) errs.contact_email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.contact_email)) errs.contact_email = 'Invalid email';
    if (form.gstin && !validateGSTIN(form.gstin)) errs.gstin = 'Invalid GSTIN format (15 characters)';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErr(errs); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = { name: form.name.trim(), contact_email: form.contact_email.trim() };
      if (form.gstin)         payload.gstin         = form.gstin.toUpperCase().trim();
      if (form.contact_phone) payload.contact_phone = form.contact_phone.trim();
      await api.post('/tenants', payload);
      closeForm();
      load();
    } catch (err) {
      setFormError(err.status === 404 || err.status === 401
        ? 'Backend not yet available — tenant endpoint coming soon.'
        : err.message || 'Could not save tenant.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="page-subtitle">Client companies whose goods are stored in your warehouses</p>
        </div>
        <button className="btn btn-primary" onClick={openForm}>+ Add Tenant</button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>GSTIN</th>
                <th>Contact Email</th>
                <th>Onboarded</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <div style={{ fontSize: '2rem', opacity: 0.2 }}>◫</div>
                      <div>No tenants onboarded yet</div>
                      <div className="text-sm">Add your first client to get started</div>
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={openForm}>+ Add Tenant</button>
                    </div>
                  </td>
                </tr>
              ) : (
                tenants.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/tenants/${t.id}`)}>
                    <td>
                      <div className="tenant-meta">
                        <span className="tenant-name">{t.name}</span>
                        {t.contact_phone && <span className="tenant-email">{t.contact_phone}</span>}
                      </div>
                    </td>
                    <td>
                      {t.gstin
                        ? <span className="badge badge-navy gstin-badge">{t.gstin}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-sm">{t.contact_email || <span className="text-muted">—</span>}</td>
                    <td className="text-muted text-sm">{formatDate(t.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over */}
      {showForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="slideover">
            <div className="slideover-header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>Add Tenant</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input className="form-input" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Nestlé India Ltd" />
                {fieldErr.name && <span className="text-red text-sm">{fieldErr.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN <span className="text-muted">(optional)</span></label>
                <input className="form-input mono" name="gstin" value={form.gstin} onChange={handleChange} placeholder="22AAAAA0000A1Z5" maxLength={15} style={{ textTransform: 'uppercase' }} />
                {fieldErr.gstin && <span className="text-red text-sm">{fieldErr.gstin}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email *</label>
                <input className="form-input" name="contact_email" type="email" value={form.contact_email} onChange={handleChange} placeholder="accounts@company.com" />
                {fieldErr.contact_email && <span className="text-red text-sm">{fieldErr.contact_email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone <span className="text-muted">(optional)</span></label>
                <input className="form-input" name="contact_phone" value={form.contact_phone} onChange={handleChange} placeholder="+91 98765 43210" />
              </div>

              {formError && (
                <div style={{ background: 'rgba(232,107,90,0.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : 'Add Tenant'}
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
