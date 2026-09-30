import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Payments from './pages/Payments';
import Finances from './pages/Finances';
import Plans from './pages/Plans';
import Audit from './pages/Audit';
import Profile from './pages/Profile';
import Users from './pages/Users';

function Protected() { const { user } = useAuth(); return user ? <Layout /> : <Navigate to="/login" replace />; }
function Admin({ children }: { children: React.ReactNode }) { const { user } = useAuth(); return user?.role.name === 'ADMIN' ? children : <Navigate to="/socios" replace />; }
export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
    <Route element={<Protected />}>
      <Route index element={<Admin><Dashboard /></Admin>} /><Route path="socios" element={<Members />} /><Route path="pagos" element={<Payments />} />
      <Route path="finanzas" element={<Admin><Finances /></Admin>} /><Route path="planes" element={<Admin><Plans /></Admin>} />
      <Route path="auditoria" element={<Admin><Audit /></Admin>} /><Route path="usuarios" element={<Admin><Users /></Admin>} /><Route path="perfil" element={<Admin><Profile /></Admin>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
