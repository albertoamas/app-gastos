// App.jsx — Router principal con Landing, Auth y rutas protegidas

import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Historial from './pages/Historial';
import Reportes from './pages/Reportes';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

// ── Ruta protegida ─────────────────────────────
function PrivateRoute({ children }) {
  const { isAuth } = useAuth();
  return isAuth ? children : <Navigate to="/login" replace />;
}

// ── Ruta pública (redirige si ya está auth) ───
function PublicRoute({ children }) {
  const { isAuth } = useAuth();
  return isAuth ? <Navigate to="/inicio" replace /> : children;
}

// ── Shell del app con topbar ──────────────────
function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="layout">
      <header className="topbar">
        <NavLink to="/inicio" className="topbar-brand" style={{ textDecoration: 'none' }}>
          <div className="brand-dot">G</div>
          Gastos Personales
        </NavLink>
        <nav className="topbar-nav">
          <NavLink to="/inicio" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>Inicio</NavLink>
          <NavLink to="/historial" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>Historial</NavLink>
          <NavLink to="/reportes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>Reportes</NavLink>
        </nav>
        <div className="topbar-user">
          <span className="user-name">👤 {user?.nombre}</span>
          <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      <main className="page">
        <Routes>
          <Route path="/inicio" element={<Home />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </main>

      <footer className="footer">
        Gastos Personales
      </footer>
    </div>
  );
}

// ── App raíz ──────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Landing pública */}
        <Route path="/" element={<Landing />} />

        {/* Auth — redirige al app si ya está logueado */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* App protegida */}
        <Route path="/*" element={
          <PrivateRoute><AppShell /></PrivateRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}
