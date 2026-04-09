// GastoList.jsx — Tabla con moneda Boliviana (Bs)

import { fmtBs, fmtDate } from '../utils/format';

export default function GastoList({ gastos, onEliminar, titulo = 'Historial de gastos' }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{titulo}</span>
        {gastos.length > 0 && (
          <span className="count-badge">
            {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}
          </span>
        )}
      </div>

      {gastos.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🌸</div>
          <div className="empty-title">Sin gastos aún</div>
          <div className="empty-desc">Agrega tu primer gasto usando el formulario de arriba</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th style={{ textAlign: 'right' }}>Monto (Bs)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id}>
                  <td className="col-date">{fmtDate(g.fecha)}</td>
                  <td className="col-desc">{g.descripcion}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="amount-pill">{fmtBs(g.monto)}</span>
                  </td>
                  <td className="col-action">
                    <button className="btn btn-ghost" onClick={() => onEliminar(g.id)} title="Eliminar">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
