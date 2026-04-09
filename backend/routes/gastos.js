// routes/gastos.js — Rutas protegidas por JWT, filtradas por user_id

const express       = require('express');
const router        = express.Router();
const pool          = require('../db');
const authMiddleware = require('../middleware/auth');

// Aplicar autenticación a TODAS las rutas de este router
router.use(authMiddleware);

// ── GET /api/gastos — Solo los gastos del usuario autenticado ──
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gastos WHERE user_id = $1 ORDER BY fecha DESC, id DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener gastos:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/gastos/total ────────────────────────────────────
router.get('/total', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE user_id = $1',
      [req.userId]
    );
    res.json({ total: parseFloat(result.rows[0].total) });
  } catch (err) {
    console.error('Error al obtener total:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/gastos — Crear gasto para el usuario autenticado ─
router.post('/', async (req, res) => {
  const { monto, descripcion, fecha } = req.body;

  if (!monto || !descripcion || !fecha) {
    return res.status(400).json({ error: 'monto, descripcion y fecha son requeridos.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO gastos (user_id, monto, descripcion, fecha) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, monto, descripcion, fecha]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al crear gasto:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── DELETE /api/gastos/:id — Solo si pertenece al usuario ──────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM gastos WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }
    res.json({ message: 'Gasto eliminado', gasto: result.rows[0] });
  } catch (err) {
    console.error('Error al eliminar gasto:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
