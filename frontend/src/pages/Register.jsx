// pages/Register.jsx — Página de registro de cuenta

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm]       = useState({ nombre: '', email: '', password: '', confirm: '' });
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);
  const { login }             = useAuth();
  const navigate              = useNavigate();

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.'); return;
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.'); return;
    }

    setLoading(true);
    try {
      const { token, user } = await register(form.nombre, form.email, form.password);
      login(token, user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-back-link">← Volver al inicio</Link>
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-brand">
          <div className="brand-dot" style={{ width: 40, height: 40, fontSize: '1rem', borderRadius: 12 }}>G</div>
          <span className="auth-brand-name">Gastos Personales</span>
        </div>

        <h2 className="auth-title">Crear cuenta</h2>
        <p className="auth-sub">Regístrate para comenzar a controlar tus gastos</p>

        {error && <div className="error-banner" style={{ marginBottom: '1.25rem' }}><span>{error}</span></div>}

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label htmlFor="nombre">Nombre completo</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <input id="nombre" name="nombre" type="text"
                placeholder="Tu nombre"
                value={form.nombre} onChange={handle} required autoFocus />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </span>
              <input id="email" name="email" type="email"
                placeholder="tucorreo@ejemplo.com"
                value={form.email} onChange={handle} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </span>
              <input id="password" name="password" type="password"
                placeholder="Mínimo 6 caracteres"
                value={form.password} onChange={handle} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirmar contraseña</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </span>
              <input id="confirm" name="confirm" type="password"
                placeholder="Repite tu contraseña"
                value={form.confirm} onChange={handle} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer-text">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="auth-link">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
