import { useEffect, useState, useMemo } from 'react';
import { api } from '../api.js';
import './Movements.css';

const EVENT_CFG = {
  inbound_receipt: { label: 'Inbound Receipt', cls: 'badge-green'  },
  internal_move:   { label: 'Internal Move',   cls: 'badge-amber'  },
  dispatch:        { label: 'Dispatch',         cls: 'badge-navy'   },
  adjustment:      { label: 'Adjustment',       cls: 'badge-muted'  },
};

function eventLabel(type) {
  return EVENT_CFG[type]?.label ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function eventCls(type) {
  return EVENT_CFG[type]?.cls ?? 'badge-muted';
}

function SkeletonRows() {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i}>
      {[120, 100, 100, 70, 100, 100].map((w, j) => (
        <td key={j}><span className="skeleton" style={{ width: w, height: 13, display: 'block' }} /></td>
      ))}
    </tr>
  ));
}

function formatDatetime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Movements() {
  const [products, setProducts]     = useState([]);
  const [locationMap, setLocationMap] = useState({});
  const [selectedProduct, setSelectedProduct] = useState('');
  const [movements, setMovements]   = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [search, setSearch]         = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/products').then(r => r?.data ?? []).catch(() => []),
      api.get('/warehouses').then(r => r?.data ?? []).catch(() => []),
    ]).then(async ([prods, whs]) => {
      setProducts(prods);
      const locFetches = whs.map(w =>
        api.get(`/warehouses/${w.id}/locations`).then(r => r?.data ?? []).catch(() => [])
      );
      const allLocs = await Promise.all(locFetches);
      const map = {};
      allLocs.flat().forEach(l => { map[l.id] = l.code; });
      setLocationMap(map);
      setLoadingInit(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedProduct) { setMovements([]); return; }
    setLoadingMovements(true);
    api.get(`/inventory/movements/${selectedProduct}`)
      .then(r => setMovements(r?.data ?? []))
      .catch(() => setMovements([]))
      .finally(() => setLoadingMovements(false));
  }, [selectedProduct]);

  const prodMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p])), [products]);

  const allEventTypes = useMemo(() => {
    const types = new Set(movements.map(m => m.event_type));
    return [...types].sort();
  }, [movements]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return movements.filter(m => {
      const matchType   = !filterType || m.event_type === filterType;
      const matchSearch = !q ||
        m.event_type?.toLowerCase().includes(q) ||
        m.reference_type?.toLowerCase().includes(q) ||
        locationMap[m.from_location_id]?.toLowerCase().includes(q) ||
        locationMap[m.to_location_id]?.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [movements, filterType, search, locationMap]);

  const hasFilters = filterType || search;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">Stock movement history by product</p>
        </div>
      </div>

      {/* Product picker */}
      <div className="mvt-picker-bar">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Product</label>
          <select className="form-select" value={selectedProduct}
            onChange={e => { setSelectedProduct(e.target.value); setFilterType(''); setSearch(''); }}>
            <option value="">Select a product to view movements…</option>
            {loadingInit
              ? <option disabled>Loading…</option>
              : products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
          </select>
        </div>
      </div>

      {selectedProduct && (
        <>
          {/* Filter bar */}
          <div className="filter-bar" style={{ marginTop: 0 }}>
            <input className="form-input filter-search" placeholder="Search event, location, reference…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Event Types</option>
              {allEventTypes.map(t => (
                <option key={t} value={t}>{eventLabel(t)}</option>
              ))}
            </select>
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterType(''); }}>Clear</button>
            )}
          </div>

          {/* Movements table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>From Location</th>
                    <th>To Location</th>
                    <th>Qty</th>
                    <th>Reference</th>
                    <th>Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMovements ? <SkeletonRows /> : filtered.length === 0 ? (
                    <tr><td colSpan={6}>
                      <div className="empty-state">
                        <div style={{ fontSize: '2rem', opacity: 0.2 }}>≡</div>
                        <div>
                          {movements.length === 0
                            ? 'No movements recorded for this product'
                            : 'No movements match your filters'}
                        </div>
                      </div>
                    </td></tr>
                  ) : (
                    filtered.map(m => (
                      <tr key={m.id}>
                        <td>
                          <span className={`badge ${eventCls(m.event_type)}`}>
                            {eventLabel(m.event_type)}
                          </span>
                        </td>
                        <td>
                          {m.from_location_id
                            ? <span className="mvt-loc">{locationMap[m.from_location_id] ?? <span className="text-muted text-sm">—</span>}</span>
                            : <span className="text-muted text-sm">—</span>}
                        </td>
                        <td>
                          {m.to_location_id
                            ? <span className="mvt-loc">{locationMap[m.to_location_id] ?? <span className="text-muted text-sm">—</span>}</span>
                            : <span className="text-muted text-sm">—</span>}
                        </td>
                        <td>
                          <span className="mvt-qty">{m.qty}</span>
                        </td>
                        <td>
                          {m.reference_type
                            ? <span className="text-muted text-sm">{m.reference_type}</span>
                            : <span className="text-muted text-sm">—</span>}
                        </td>
                        <td className="text-muted text-sm">{formatDatetime(m.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!loadingMovements && movements.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--muted)', textAlign: 'right' }}>
              {filtered.length} of {movements.length} movements
            </div>
          )}
        </>
      )}

      {!selectedProduct && !loadingInit && (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', opacity: 0.15, marginBottom: '0.75rem' }}>≡</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>Select a product above</div>
          <div style={{ fontSize: '0.85rem' }}>All inbound receipts and stock moves will appear here</div>
        </div>
      )}
    </div>
  );
}
