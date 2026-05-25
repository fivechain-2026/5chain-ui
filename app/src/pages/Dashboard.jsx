import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { mockOrders, mockShipments, mockTenants, mockWarehouses, mockInventorySummary } from '../mockdata.js';
import './Dashboard.css';

const USE_MOCK = false;

const ORDER_STATUS_CFG = {
  created:    { label: 'Created',    cls: 'badge-muted'  },
  processing: { label: 'Processing', cls: 'badge-amber'  },
  picked:     { label: 'Picked',     cls: 'badge-amber'  },
  packed:     { label: 'Packed',     cls: 'badge-green'  },
  dispatched: { label: 'Dispatched', cls: 'badge-green'  },
  cancelled:  { label: 'Cancelled',  cls: 'badge-red'    },
};

const SHIPMENT_STATUS_CFG = {
  created:    { label: 'Created',    cls: 'badge-muted'  },
  dispatched: { label: 'Dispatched', cls: 'badge-amber'  },
  in_transit: { label: 'In Transit', cls: 'badge-amber'  },
  delivered:  { label: 'Delivered',  cls: 'badge-green'  },
  returned:   { label: 'Returned',   cls: 'badge-red'    },
};

const OPEN_STATUSES = new Set(['created', 'processing', 'picked', 'packed']);

function KpiCard({ label, value, loading, sub }) {
  return (
    <div className="card kpi-card">
      {loading ? (
        <>
          <span className="skeleton kpi-skel-num" />
          <span className="skeleton kpi-skel-lbl" />
        </>
      ) : (
        <>
          <span className="kpi-number">{value ?? '—'}</span>
          <span className="kpi-label">{label}</span>
          {sub && <span className="kpi-sub">{sub}</span>}
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, onViewAll }) {
  return (
    <div className="dash-section-header">
      <span className="section-title">{title}</span>
      {onViewAll && (
        <button className="btn btn-ghost btn-sm" onClick={onViewAll}>View all →</button>
      )}
    </div>
  );
}

function SkeletonRows({ count = 4, cols = 3 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j}>
          <span className="skeleton" style={{ width: j === 0 ? 80 : 110, height: 13, display: 'block' }} />
        </td>
      ))}
    </tr>
  ));
}

