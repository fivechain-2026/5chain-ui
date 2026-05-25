import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import './Tenants.css';

function PlaceholderSection({ title, note }) {
  return (
    <div className="placeholder-section">
      <strong>{title}</strong>
      {note}
    </div>
  );
}

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/tenants/${id}`)
      .then(res => { setTenant(res?.data ?? res); setLoading(false); })
      .catch(err => {
        setError(err.status === 404 || err.status === 401
          ? 'Tenant endpoint not yet available in backend.'
          : 'Could not load tenant.');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <span className="skeleton" style={{ width: 200, height: 28 }} />
        </div>
        <div className="card tenant-header-card" style={{ padding: '1.5rem' }}>
          <span className="skeleton" style={{ width: 260, height: 22, display: 'block', marginBottom: 10 }} />
          <span className="skeleton" style={{ width: 160, height: 14, display: 'block' }} />
        </div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div>
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tenants')}>← Tenants</button>
        </div>
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back + header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tenants')}>← Tenants</button>
          <h1 className="page-title" style={{ margin: 0 }}>{tenant?.name}</h1>
          {tenant?.gstin && (
            <span className="badge badge-navy gstin-badge">{tenant.gstin}</span>
          )}
        </div>
      </div>

      {/* Tenant info card */}
      <div className="card tenant-header-card">
        <div className="tenant-contact-row">
          {tenant?.contact_email && (
            <div className="tenant-contact-item">
              <span style={{ opacity: 0.5 }}>✉</span>
              <span>{tenant.contact_email}</span>
            </div>
          )}
          {tenant?.contact_phone && (
            <div className="tenant-contact-item">
              <span style={{ opacity: 0.5 }}>✆</span>
              <span>{tenant.contact_phone}</span>
            </div>
          )}
          {tenant?.created_at && (
            <div className="tenant-contact-item">
              <span style={{ opacity: 0.5 }}>⊙</span>
              <span className="text-sm">
                Onboarded {new Date(tenant.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Placeholder sections */}
      <PlaceholderSection
        title="Products"
        note="Products linked to this tenant will appear here once tenant_id is supported in the backend."
      />
      <PlaceholderSection
        title="Orders"
        note="Dispatch orders for this tenant will appear here once tenant_id is wired up in the backend."
      />
    </div>
  );
}
