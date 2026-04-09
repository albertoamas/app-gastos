// services/api.js — Llamadas al backend con JWT automático

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Obtiene el token del localStorage para adjuntarlo a cada petición
function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Helper: lanza error con el mensaje del servidor, o redirige al login si es 401
async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
}

// ── Gastos ────────────────────────────────────────
export async function getGastos() {
  const res = await fetch(`${BASE_URL}/api/gastos`, { headers: getHeaders() });
  return handleResponse(res);
}

export async function createGasto(data) {
  const res = await fetch(`${BASE_URL}/api/gastos`, {
    method:  'POST',
    headers: getHeaders(),
    body:    JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteGasto(id) {
  const res = await fetch(`${BASE_URL}/api/gastos/${id}`, {
    method:  'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
}

export async function getTotal() {
  const res = await fetch(`${BASE_URL}/api/gastos/total`, { headers: getHeaders() });
  return handleResponse(res);
}
