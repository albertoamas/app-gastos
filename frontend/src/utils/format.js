// utils/format.js — Funciones compartidas de formato

// Formatea un número como Bolivianos: Bs 1.234,50
export const fmtBs = (n) =>
  'Bs ' + parseFloat(n || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Formatea fecha "2026-04-05" → "5 abr. 2026"
export const fmtDate = (s) => {
  const [y, m, d] = s.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('es-BO', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

// Formatea fecha → "abril 2026" (para agrupar por mes)
export const fmtMonth = (s) => {
  const [y, m] = s.split('-');
  return new Date(y, m - 1, 1).toLocaleDateString('es-BO', {
    month: 'long', year: 'numeric',
  });
};
