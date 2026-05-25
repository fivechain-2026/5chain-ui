import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './useAuth.jsx';
import Layout from './components/Layout.jsx';

import Dashboard     from './pages/Dashboard.jsx';
import Tenants       from './pages/Tenants.jsx';
import TenantDetail  from './pages/TenantDetail.jsx';
import Warehouses    from './pages/Warehouses.jsx';
import WarehouseDetail from './pages/WarehouseDetail.jsx';
import Products      from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Inventory     from './pages/Inventory.jsx';
import Orders        from './pages/Orders.jsx';
import OrderDetail   from './pages/OrderDetail.jsx';
import Shipments     from './pages/Shipments.jsx';
import Movements     from './pages/Movements.jsx';
import Login         from './pages/Login.jsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"        element={<Dashboard />} />
        <Route path="/tenants"          element={<Tenants />} />
        <Route path="/tenants/:id"      element={<TenantDetail />} />
        <Route path="/warehouses"       element={<Warehouses />} />
        <Route path="/warehouses/:id"   element={<WarehouseDetail />} />
        <Route path="/products"         element={<Products />} />
        <Route path="/products/:id"     element={<ProductDetail />} />
        <Route path="/inventory"        element={<Inventory />} />
        <Route path="/orders"           element={<Orders />} />
        <Route path="/orders/:id"       element={<OrderDetail />} />
        <Route path="/shipments"        element={<Shipments />} />
        <Route path="/movements"        element={<Movements />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
