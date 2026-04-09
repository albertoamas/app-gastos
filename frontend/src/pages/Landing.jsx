// pages/Landing.jsx — Página de bienvenida pública

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: '💸',
    title: 'Registra tus gastos',
    desc: 'Añade gastos con monto, descripción y fecha en segundos.',
  },
  {
    icon: '📊',
    title: 'Reportes detallados',
    desc: 'Visualiza tu gasto mensual con gráficas y estadísticas claras.',
  },
  {
    icon: '📋',
    title: 'Historial completo',
    desc: 'Busca y filtra todos tus gastos por mes o descripción.',
  },
  {
    icon: '🔒',
    title: 'Tu cuenta privada',
    desc: 'Cada usuario solo ve sus propios gastos. Seguro con JWT.',
  },
];

export default function Landing() {
  const { isAuth } = useAuth();

  return (
    <div className="landing">

      {/* ── Navbar ────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="brand-dot">G</div>
          <span>Gastos Personales</span>
        </div>
        <div className="landing-nav-links">
          {isAuth ? (
            <Link to="/inicio" className="btn btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.88rem' }}>
              Ir a mi cuenta
            </Link>
          ) : (
            <>
              <Link to="/login" className="landing-nav-link">Iniciar sesión</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.88rem' }}>
                Comenzar gratis
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────── */}
      <section className="landing-hero">
        <h1 className="hero-title">
          Controla tus gastos<br />
          <span className="hero-title-accent">personales en bolivianos</span>
        </h1>
        <p className="hero-sub">
          Registra, visualiza y analiza tus gastos de forma simple.<br />
          Todo en un solo lugar, seguro y accesible desde cualquier dispositivo.
        </p>
        <div className="hero-ctas">
          {isAuth ? (
            <Link to="/inicio" className="btn btn-primary hero-btn">
              Ver mis gastos →
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary hero-btn">
                Crear cuenta gratis
              </Link>
              <Link to="/login" className="hero-link">
                Ya tengo cuenta →
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── Features ──────────────────────────── */}
      <section className="landing-features">
        <div className="features-label">Funcionalidades</div>
        <h2 className="features-title">Todo lo que necesitas para gestionar tus finanzas</h2>
        <div className="features-grid">
          {features.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-name">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ─────────────────────────── */}
      <section className="landing-cta">
        <div className="cta-card">
          <h2 className="cta-title">¿Listo para empezar?</h2>
          <p className="cta-sub">Crea tu cuenta gratis y empieza a registrar tus gastos hoy mismo.</p>
          {isAuth ? (
            <Link to="/inicio" className="btn btn-primary hero-btn">Ir a mi cuenta</Link>
          ) : (
            <Link to="/register" className="btn btn-primary hero-btn">Crear cuenta gratis</Link>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────── */}
      <footer className="landing-footer">
        <span>Gastos Personales</span>
      </footer>
    </div>
  );
}
