// services/auth.js — Llamadas a la API de autenticación

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Registro de nuevo usuario ────────────────────
export async function register(nombre, email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ nombre, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrarse');
  return data; // { token, user }
}

// ── Login ────────────────────────────────────────
export async function loginApi(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');
  return data; // { token, user }
}
