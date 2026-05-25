import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Orders.css';

// Status progression — cancelled is a branch, not a step
const STEPS = ['created', 'processing', 'picked', 'packed', 'dispatched'];

const STATUS_CFG = {
  created:    { label: 'Created',    cls: 'badge-muted'  },
  processing: { label: 'Processing', cls: 'badge-amber'  },
  picked:     { label: 'Picked',     cls: 'badge-amber'  },
  packed:     { label: 'Packed',     cls: 'badge-green'  },
  dispatched: { label: 'Dispatched', cls: 'badge-green'  },
  cancelled:  { label: 'Cancelled',  cls: 'badge-red'    },
};

const NEXT_STATUS = {
  created:    'processing',
  processing: 'picked',
  picked:     'packed',
  packed:     'dispatched',
};

const NEXT_LABEL = {
  created:    'Mark as Processing',
  processing: 'Mark as Picked',
  picked:     'Mark as Packed',
  packed:     'Mark as Dispatched',
};

function Stepper({ status }) {
  if (status === 'cancelled') {
    return (
      <div style={{ margin: '1.5rem 0' }}>
        <span className="badge badge-red" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>Order Cancelled</span>
      </div>
    );
  }
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="status-stepper">
      {STEPS.map((step, i) => {
        const isDone    = i < currentIdx;
        const isCurrent = i === currentIdx;
        const stateClass = isDone ? 'done' : isCurrent ? 'current' : '';
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="stepper-step">
              <div className={`stepper-circle ${stateClass}`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className={`stepper-label ${stateClass}`}>
                {STATUS_CFG[step].label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`stepper-line ${isDone ? 'done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder]         = useState(null);
  const [lines, setLines]         = useState([]);
  const [products, setProducts]   = useState([]);
  const [tenants, setTenants]     = useState([]);
  const [loading, setLoading]     = useState(true);

  const [advancing, setAdvancing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [lineForm, setLineForm]   = useState({ product_id: '', qty: '' });
  const [addingLine, setAddingLine] = useState(false);
  const [lineError, setLineError] = useState('');

  function loadOrder() {
    return api.get(`/orders/${id}`).then(r => r?.data ?? r).catch(() => null);
  }
  function loadLines() {
    return api.get(`/orders/${id}/lines`).then(r => r?.data ?? []).catch(() => []);
  }

  useEffect(() => {
    Promise.all([
      loadOrder(),
      loadLines(),
      api.get('/products').then(r => r?.data ?? []).catch(() => []),
      api.get('/tenants').then(r => r?.data ?? []).catch(() => []),
    ]).then(([ord, lns, prods, tens]) => {
      setOrder(ord);
      setLines(lns);
      setProducts(prods);
      setTenants(tens);
      setLoading(false);
    });
  }, [id]);

  const prodMap   = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])),    [products]);
  const tenantMap = useMemo(() => Object.fromEntries(tenants.map(t => [t.id, t.name])), [tenants]);

  async function advanceStatus() {
    const next = NEXT_STATUS[order?.status];
    if (!next) return;
    setAdvancing(true); setStatusError('');
    try {
      const res = await api.patch(`/orders/${id}/status`, { status: next });
      setOrder(res?.data ?? res);
    } catch (err) {
      setStatusError(err.message || 'Could not update status.');
    } finally {
      setAdvancing(false);
    }
  }

  async function cancelOrder() {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setCancelling(true); setStatusError('');
    try {
      const res = await api.patch(`/orders/${id}/status`, { status: 'cancelled' });
      setOrder(res?.data ?? res);
    } catch (err) {
      setStatusError(err.message || 'Could not cancel order.');
    } finally {
      setCancelling(false);
    }
  }

  async function addLine(e) {
    e.preventDefault();
    if (!lineForm.product_id || !lineForm.qty) { setLineError('Product and quantity are required.'); return; }
    setAddingLine(true); setLineError('');
    try {
      await api.post(`/orders/${id}/lines`, {
        product_id: lineForm.product_id,
        qty:        parseFloat(lineForm.qty),
      });
      setLineForm({ product_id: '', qty: '' });
      loadLines().then(setLines);
    } catch (err) {
      setLineError(err.message || 'Could not add line item.');
    } finally {
      setAddingLine(false);
    }
  }

  const canAddLines   = order && !['dispatched', 'cancelled'].includes(order.status);
  const canAdvance    = order && NEXT_STATUS[order.status] != null;
  const canCancel     = order && !['dispatched', 'cancelled'].includes(order.status);
  const isFinal       = order && ['dispatched', 'cancelled'].includes(order.status);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <span className="skeleton" style={{ width: 220, height: 28 }} />
        </div>
        <div className="card order-header-card">
          <span className="skeleton" style={{ width: 180, height: 14, display: 'block', marginBottom: 8 }} />
          <span className="skeleton" style={{ width: 120, height: 12, display: 'block' }} />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')}>← Orders</button>
        <div className="card" style={{ marginTop: '1rem', padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Order not found.
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')}>← Orders</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h1 className="page-title" style={{ margin: 0 }}>{order.order_no}</h1>
              <span className={`badge ${STATUS_CFG[order.status]?.cls ?? 'badge-muted'}`}>
                {STATUS_CFG[order.status]?.label ?? order.status}
              </span>
            </div>
            {order.customer_name && (
              <p className="page-subtitle" style={{ marginTop: '0.2rem' }}>{order.customer_name}</p>
            )}
          </div>
        </div>

        {!isFinal && (
          <div className="order-actions">
            {canCancel && (
              <button className="btn btn-danger btn-sm" onClick={cancelOrder} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            )}
            {canAdvance && (
              <button className="btn btn-primary" onClick={advanceStatus} disabled={advancing}>
                {advancing ? 'Updating…' : NEXT_LABEL[order.status]}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Order info */}
      <div className="card order-header-card">
        <div className="order-meta-row">
          {order.tenant_id && (
            <div className="order-meta-item">
              <span style={{ opacity: 0.5 }}>◫</span>
              <span>{tenantMap[order.tenant_id] ?? 'Unknown tenant'}</span>
            </div>
          )}
          {order.created_at && (
            <div className="order-meta-item">
              <span style={{ opacity: 0.5 }}>⊙</span>
              <span>Created {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          )}
          <div className="order-meta-item">
            <span style={{ opacity: 0.5 }}>◳</span>
            <span>{lines.length} line item{lines.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {statusError && (
          <div style={{ marginTop: '0.75rem', color: 'var(--red)', fontSize: '0.85rem' }}>{statusError}</div>
        )}
      </div>

      {/* Status stepper */}
      <Stepper status={order.status} />

      {/* Line items */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
          Line Items
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Requested Qty</th>
                <th>Picked Qty</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state" style={{ padding: '1.5rem' }}>
                    <div>No line items yet</div>
                    {canAddLines && <div className="text-sm">Add products below to fulfil</div>}
                  </div>
                </td></tr>
              ) : (
                lines.map(line => {
                  const prod = prodMap[line.product_id];
                  return (
                    <tr key={line.id}>
                      <td style={{ fontWeight: 500, color: 'var(--white)' }}>{prod?.name ?? '—'}</td>
                      <td><span className="mono text-sm" style={{ color: 'var(--amber)' }}>{prod?.sku ?? '—'}</span></td>
                      <td><span className="req-qty">{line.qty}</span></td>
                      <td>
                        <span className={line.picked_qty > 0 ? 'picked-qty' : 'text-muted text-sm'}>
                          {line.picked_qty > 0 ? line.picked_qty : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Add line item form (inline, below table) */}
        {canAddLines && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
            <form onSubmit={addLine} className="add-line-form">
              <div className="form-group">
                <label className="form-label">Product</label>
                <select className="form-select" value={lineForm.product_id}
                  onChange={e => setLineForm(f => ({ ...f, product_id: e.target.value }))}>
                  <option value="">Select product…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="form-group" style={{ maxWidth: 120 }}>
                <label className="form-label">Qty</label>
                <input className="form-input" type="number" step="0.01" min="0.01"
                  value={lineForm.qty} onChange={e => setLineForm(f => ({ ...f, qty: e.target.value }))}
                  placeholder="0" />
              </div>
              <div style={{ paddingBottom: '0.05rem' }}>
                <button type="submit" className="btn btn-secondary" disabled={addingLine || !lineForm.product_id || !lineForm.qty}>
                  {addingLine ? 'Adding…' : '+ Add Line'}
                </button>
              </div>
            </form>
            {lineError && <div style={{ color: 'var(--red)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{lineError}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