function formatQty(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-IN');
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [orders,       setOrders]       = useState([]);
  const [shipments,    setShipments]    = useState([]);
  const [tenantCount,  setTenantCount]  = useState(0);
  const [warehouseCount, setWarehouseCount] = useState(0);
  const [totalQty,     setTotalQty]     = useState(0);

  const [ordersLoading,    setOrdersLoading]    = useState(true);
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [tenantLoading,    setTenantLoading]    = useState(true);
  const [warehouseLoading, setWarehouseLoading] = useState(true);
  const [qtyLoading,       setQtyLoading]       = useState(true);

  useEffect(() => {
    if (USE_MOCK) {
      setOrders(mockOrders);
      setShipments(mockShipments);
      setTenantCount(mockTenants.length);
      setWarehouseCount(mockWarehouses.length);
      setTotalQty(mockInventorySummary.totalQty);
      setOrdersLoading(false);
      setShipmentsLoading(false);
      setTenantLoading(false);
      setWarehouseLoading(false);
      setQtyLoading(false);
      return;
    }

    api.get('/orders')
      .then(r => setOrders(r?.data ?? []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));

    api.get('/shipments')
      .then(r => setShipments(r?.data ?? []))
      .catch(() => setShipments([]))
      .finally(() => setShipmentsLoading(false));

    api.get('/tenants')
      .then(r => setTenantCount((r?.data ?? []).length))
      .catch(() => setTenantCount(0))
      .finally(() => setTenantLoading(false));

    api.get('/warehouses')
      .then(async r => {
        const whs = r?.data ?? [];
        setWarehouseCount(whs.length);
        setWarehouseLoading(false);
        if (whs.length === 0) { setTotalQty(0); setQtyLoading(false); return; }
        const sums = await Promise.all(
          whs.map(wh =>
            api.get(`/inventory?warehouse_id=${wh.id}`)
              .then(ir => (ir?.data ?? []).reduce((s, item) => s + (item.qty || 0), 0))
              .catch(() => 0)
          )
        );
        setTotalQty(sums.reduce((a, b) => a + b, 0));
      })
      .catch(() => { setWarehouseCount(0); setWarehouseLoading(false); setTotalQty(0); })
      .finally(() => setQtyLoading(false));
  }, []);

  const openOrders       = orders.filter(o => OPEN_STATUSES.has(o.status));
  const recentOpenOrders = openOrders.slice(0, 6);

  const inTransitCount    = shipments.filter(s => s.status === 'in_transit').length;
  const recentShipments   = [...shipments]
    .sort((a, b) => new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0))
    .slice(0, 6);

  // Build order lookup for shipment display
  const orderMap = Object.fromEntries(orders.map(o => [o.id, o.order_no]));

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{today}</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="kpi-grid">
        <KpiCard label="Warehouses"          value={warehouseCount}         loading={warehouseLoading} />
        <KpiCard label="Open Orders"         value={openOrders.length}      loading={ordersLoading}    />
        <KpiCard label="Shipments In Transit" value={inTransitCount}        loading={shipmentsLoading} />
        <KpiCard label="Total Stock Qty"     value={formatQty(totalQty)}    loading={qtyLoading}       />
        <KpiCard label="Tenants"             value={tenantCount}            loading={tenantLoading}    />
      </div>

      {/* Body — two columns */}
      <div className="dash-body">

        {/* Left: Open orders */}
        <div className="card dash-panel">
          <SectionHeader title="Open Orders" onViewAll={() => navigate('/orders')} />
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0, margin: '0 -1.25rem -1.25rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Customer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? <SkeletonRows count={4} cols={3} /> :
                  recentOpenOrders.length === 0 ? (
                    <tr><td colSpan={3}>
                      <div className="empty-state" style={{ padding: '2rem' }}>
                        <div>No open orders</div>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}
                          onClick={() => navigate('/orders')}>+ New Order</button>
                      </div>
                    </td></tr>
                  ) : (
                    recentOpenOrders.map(o => (
                      <tr key={o.id} className="dash-row" onClick={() => navigate(`/orders/${o.id}`)}>
                        <td><span className="mono text-sm" style={{ color: 'var(--amber)' }}>{o.order_no}</span></td>
                        <td style={{ color: 'var(--white)' }}>{o.customer_name || <span className="text-muted">—</span>}</td>
                        <td>
                          <span className={`badge ${ORDER_STATUS_CFG[o.status]?.cls ?? 'badge-muted'}`}>
                            {ORDER_STATUS_CFG[o.status]?.label ?? o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Recent shipments */}
        <div className="card dash-panel">
          <SectionHeader title="Shipments" onViewAll={() => navigate('/shipments')} />
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0, margin: '0 -1.25rem -1.25rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Carrier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shipmentsLoading ? <SkeletonRows count={4} cols={3} /> :
                  recentShipments.length === 0 ? (
                    <tr><td colSpan={3}>
                      <div className="empty-state" style={{ padding: '2rem' }}>
                        <div>No shipments yet</div>
                        <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }}
                          onClick={() => navigate('/shipments')}>+ New Shipment</button>
                      </div>
                    </td></tr>
                  ) : (
                    recentShipments.map(s => (
                      <tr key={s.id} className="dash-row" onClick={() => navigate('/shipments')}>
                        <td><span className="mono text-sm" style={{ color: 'var(--amber)' }}>{orderMap[s.order_id] ?? '—'}</span></td>
                        <td style={{ color: 'var(--white)' }}>{s.carrier || <span className="text-muted">—</span>}</td>
                        <td>
                          <span className={`badge ${SHIPMENT_STATUS_CFG[s.status]?.cls ?? 'badge-muted'}`}>
                            {SHIPMENT_STATUS_CFG[s.status]?.label ?? s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
