// pages/Home.jsx — Página de inicio: stats + formulario + lista reciente

import { useState, useEffect } from 'react';
import GastoForm from '../components/GastoForm';
import GastoList from '../components/GastoList';
import { getGastos, deleteGasto, getTotal } from '../services/api';
import { fmtBs } from '../utils/format';

export default function Home() {
  const [gastos,  setGastos]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [lista, { total }] = await Promise.all([getGastos(), getTotal()]);
      setGastos(lista);
      setTotal(total);
    } catch { setError('No se pudo conectar con el servidor.'); }
    finally { setLoading(false); }
  }

  function handleCrear(nuevo) {
    setGastos([nuevo, ...gastos]);
    setTotal((p) => parseFloat(p) + parseFloat(nuevo.monto));
  }

  async function handleEliminar(id) {
    try {
      await deleteGasto(id);
      const g = gastos.find((g) => g.id === id);
      setGastos(gastos.filter((g) => g.id !== id));
      if (g) setTotal((p) => parseFloat(p) - parseFloat(g.monto));
    } catch { alert('No se pudo eliminar el gasto.'); }
  }

  const cantidad = gastos.length;
  const mayor    = cantidad > 0 ? Math.max(...gastos.map((g) => parseFloat(g.monto))) : 0;
  const promedio = cantidad > 0 ? total / cantidad : 0;

  // fecha legible
  const fechaHoy = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Bienvenido 👋</h1>
          <p className="page-date">{fechaHoy}</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="error-retry" onClick={load}>Reintentar</button>
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <div className="stats-row">
        <div className="stat-card stat-card--accent">
          <div className="stat-label">Total gastado</div>
          <div className="stat-value">{fmtBs(total)}</div>
          <div className="stat-sub">todos los registros</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Número de gastos</div>
          <div className="stat-value">{cantidad}</div>
          <div className="stat-sub">{cantidad === 1 ? 'registro' : 'registros'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mayor gasto</div>
          <div className="stat-value">{fmtBs(mayor)}</div>
          <div className="stat-sub">pago más alto</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Promedio</div>
          <div className="stat-value">{fmtBs(promedio)}</div>
          <div className="stat-sub">por gasto</div>
        </div>
      </div>

      {/* Formulario */}
      <GastoForm onCrear={handleCrear} />

      {/* Lista reciente */}
      {loading ? (
        <div className="card"><div className="empty"><div className="empty-title">Cargando…</div></div></div>
      ) : (
        <GastoList gastos={gastos} onEliminar={handleEliminar} titulo="Gastos recientes" />
      )}
    </>
  );
}
