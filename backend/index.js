// index.js — Entry point del servidor Express

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());

// ── Rutas públicas (no requieren auth) ──────────
const authRouter   = require('./routes/auth');
app.use('/api/auth', authRouter);

// ── Rutas protegidas (requieren JWT) ────────────
const gastosRouter = require('./routes/gastos');
app.use('/api/gastos', gastosRouter);

// Ruta raíz — health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API de Control de Gastos ✅' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
