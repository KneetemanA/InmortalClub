import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, BadgeDollarSign, ClipboardList, Dumbbell, FileClock, LayoutDashboard, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './AuthContext';

const items = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard }, { to: '/socios', label: 'Socios', icon: Users },
  { to: '/pagos', label: 'Pagos y cuotas', icon: BadgeDollarSign }, { to: '/finanzas', label: 'Finanzas', icon: Activity },
  { to: '/planes', label: 'Planes', icon: ClipboardList }, { to: '/auditoria', label: 'Auditoría', icon: FileClock, admin: true },
  { to: '/perfil', label: 'Mi cuenta', icon: Settings },
];
const titles: Record<string, [string, string]> = {
  '/': ['Panel general', 'Una vista clara del estado de Inmortal Club'], '/socios': ['Socios', 'Gestioná altas, datos y membresías'],
  '/pagos': ['Pagos y cuotas', 'Controlá cobranzas, vencimientos y renovaciones'], '/finanzas': ['Finanzas', 'Ingresos, egresos y balance del gimnasio'],
  '/planes': ['Planes y beneficios', 'Configurá valores y revisá los descuentos'], '/auditoria': ['Auditoría', 'Historial de acciones del sistema'],
  '/perfil': ['Mi cuenta', 'Seguridad y datos de acceso'],
};

export default function Layout() {
  const { user, logout } = useAuth(); const [open, setOpen] = useState(false); const location = useLocation();
  const [title, subtitle] = titles[location.pathname] || titles['/'];
  return <div className="app-shell">
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><Dumbbell /></div><div><b>INMORTAL</b><span>CLUB</span></div><button className="mobile-close" onClick={() => setOpen(false)}><X /></button></div>
      <div className="side-label">GESTIÓN</div>
      <nav>{items.filter(i => !i.admin || user?.role.name === 'ADMIN').map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setOpen(false)} end={to === '/'}><Icon /><span>{label}</span></NavLink>)}</nav>
      <div className="side-user"><div className="avatar">{user?.name?.[0]?.toUpperCase()}</div><div><strong>{user?.name}</strong><span>{user?.role.name === 'ADMIN' ? 'Administrador' : 'Recepción'}</span></div><button title="Cerrar sesión" onClick={logout}><LogOut /></button></div>
    </aside>
    {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
    <main className="main">
      <header className="topbar"><button className="menu-btn" onClick={() => setOpen(true)}><Menu /></button><div><h1>{title}</h1><p>{subtitle}</p></div><div className="live"><i /> Sistema conectado</div></header>
      <div className="page"><Outlet /></div>
    </main>
  </div>;
}
