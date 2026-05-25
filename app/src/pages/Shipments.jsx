import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import './Shipments.css';

const STEPS = ['created', 'dispatched', 'in_transit', 'delivered'];

const STATUS_CFG = {
  created:    { label: 'Created',    cls: 'badge-muted'  },
  dispatched: { label: 'Dispatched', cls: 'badge-amber'  },
  in_transit: { label: 'In Transit', cls: 'badge-amber'  },
  delivered:  { label: 'Delivered',  cls: 'badge-green'  },
  returned:   { label: 'Returned',   cls: 'badge-red'    },
};

const NEXT_STATUS = {
  created:    'dispatched',
  dispatched: 'in_transit',
  in_transit: 'delivered',
};

const NEXT_LABEL = {
  created:    'Mark as Dispatched',
  dispatched: 'Mark as In Transit',
  in_transit: 'Mark as Delivered',
};

const CAN_RETURN = new Set(['dispatched', 'in_transit']);

function ShipmentStepper({ status }) {
  if (status === 'returned') {
    return (
      <div style={{ margin: '1rem 0' }}>
        <span className="badge badge-red" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>Returned</span>
      </div>
    );
  }
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="shp-stepper">
      {STEPS.map((step, i) => {
        const isDone    = i < currentIdx;
        const isCurrent = i === currentIdx;
        const stateClass = isDone ? 'done' : isCurrent ? 'current' : '';
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="shp-step">
              <div className={`shp-circle ${stateClass}`}>{isDone ? '✓' : i + 1}</div>
              <span className={`shp-label ${stateClass}`}>{STATUS_CFG[step].label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`shp-line ${isDone ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SkeletonRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i}>
      {[110, 100, 120, 80, 90, 90].map((w, j) => (
        <td key={j}><span className="skeleton" style={{ width: w, height: 13, display: 'block' }} /></td>
      ))}
    </tr>
  ));
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_FORM = { order_id: '', tracking_no: '', carrier: '' };

export default function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');

  const [selected, setSelected]       = useState(null);
  const [advancing, setAdvancing]     = useState(false);
  const [returning, setReturning]     = useState(false);
  const [statusError, setStatusError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/shipments').then(r => r?.data ?? []).catch(() => []),
      api.get('/orders').then(r => r?.data ?? []).catch(() => []),
    ]).then(([shps, ords]) => {
      setShipments(shps);
      setOrders(ords);
      setLoading(false);
    });
  }

  useEffect(load, []);

  const orderMap = useMemo(
    () => Object.fromEntries(orders.map(o => [o.id, o])),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return shipments.filter(s => {
      const matchSearch = !q ||
        s.tracking_no?.toLowerCase().includes(q) ||
        s.carrier?.toLowerCase().includes(q) ||
        orderMap[s.order_id]?.order_no?.toLowerCase().includes(q);
      const matchStatus = !filterStatus || s.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [shipments, search, filterStatus, orderMap]);

  function openCreate()  { setForm(EMPTY_FORM); setFormError(''); setShowCreate(true); }
  function closeCreate() { setShowCreate(false); setFormError(''); }

  function openDetail(shp) { setSelected(shp); setStatusError(''); }
  function closeDetail()   { setSelected(null); setStatusError(''); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.order_id) { setFormError('Order is required.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = { order_id: form.order_id };
      if (form.tracking_no.trim()) payload.tracking_no = form.tracking_no.trim();
      if (form.carrier.trim())     payload.carrier     = form.carrier.trim();
      await api.post('/shipments', payload);
      closeCreate();
      load();
    } catch (err) {
      setFormError(err.message || 'Could not create shipment.');
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus() {
    const next = NEXT_STATUS[selected?.status];
    if (!next) return;
    setAdvancing(true); setStatusError('');
    try {
      const res = await api.patch(`/shipments/${selected.id}/status`, { status: next });
      const updated = res?.data ?? res;
      setSelected(updated);
      setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      setStatusError(err.message || 'Could not update status.');
    } finally {
      setAdvancing(false);
    }
  }

  async function markReturned() {
    if (!window.confirm('Mark this shipment as returned?')) return;
    setReturning(true); setStatusError('');
    try {
      const res = await api.patch(`/shipments/${selected.id}/status`, { status: 'returned' });
      const updated = res?.data ?? res;
      setSelected(updated);
      setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      setStatusError(err.message || 'Could not update status.');
    } finally {
      setReturning(false);
    }
  }

  const canAdvance = selected && NEXT_STATUS[selected.status] != null;
  const canReturn  = selected && CAN_RETURN.has(selected.status);
  const isFinal    = selected && ['delivered', 'returned'].includes(selected.status);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shipments</h1>
          <p className="page-subtitle">Outbound shipment tracking</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Shipment</button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input className="form-input filter-search" placeholder="Search tracking no, carrier or order…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(search || filterStatus) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Tracking No</th>
                <th>Carrier</th>
                <th>Order</th>
                <th>Status</th>
                <th>Dispatched</th>
                <th>Delivered</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows /> : filtered.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div style={{ fontSize: '2rem', opacity: 0.2 }}>⊡</div>
                    <div>{shipments.length === 0 ? 'No shipments yet' : 'No shipments match your filters'}</div>
                    {shipments.length === 0 && (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={openCreate}>+ New Shipment</button>
                    )}
                  </div>
                </td></tr>
              ) : (
                filtered.map(s => {
                  const ord = orderMap[s.order_id];
                  return (
                    <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(s)}>
                      <td>
                        {s.tracking_no
                          ? <span className="mono text-sm" style={{ color: 'var(--amber)' }}>{s.tracking_no}</span>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td style={{ color: 'var(--white)' }}>{s.carrier || <span className="text-muted">—</span>}</td>
                      <td>
                        {ord
                          ? <span className="mono text-sm" style={{ color: 'var(--amber)' }}>{ord.order_no}</span>
                          : <span className="text-muted text-sm">—</span>}
                      </td>
                      <td><span className={`badge ${STATUS_CFG[s.status]?.cls ?? 'badge-muted'}`}>{STATUS_CFG[s.status]?.label ?? s.status}</span></td>
                      <td className="text-muted text-sm">{formatDate(s.dispatched_at)}</td>
                      <td className="text-muted text-sm">{formatDate(s.delivered_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create slide-over */}
      {showCreate && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeCreate()}>
          <div className="slideover">
            <div className="slideover-header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>New Shipment</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeCreate}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Order *</label>
                <select className="form-select" value={form.order_id}
                  onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}>
                  <option value="">Select order…</option>
                  {orders.length === 0
                    ? <option disabled>No orders — create an order first</option>
                    : orders.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.order_no}{o.customer_name ? ` — ${o.customer_name}` : ''}
                        </option>
                      ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tracking Number <span className="text-muted">(optional)</span></label>
                <input className="form-input mono" value={form.tracking_no}
                  onChange={e => setForm(f => ({ ...f, tracking_no: e.target.value }))}
                  placeholder="e.g. DTDC123456789IN" />
              </div>
              <div className="form-group">
                <label className="form-label">Carrier <span className="text-muted">(optional)</span></label>
                <input className="form-input" value={form.carrier}
                  onChange={e => setForm(f => ({ ...f, carrier: e.target.value }))}
                  placeholder="e.g. DTDC, BlueDart, Delhivery" />
              </div>
              {formError && (
                <div style={{ background: 'rgba(232,107,90,0.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving || !form.order_id} style={{ flex: 1 }}>
                  {saving ? 'Creating…' : 'Create Shipment'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeCreate}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail slide-over */}
      {selected && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeDetail()}>
          <div className="slideover">
            <div className="slideover-header">
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, marginBottom: '0.25rem' }}>
                  Shipment Detail
                </h3>
                <span className={`badge ${STATUS_CFG[selected.status]?.cls ?? 'badge-muted'}`}>
                  {STATUS_CFG[selected.status]?.label ?? selected.status}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={closeDetail}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, overflowY: 'auto' }}>
              <div className="shp-meta">
                {selected.tracking_no && (
                  <div className="shp-meta-item">
                    <span className="shp-meta-label">Tracking No</span>
                    <span className="mono" style={{ color: 'var(--amber)', fontSize: '0.9rem' }}>{selected.tracking_no}</span>
                  </div>
                )}
                {selected.carrier && (
                  <div className="shp-meta-item">
                    <span className="shp-meta-label">Carrier</span>
                    <span style={{ color: 'var(--white)' }}>{selected.carrier}</span>
                  </div>
                )}
                {orderMap[selected.order_id] && (
                  <div className="shp-meta-item">
                    <span className="shp-meta-label">Order</span>
                    <span className="mono" style={{ color: 'var(--amber)', fontSize: '0.9rem' }}>
                      {orderMap[selected.order_id].order_no}
                    </span>
                  </div>
                )}
                {selected.dispatched_at && (
                  <div className="shp-meta-item">
                    <span className="shp-meta-label">Dispatched</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{formatDate(selected.dispatched_at)}</span>
                  </div>
                )}
                {selected.delivered_at && (
                  <div className="shp-meta-item">
                    <span className="shp-meta-label">Delivered</span>
                    <span style={{ color: 'var(--green)', fontSize: '0.85rem' }}>{formatDate(selected.delivered_at)}</span>
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                  Status Timeline
                </div>
                <ShipmentStepper status={selected.status} />
              </div>

              {statusError && (
                <div style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{statusError}</div>
              )}
            </div>

            {!isFinal && (
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {canReturn && (
                  <button className="btn btn-danger btn-sm" onClick={markReturned} disabled={returning}>
                    {returning ? 'Updating…' : 'Mark as Returned'}
                  </button>
                )}
                {canAdvance && (
                  <button className="btn btn-primary" onClick={advanceStatus} disabled={advancing} style={{ flex: 1 }}>
                    {advancing ? 'Updating…' : NEXT_LABEL[selected.status]}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
