// GastoForm.jsx — Formulario en una fila, tema crema/rosa

import { useState } from 'react';
import { createGasto } from '../services/api';

const today = () => new Date().toISOString().split('T')[0];

export default function GastoForm({ onCrear }) {
  const [form, setForm] = useState({ monto: '', descripcion: '', fecha: today() });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.monto || !form.descripcion || !form.fecha) {
      setErr('Completa todos los campos antes de continuar.'); return;
    }
    setErr(null); setSaving(true);
    try {
      const nuevo = await createGasto({
        monto: parseFloat(form.monto),
        descripcion: form.descripcion.trim(),
        fecha: form.fecha,
      });
      onCrear(nuevo);
      setForm({ monto: '', descripcion: '', fecha: today() });
    } catch { setErr('No se pudo guardar el gasto. Intenta de nuevo.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Agregar gasto</span>
      </div>
      <div className="card-body">
        {err && (
          <div className="error-banner" style={{ marginBottom: '1rem' }}>
            <span>{err}</span>
            <button className="error-retry" onClick={() => setErr(null)}>✕</button>
          </div>
        )}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="monto">Monto</label>
              <input id="monto" name="monto" type="number"
                placeholder="0.00" min="0.01" step="0.01"
                value={form.monto} onChange={handle} required />
            </div>
            <div className="field field-desc">
              <label htmlFor="descripcion">Descripción</label>
              <input id="descripcion" name="descripcion" type="text"
                placeholder="¿En qué lo gastaste?"
                value={form.descripcion} onChange={handle} required />
            </div>
            <div className="field">
              <label htmlFor="fecha">Fecha</label>
              <input id="fecha" name="fecha" type="date"
                value={form.fecha} onChange={handle} required />
            </div>
            <div className="field field-submit" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : '+ Agregar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
