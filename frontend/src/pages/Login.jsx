// pages/Login.jsx — Página de inicio de sesión

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginApi } from '../services/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const { login }           = useAuth();
  const navigate            = useNavigate();

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const { token, user } = await loginApi(form.email, form.password);
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

        <h2 className="auth-title">Iniciar sesión</h2>
        <p className="auth-sub">Ingresa a tu cuenta para ver tus gastos</p>

        {error && <div className="error-banner" style={{ marginBottom: '1.25rem' }}><span>{error}</span></div>}

        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </span>
              <input id="email" name="email" type="email"
                placeholder="tucorreo@ejemplo.com"
                value={form.email} onChange={handle} required autoFocus />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <div className="input-group">
              <span className="input-icon">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </span>
              <input id="password" name="password" type="password"
                placeholder="••••••••"
                value={form.password} onChange={handle} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className="auth-footer-text">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="auth-link">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}
