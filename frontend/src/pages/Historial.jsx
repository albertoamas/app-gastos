// pages/Historial.jsx — Historial completo con búsqueda y filtro por mes

import { useState, useEffect, useMemo } from 'react';
import { getGastos, deleteGasto } from '../services/api';
import { fmtBs, fmtDate, fmtMonth } from '../utils/format';

export default function Historial() {
  const [gastos,  setGastos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [buscar,  setBuscar]  = useState('');
  const [mesFilter, setMesFilter] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const lista = await getGastos();
      setGastos(lista);
    } catch { setError('No se pudo cargar el historial.'); }
    finally { setLoading(false); }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await deleteGasto(id);
      setGastos(gastos.filter((g) => g.id !== id));
    } catch { alert('No se pudo eliminar.'); }
  }

  // Meses únicos para el filtro
  const meses = useMemo(() => {
    const set = new Set(gastos.map((g) => g.fecha.slice(0, 7)));
    return [...set].sort().reverse();
  }, [gastos]);

  // Gastos filtrados
  const filtrados = useMemo(() => {
    return gastos.filter((g) => {
      const matchBuscar = g.descripcion.toLowerCase().includes(buscar.toLowerCase());
      const matchMes    = mesFilter ? g.fecha.startsWith(mesFilter) : true;
      return matchBuscar && matchMes;
    });
  }, [gastos, buscar, mesFilter]);

  const totalFiltrado = filtrados.reduce((s, g) => s + parseFloat(g.monto), 0);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Historial completo</h1>
          <p className="page-date">Todos tus gastos registrados</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="error-retry" onClick={load}>Reintentar</button>
        </div>
      )}

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
          <div className="filters-row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="buscar">Buscar</label>
              <input
                id="buscar" type="text"
                placeholder="Buscar por descripción…"
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="mes">Filtrar por mes</label>
              <select
                id="mes"
                className="custom-select"
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
              >
                <option value="">Todos los meses</option>
                {meses.map((m) => (
                  <option key={m} value={m}>
                    {fmtMonth(m + '-01')}
                  </option>
                ))}
              </select>
            </div>
            {(buscar || mesFilter) && (
              <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => { setBuscar(''); setMesFilter(''); }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {mesFilter || buscar ? 'Resultados filtrados' : 'Todos los gastos'}
          </span>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {filtrados.length > 0 && (
              <span className="total-inline">
                Total: <strong>{fmtBs(totalFiltrado)}</strong>
              </span>
            )}
            <span className="count-badge">
              {filtrados.length} {filtrados.length === 1 ? 'gasto' : 'gastos'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="empty"><div className="empty-title">Cargando…</div></div>
        ) : filtrados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">Sin resultados</div>
            <div className="empty-desc">Prueba con otros filtros</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((g, i) => (
                  <tr key={g.id}>
                    <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{i + 1}</td>
                    <td className="col-date">{fmtDate(g.fecha)}</td>
                    <td className="col-desc">{g.descripcion}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="amount-pill">{fmtBs(g.monto)}</span>
                    </td>
                    <td className="col-action">
                      <button className="btn btn-ghost" onClick={() => eliminar(g.id)} title="Eliminar">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
