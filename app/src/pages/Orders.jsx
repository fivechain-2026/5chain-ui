import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Orders.css';

const STATUS_CFG = {
  created:    { label: 'Created',    cls: 'badge-muted'  },
  processing: { label: 'Processing', cls: 'badge-amber'  },
  picked:     { label: 'Picked',     cls: 'badge-amber'  },
  packed:     { label: 'Packed',     cls: 'badge-green'  },
  dispatched: { label: 'Dispatched', cls: 'badge-green'  },
  cancelled:  { label: 'Cancelled',  cls: 'badge-red'    },
};

function SkeletonRows() {
  return Array.from({ length: 4 }).map((_, i) => (
    <tr key={i}>
      {[90, 130, 100, 80, 70].map((w, j) => (
        <td key={j}><span className="skeleton" style={{ width: w, height: 13, display: 'block' }} /></td>
      ))}
    </tr>
  ));
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_FORM = { order_no: '', customer_name: '', tenant_id: '' };

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders]         = useState([]);
  const [tenants, setTenants]       = useState([]);
  const [loading, setLoading]       = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  const [search, setSearch]             = useState('');

  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState('');
  const [fieldErr, setFieldErr]     = useState({});

  function load() {
    setLoading(true);
    Promise.all([
      api.get('/orders').then(r => r?.data ?? []).catch(() => []),
      api.get('/tenants').then(r => r?.data ?? []).catch(() => []),
    ]).then(([ords, tens]) => {
      setOrders(ords);
      setTenants(tens);
      setLoading(false);
    });
  }

  useEffect(load, []);

  const tenantMap = useMemo(() => Object.fromEntries(tenants.map(t => [t.id, t.name])), [tenants]);

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      const matchSearch = !q || o.order_no?.toLowerCase().includes(q) || o.customer_name?.toLowerCase().includes(q);
      const matchStatus = !filterStatus || o.status === filterStatus;
      const matchTenant = !filterTenant || o.tenant_id === filterTenant;
      return matchSearch && matchStatus && matchTenant;
    });
  }, [orders, search, filterStatus, filterTenant]);

  function openForm()  { setForm(EMPTY_FORM); setFormError(''); setFieldErr({}); setShowForm(true); }
  function closeForm() { setShowForm(false); setFormError(''); }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setFieldErr(fe => ({ ...fe, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.order_no.trim()) { setFieldErr({ order_no: 'Order number is required' }); return; }
    setSaving(true); setFormError('');
    try {
      const payload = { order_no: form.order_no.trim().toUpperCase() };
      if (form.customer_name) payload.customer_name = form.customer_name.trim();
      if (form.tenant_id)     payload.tenant_id     = form.tenant_id;
      const res = await api.post('/orders', payload);
      closeForm();
      // Navigate directly to the new order's detail page
      const newId = res?.data?.id ?? res?.id;
      if (newId) navigate(`/orders/${newId}`);
      else load();
    } catch (err) {
      setFormError(err.message || 'Could not create order.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Dispatch orders for outbound fulfilment</p>
        </div>
        <button className="btn btn-primary" onClick={openForm}>+ New Order</button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input className="form-input filter-search" placeholder="Search order no or customer…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="form-select" value={filterTenant} onChange={e => setFilterTenant(e.target.value)}>
          <option value="">All Tenants</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {(search || filterStatus || filterTenant) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterTenant(''); }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Order No</th>
                <th>Customer</th>
                <th>Tenant</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows /> : filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state">
                    <div style={{ fontSize: '2rem', opacity: 0.2 }}>◳</div>
                    <div>{orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}</div>
                    {orders.length === 0 && (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={openForm}>+ New Order</button>
                    )}
                  </div>
                </td></tr>
              ) : (
                filtered.map(o => (
                  <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
                    <td><span className="mono text-sm" style={{ color: 'var(--amber)' }}>{o.order_no}</span></td>
                    <td style={{ color: 'var(--white)' }}>{o.customer_name || <span className="text-muted">—</span>}</td>
                    <td>{o.tenant_id ? <span className="badge badge-navy">{tenantMap[o.tenant_id] ?? '—'}</span> : <span className="text-muted text-sm">—</span>}</td>
                    <td><span className={`badge ${STATUS_CFG[o.status]?.cls ?? 'badge-muted'}`}>{STATUS_CFG[o.status]?.label ?? o.status}</span></td>
                    <td className="text-muted text-sm">{formatDate(o.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create order slide-over */}
      {showForm && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && closeForm()}>
          <div className="slideover">
            <div className="slideover-header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400 }}>New Order</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeForm}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Order Number *</label>
                <input className="form-input mono" name="order_no" value={form.order_no} onChange={handleChange}
                  placeholder="e.g. ORD-2025-001" style={{ textTransform: 'uppercase' }} />
                {fieldErr.order_no && <span className="text-red text-sm">{fieldErr.order_no}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Customer Name <span className="text-muted">(optional)</span></label>
                <input className="form-input" name="customer_name" value={form.customer_name} onChange={handleChange}
                  placeholder="e.g. Reliance Retail Ltd" />
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
              {formError && (
                <div style={{ background: 'rgba(232,107,90,0.1)', border: '1px solid var(--red)', borderRadius: 6, padding: '0.65rem 0.85rem', fontSize: '0.85rem', color: 'var(--red)' }}>
                  {formError}
                </div>
              )}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                  {saving ? 'Creating…' : 'Create Order'}
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
