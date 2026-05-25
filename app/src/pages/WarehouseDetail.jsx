import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Warehouses.css';

function SkeletonRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i}>
      <td><span className="skeleton" style={{ width: 100, height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 70,  height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 40,  height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 40,  height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 40,  height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 40,  height: 14, display: 'block' }} /></td>
      <td><span className="skeleton" style={{ width: 50,  height: 22, display: 'block', borderRadius: 999 }} /></td>
    </tr>
  ));
}

const EMPTY_LOC = { code: '', zone_code: '', aisle: '', rack: '', shelf: '', bin: '', is_active: true };

export default function WarehouseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [warehouse, setWarehouse]   = useState(null);
  const [whLoading, setWhLoading]   = useState(true);
  const [locations, setLocations]   = useState([]);
  const [locLoading, setLocLoading] = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_LOC);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [fieldErr, setFieldErr]     = useState({});

  useEffect(() => {
    api.get(`/warehouses/${id}`)
      .then(res => { setWarehouse(res?.data ?? res); setWhLoading(false); })
      .catch(() => setWhLoading(false));
  }, [id]);

  function loadLocations() {
    setLocLoading(true);
    api.get(`/warehouses/${id}/locations`)
      .then(res => setLocations(res?.data ?? []))
      .catch(() => setLocations([]))
      .finally(() => setLocLoading(false));
  }

  useEffect(loadLocations, [id]);

  function openForm()  { setForm(EMPTY_LOC); setFormError(''); setFieldErr({}); setShowForm(true); }
  function closeForm() { setShowForm(false); setFormError(''); }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setFieldErr(fe => ({ ...fe, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code.trim()) { setFieldErr({ code: 'Location code is required' }); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        code:      form.code.trim().toUpperCase(),
        is_active: form.is_active,
      };
      if (form.zone_code) payload.zone_code = form.zone_code.trim().toUpperCase();
      if (form.aisle)     payload.aisle     = form.aisle.trim().toUpperCase();
      if (form.rack)      payload.rack      = form.rack.trim().toUpperCase();
      if (form.shelf)     payload.shelf     = form.shelf.trim().toUpperCase();
      if (form.bin)       payload.bin       = form.bin.trim().toUpperCase();
      await api.post(`/warehouses/${id}/locations`, payload);
      closeForm();
      loadLocations();
    } catch (err) {
      setFormError(err.message || 'Could not save location.');
    } finally {
      setSaving(false);
    }
  }

  function locationPath(loc) {
    return [loc.zone_code, loc.aisle, loc.rack, loc.shelf, loc.bin].filter(Boolean).join(' › ');
  }

  const whLabel = warehouse
    ? [warehouse.city, warehouse.state, warehouse.country].filter(Boolean).join(', ')
    : '';

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/warehouses')}>← Warehouses</button>
          {whLoading
            ? <span className="skeleton" style={{ width: 200, height: 26 }} />
            : <h1 className="page-title" style={{ margin: 0 }}>{warehouse?.name ?? 'Warehouse'}</h1>
          }
        </div>
        <button className="btn btn-primary" onClick={openForm}>+ Add Location</button>
      </div>

      {/* Warehouse info strip */}
      {!whLoading && warehouse && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div className="wh-detail-meta">
            {whLabel && (
              <div className="wh-meta-item"><span style={{ opacity: 0.5 }}>⊙</span>{whLabel}</div>
            )}
            <div className="wh-meta-item">
              <span style={{ opacity: 0.5 }}>◎</span>
              <span>{locations.length} location{locations.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Locations table */}
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
          Storage Locations
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Zone</th>
                <th>Aisle</th>
                <th>Rack</th>
                <th>Shelf</th>
                <th>Bin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {locLoading ? (
                <SkeletonRows />
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div style={{ fontSize: '2rem', opacity: 0.2 }}>◎</div>
                      <div>No locations yet</div>
                      <div className="text-sm">Define storage locations (zones, aisles, racks)</div>
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={openForm}>+ Add Location</button>
                    </div>
                  </td>
                </tr>
              ) : (
                locations.map(loc => (
                  <tr key={loc.id}>
                    <td>
                      <div className="location-code">{loc.code}</div>
                      {locationPath(loc) && <div className="location-path">{locationPath(loc)}</div>}
                    </td>
                    <td className="mono text-sm">{loc.zone_code || <span className="text-muted">—</span>}</td>
                    <td className="mono text-sm">{loc.aisle    || <span className="text-muted">—</span>}</td>
                    <td className="mono text-sm">{loc.rack     || <span className="text-muted">—</span>}</td>
                    <td className="mono text-sm">{loc.shelf    || <span className="text-muted">—</span>}</td>
                    <td className="mono text-sm">{loc.bin      || <span className="text-muted">—</span>}</td>
                    <td>
                      {loc.is_active
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-muted">Inactive</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Location slide-over */}
      {showForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="slideover">
            <div className="slideover-header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>Add Location</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeForm}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Location Code *</label>
                <input className="form-input mono" name="code" value={form.code} onChange={handleChange}
                  placeholder="e.g. A1-01-01" style={{ textTransform: 'uppercase' }} />
                <span className="text-muted text-xs">Unique identifier for this bin/slot</span>
                {fieldErr.code && <span className="text-red text-sm">{fieldErr.code}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Zone <span className="text-muted">(optional)</span></label>
                <input className="form-input mono" name="zone_code" value={form.zone_code} onChange={handleChange}
                  placeholder="e.g. ZONE-A" style={{ textTransform: 'uppercase' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Aisle</label>
                  <input className="form-input mono" name="aisle" value={form.aisle} onChange={handleChange}
                    placeholder="A1" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rack</label>
                  <input className="form-input mono" name="rack" value={form.rack} onChange={handleChange}
                    placeholder="01" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Shelf</label>
                  <input className="form-input mono" name="shelf" value={form.shelf} onChange={handleChange}
                    placeholder="01" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bin</label>
                  <input className="form-input mono" name="bin" value={form.bin} onChange={handleChange}
                    placeholder="B1" style={{ textTransform: 'uppercase' }} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange}
                  style={{ width: 16, height: 16, accentColor: 'var(--amber)' }} />
                <span>Active — available for stock placement</span>
              </label>

              {formError && (
                <div style={{ background: 'rgba(232,107,90,0.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Saving…' : 'Add Location'}
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
