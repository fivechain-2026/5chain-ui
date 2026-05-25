import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import './Inventory.css';

const STATUS_CFG = {
  available:  { label: 'Available',  cls: 'badge-green'  },
  reserved:   { label: 'Reserved',   cls: 'badge-amber'  },
  damaged:    { label: 'Damaged',    cls: 'badge-red'    },
  hold:       { label: 'On Hold',    cls: 'badge-muted'  },
  quarantine: { label: 'Quarantine', cls: 'badge-red'    },
};

const EMPTY_RECEIVE = {
  product_id: '', warehouse_id: '', location_id: '', qty: '',
  batch_no: '', expiry_date: '',
};
const EMPTY_MOVE = {
  product_id: '', from_location_id: '', to_location_id: '', qty: '',
};

function SkeletonRows() {
  const widths = [120, 80, 90, 80, 80, 60, 50, 70];
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i}>
      {widths.map((w, j) => (
        <td key={j}><span className="skeleton" style={{ width: w, height: 13, display: 'block' }} /></td>
      ))}
    </tr>
  ));
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const diff = (d - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Inventory() {
  const [warehouses, setWarehouses]   = useState([]);
  const [products, setProducts]       = useState([]);
  const [tenants, setTenants]         = useState([]);
  const [inventory, setInventory]     = useState([]);
  const [locations, setLocations]     = useState([]);
  const [loading, setLoading]         = useState(false);

  const [selWarehouse, setSelWarehouse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [search, setSearch]             = useState('');

  const [showReceive, setShowReceive] = useState(false);
  const [showMove, setShowMove]       = useState(false);
  const [receiveForm, setReceiveForm] = useState(EMPTY_RECEIVE);
  const [moveForm, setMoveForm]       = useState(EMPTY_MOVE);
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');

  // Load reference data once
  useEffect(() => {
    Promise.all([
      api.get('/warehouses').then(r => r?.data ?? []).catch(() => []),
      api.get('/products').then(r => r?.data ?? []).catch(() => []),
      api.get('/tenants').then(r => r?.data ?? []).catch(() => []),
    ]).then(([whs, prods, tens]) => {
      setWarehouses(whs);
      setProducts(prods);
      setTenants(tens);
      if (whs.length && !selWarehouse) setSelWarehouse(whs[0].id);
    });
  }, []);

  // Load inventory + locations when warehouse changes
  useEffect(() => {
    if (!selWarehouse) return;
    setLoading(true);
    Promise.all([
      api.get(`/inventory?warehouse_id=${selWarehouse}`).then(r => r?.data ?? []).catch(() => []),
      api.get(`/warehouses/${selWarehouse}/locations`).then(r => r?.data ?? []).catch(() => []),
    ]).then(([inv, locs]) => {
      setInventory(inv);
      setLocations(locs);
      setLoading(false);
    });
  }, [selWarehouse]);

  const prodMap    = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])),    [products]);
  const locMap     = useMemo(() => Object.fromEntries(locations.map(l => [l.id, l])),   [locations]);
  const tenantMap  = useMemo(() => Object.fromEntries(tenants.map(t => [t.id, t.name])), [tenants]);

  const filtered = useMemo(() => {
    return inventory.filter(item => {
      const prod = prodMap[item.product_id];
      const q = search.toLowerCase();
      const matchSearch = !q || prod?.name?.toLowerCase().includes(q) || prod?.sku?.toLowerCase().includes(q);
      const matchStatus = !filterStatus || item.status === filterStatus;
      const matchTenant = !filterTenant || prod?.tenant_id === filterTenant;
      return matchSearch && matchStatus && matchTenant;
    });
  }, [inventory, search, filterStatus, filterTenant, prodMap]);

  // Summary stats from filtered view
  const stats = useMemo(() => {
    const s = { available: 0, reserved: 0, hold: 0, damaged: 0 };
    filtered.forEach(i => {
      if (i.status === 'available')  s.available += i.qty;
      if (i.status === 'reserved')   s.reserved  += i.qty;
      if (i.status === 'hold' || i.status === 'quarantine') s.hold += i.qty;
      if (i.status === 'damaged')    s.damaged   += i.qty;
    });
    return s;
  }, [filtered]);

  function fmtQty(n) {
    if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `${(n/1_000).toFixed(1)}K`;
    return n % 1 === 0 ? n.toString() : n.toFixed(2);
  }

  // --- Receive Stock ---
  function openReceive() {
    setReceiveForm({ ...EMPTY_RECEIVE, warehouse_id: selWarehouse });
    setFormError(''); setShowReceive(true);
  }

  async function submitReceive(e) {
    e.preventDefault();
    const f = receiveForm;
    if (!f.product_id || !f.warehouse_id || !f.location_id || !f.qty) {
      setFormError('Product, warehouse, location and quantity are required.'); return;
    }
    setSaving(true); setFormError('');
    try {
      const payload = {
        product_id:   f.product_id,
        warehouse_id: f.warehouse_id,
        location_id:  f.location_id,
        qty:          parseFloat(f.qty),
      };
      if (f.batch_no)    payload.batch_no    = f.batch_no.trim();
      if (f.expiry_date) payload.expiry_date = f.expiry_date;
      await api.post('/inventory/receive', payload);
      setShowReceive(false);
      // Reload inventory
      api.get(`/inventory?warehouse_id=${selWarehouse}`)
        .then(r => setInventory(r?.data ?? [])).catch(() => {});
    } catch (err) {
      setFormError(err.message || 'Could not receive stock.');
    } finally {
      setSaving(false);
    }
  }

  // --- Move Stock ---
  function openMove() {
    setMoveForm(EMPTY_MOVE);
    setFormError(''); setShowMove(true);
  }

  async function submitMove(e) {
    e.preventDefault();
    const f = moveForm;
    if (!f.product_id || !f.from_location_id || !f.to_location_id || !f.qty) {
      setFormError('All fields are required.'); return;
    }
    if (f.from_location_id === f.to_location_id) {
      setFormError('From and To locations must be different.'); return;
    }
    setSaving(true); setFormError('');
    try {
      await api.post('/inventory/move', {
        product_id:       f.product_id,
        from_location_id: f.from_location_id,
        to_location_id:   f.to_location_id,
        qty:              parseFloat(f.qty),
      });
      setShowMove(false);
      api.get(`/inventory?warehouse_id=${selWarehouse}`)
        .then(r => setInventory(r?.data ?? [])).catch(() => {});
    } catch (err) {
      setFormError(err.message || 'Could not move stock.');
    } finally {
      setSaving(false);
    }
  }

  // Products in current inventory (for Move dropdown)
  const inventoryProducts = useMemo(() => {
    const ids = [...new Set(inventory.filter(i => i.status === 'available').map(i => i.product_id))];
    return ids.map(id => prodMap[id]).filter(Boolean);
  }, [inventory, prodMap]);

  // Locations for Move — from locations that have the selected product
  const fromLocations = useMemo(() => {
    if (!moveForm.product_id) return locations;
    const lids = new Set(inventory.filter(i => i.product_id === moveForm.product_id && i.status === 'available').map(i => i.location_id));
    return locations.filter(l => lids.has(l.id));
  }, [moveForm.product_id, inventory, locations]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Live stock snapshot across your warehouse locations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={openMove}  disabled={!selWarehouse}>Move Stock</button>
          <button className="btn btn-primary"   onClick={openReceive} disabled={!selWarehouse}>+ Receive Stock</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="inv-filter-bar">
        <select className="form-select" value={selWarehouse} onChange={e => setSelWarehouse(e.target.value)}>
          {warehouses.length === 0
            ? <option value="">No warehouses</option>
            : warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select className="form-select" value={filterTenant} onChange={e => setFilterTenant(e.target.value)}>
          <option value="">All Tenants</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input className="form-input inv-search" placeholder="Search product name or SKU…"
          value={search} onChange={e => setSearch(e.target.value)} />
        {(filterTenant || filterStatus || search) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterTenant(''); setFilterStatus(''); setSearch(''); }}>Clear</button>
        )}
      </div>

      {/* Summary strip */}
      <div className="inv-summary">
        {[
          { label: 'Available',  value: fmtQty(stats.available), color: 'var(--green)' },
          { label: 'Reserved',   value: fmtQty(stats.reserved),  color: 'var(--amber)' },
          { label: 'On Hold',    value: fmtQty(stats.hold),      color: 'var(--muted)' },
          { label: 'Damaged',    value: fmtQty(stats.damaged),   color: 'var(--red)'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="inv-stat">
            {loading
              ? <span className="skeleton" style={{ width: 50, height: 22, display: 'block' }} />
              : <span className="inv-stat-value" style={{ color }}>{value}</span>}
            <span className="inv-stat-label text-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* Stock table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Location</th>
                <th>Batch</th>
                <th>Expiry</th>
                <th>Qty</th>
                <th>Reserved</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div style={{ fontSize: '2rem', opacity: 0.2 }}>◎</div>
                      <div>{inventory.length === 0 ? 'No stock in this warehouse yet' : 'No items match your filters'}</div>
                      {inventory.length === 0 && (
                        <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={openReceive}>+ Receive Stock</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const prod = prodMap[item.product_id];
                  const loc  = locMap[item.location_id];
                  const expired = isExpired(item.expiry_date);
                  const expiring = isExpiringSoon(item.expiry_date);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500, color: 'var(--white)' }}>{prod?.name ?? '—'}</td>
                      <td><span className="mono text-sm" style={{ color: 'var(--amber)' }}>{prod?.sku ?? '—'}</span></td>
                      <td><span className="loc-code">{loc?.code ?? '—'}</span></td>
                      <td><span className="mono text-sm text-muted">{item.batch_no ?? '—'}</span></td>
                      <td>
                        {item.expiry_date
                          ? <span className={`mono text-sm ${expired ? 'expiry-warn' : expiring ? 'expiry-warn' : 'expiry-ok'}`}>
                              {formatDate(item.expiry_date)}
                              {expired  && ' ⚠'}
                              {expiring && !expired && ' ⚠'}
                            </span>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td><span className="qty-cell">{fmtQty(item.qty)}</span></td>
                      <td><span className="reserved-cell">{item.reserved_qty > 0 ? fmtQty(item.reserved_qty) : '—'}</span></td>
                      <td>
                        <span className={`badge ${STATUS_CFG[item.status]?.cls ?? 'badge-muted'}`}>
                          {STATUS_CFG[item.status]?.label ?? item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Stock slide-over */}
      {showReceive && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowReceive(false)}>
          <div className="slideover">
            <div className="slideover-header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>Receive Stock</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowReceive(false)}>✕</button>
            </div>
            <form onSubmit={submitReceive} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-select" value={receiveForm.product_id}
                  onChange={e => setReceiveForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Warehouse *</label>
                <select className="form-select" value={receiveForm.warehouse_id}
                  onChange={e => setReceiveForm(f => ({ ...f, warehouse_id: e.target.value, location_id: '' }))}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <select className="form-select" value={receiveForm.location_id}
                  onChange={e => setReceiveForm(f => ({ ...f, location_id: e.target.value }))}>
                  <option value="">Select location…</option>
                  {locations.filter(l => l.is_active).map(l => <option key={l.id} value={l.id}>{l.code}{l.zone_code ? ` — ${l.zone_code}` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" step="0.01" min="0.01"
                  value={receiveForm.qty} onChange={e => setReceiveForm(f => ({ ...f, qty: e.target.value }))}
                  placeholder="0" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Batch No <span className="text-muted">(opt)</span></label>
                  <input className="form-input mono" value={receiveForm.batch_no}
                    onChange={e => setReceiveForm(f => ({ ...f, batch_no: e.target.value }))}
                    placeholder="BATCH-001" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry Date <span className="text-muted">(opt)</span></label>
                  <input className="form-input" type="date" value={receiveForm.expiry_date}
                    onChange={e => setReceiveForm(f => ({ ...f, expiry_date: e.target.value }))} />
                </div>
              </div>
              {formError && (
                <div style={{ background: 'rgba(232,107,90,0.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving…' : 'Receive Stock'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReceive(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Stock slide-over */}
      {showMove && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowMove(false)}>
          <div className="slideover">
            <div className="slideover-header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>Move Stock</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowMove(false)}>✕</button>
            </div>
            <form onSubmit={submitMove} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Product *</label>
                <select className="form-select" value={moveForm.product_id}
                  onChange={e => setMoveForm(f => ({ ...f, product_id: e.target.value, from_location_id: '', to_location_id: '' }))}>
                  <option value="">Select product…</option>
                  {inventoryProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">From Location *</label>
                <select className="form-select" value={moveForm.from_location_id}
                  onChange={e => setMoveForm(f => ({ ...f, from_location_id: e.target.value }))}>
                  <option value="">Select source…</option>
                  {fromLocations.map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To Location *</label>
                <select className="form-select" value={moveForm.to_location_id}
                  onChange={e => setMoveForm(f => ({ ...f, to_location_id: e.target.value }))}>
                  <option value="">Select destination…</option>
                  {locations.filter(l => l.is_active && l.id !== moveForm.from_location_id)
                    .map(l => <option key={l.id} value={l.id}>{l.code}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" step="0.01" min="0.01"
                  value={moveForm.qty} onChange={e => setMoveForm(f => ({ ...f, qty: e.target.value }))}
                  placeholder="0" />
              </div>
              {formError && (
                <div style={{ background: 'rgba(232,107,90,0.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>{saving ? 'Moving…' : 'Move Stock'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMove(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
