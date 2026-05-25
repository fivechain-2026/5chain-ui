import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import './Layout.css';

const NAV = [
  { to: '/dashboard',  label: 'Dashboard',   icon: '▦' },
  { to: '/tenants',    label: 'Tenants',      icon: '◫' },
  { to: '/warehouses', label: 'Warehouses',   icon: '⊞' },
  { to: '/products',   label: 'Products',     icon: '◈' },
  { to: '/inventory',  label: 'Inventory',    icon: '◎' },
  { to: '/orders',     label: 'Orders',       icon: '◳' },
  { to: '/shipments',  label: 'Shipments',    icon: '⊡' },
  { to: '/movements',  label: 'Audit Log',    icon: '≡' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-text serif">5Chain</span>
          <span className="badge badge-amber" style={{ fontSize: '0.6rem' }}>MVP</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.[0]?.toUpperCase() ?? 'U'}</div>
            <div className="user-meta">
              <div className="user-email">{user?.email}</div>
              <div className="user-role mono text-muted">{user?.role}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} title="Logout">⏻</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
