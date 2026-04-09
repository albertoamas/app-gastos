// pages/Reportes.jsx — Página de reportes con estadísticas y gráfica de barras CSS

import { useState, useEffect, useMemo } from 'react';
import { getGastos } from '../services/api';
import { fmtBs, fmtDate } from '../utils/format';

export default function Reportes() {
  const [gastos,  setGastos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    getGastos()
      .then(setGastos)
      .catch(() => setError('No se pudo cargar los datos.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Cálculos de reporte ──────────────────────
  const total    = gastos.reduce((s, g) => s + parseFloat(g.monto), 0);
  const cantidad = gastos.length;
  const promedio = cantidad > 0 ? total / cantidad : 0;
  const mayor    = cantidad > 0
    ? gastos.reduce((max, g) => parseFloat(g.monto) > parseFloat(max.monto) ? g : max)
    : null;
  const menor    = cantidad > 0
    ? gastos.reduce((min, g) => parseFloat(g.monto) < parseFloat(min.monto) ? g : min)
    : null;

  // Agrupación por mes
  const porMes = useMemo(() => {
    const mapa = {};
    gastos.forEach((g) => {
      const mes = g.fecha.slice(0, 7);
      if (!mapa[mes]) mapa[mes] = { total: 0, cantidad: 0, label: '' };
      mapa[mes].total    += parseFloat(g.monto);
      mapa[mes].cantidad += 1;
      mapa[mes].label     = new Date(g.fecha.slice(0, 7) + '-02')
        .toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });
    });
    return Object.entries(mapa).sort((a, b) => b[0].localeCompare(a[0]));
  }, [gastos]);

  // Top 5 gastos más altos
  const top5 = useMemo(() =>
    [...gastos].sort((a, b) => parseFloat(b.monto) - parseFloat(a.monto)).slice(0, 5),
    [gastos]
  );

  // Máximo para escala de barras
  const maxMes = Math.max(...porMes.map(([, d]) => d.total), 1);

  if (loading) return <div className="card"><div className="empty"><div className="empty-title">Cargando reportes…</div></div></div>;
  if (error)   return <div className="error-banner">{error}</div>;

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Reportes</h1>
          <p className="page-date">Análisis de tus gastos personales</p>
        </div>
      </div>

      {/* Resumen general */}
      <div className="stats-row" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card stat-card--accent">
          <div className="stat-label">Total histórico</div>
          <div className="stat-value">{fmtBs(total)}</div>
          <div className="stat-sub">{cantidad} gastos en total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Promedio por gasto</div>
          <div className="stat-value">{fmtBs(promedio)}</div>
          <div className="stat-sub">ticket promedio</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mayor pago</div>
          <div className="stat-value">{mayor ? fmtBs(mayor.monto) : '—'}</div>
          <div className="stat-sub" title={mayor?.descripcion}>
            {mayor ? mayor.descripcion.slice(0, 22) + (mayor.descripcion.length > 22 ? '…' : '') : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Menor pago</div>
          <div className="stat-value">{menor ? fmtBs(menor.monto) : '—'}</div>
          <div className="stat-sub" title={menor?.descripcion}>
            {menor ? menor.descripcion.slice(0, 22) + (menor.descripcion.length > 22 ? '…' : '') : '—'}
          </div>
        </div>
      </div>

      <div className="report-grid">
        {/* ── Gráfica por mes ─────────────────── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Gasto mensual</span>
          </div>
          <div className="card-body">
            {porMes.length === 0 ? (
              <div className="empty-desc" style={{ textAlign: 'center', padding: '2rem 0' }}>Sin datos aún</div>
            ) : (
              <div className="bar-chart">
                {porMes.map(([key, data]) => (
                  <div className="bar-row" key={key}>
                    <div className="bar-label">{data.label}</div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${Math.max((data.total / maxMes) * 100, 2)}%` }}
                        title={fmtBs(data.total)}
                      />
                    </div>
                    <div className="bar-value">{fmtBs(data.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Top 5 gastos ────────────────────── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Top 5 gastos más altos</span>
          </div>
          {top5.length === 0 ? (
            <div className="empty"><div className="empty-title">Sin datos</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Descripción</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {top5.map((g, i) => (
                    <tr key={g.id}>
                      <td>
                        <span className={`rank-badge rank-${i + 1}`}>{i + 1}</span>
                      </td>
                      <td className="col-desc">{g.descripcion}</td>
                      <td className="col-date">{fmtDate(g.fecha)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="amount-pill">{fmtBs(g.monto)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Detalle por mes ─────────────────── */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <span className="card-title">Resumen por mes</span>
          </div>
          {porMes.length === 0 ? (
            <div className="empty"><div className="empty-title">Sin datos</div></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th style={{ textAlign: 'right' }}>N° de gastos</th>
                    <th style={{ textAlign: 'right' }}>Total del mes</th>
                    <th style={{ textAlign: 'right' }}>Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {porMes.map(([key, data]) => (
                    <tr key={key}>
                      <td className="col-desc" style={{ textTransform: 'capitalize' }}>
                        {data.label}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                        {data.cantidad}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="amount-pill">{fmtBs(data.total)}</span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                        {fmtBs(data.total / data.cantidad)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
