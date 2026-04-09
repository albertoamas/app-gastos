// routes/auth.js — Register y Login

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db');
const router   = express.Router();

// Helper: genera un JWT con el userId
function generarToken(userId) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Token válido por 7 días
  );
}

// ── POST /api/auth/register ──────────────────────
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son requeridos.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    // Verificar si el email ya está registrado
    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existe.rowCount > 0) {
      return res.status(409).json({ error: 'Este email ya está registrado.' });
    }

    // Hashear la contraseña (10 salt rounds)
    const password_hash = await bcrypt.hash(password, 10);

    // Crear el usuario
    const result = await pool.query(
      'INSERT INTO users (nombre, email, password_hash) VALUES ($1, $2, $3) RETURNING id, nombre, email',
      [nombre.trim(), email.toLowerCase().trim(), password_hash]
    );

    const user  = result.rows[0];
    const token = generarToken(user.id);

    res.status(201).json({ token, user: { id: user.id, nombre: user.nombre, email: user.email } });
  } catch (err) {
    console.error('Error en registro:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ── POST /api/auth/login ─────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email y password son requeridos.' });
  }

  try {
    // Buscar usuario por email
    const result = await pool.query(
      'SELECT id, nombre, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const user = result.rows[0];

    // Comparar contraseña con el hash almacenado
    const coincide = await bcrypt.compare(password, user.password_hash);
    if (!coincide) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const token = generarToken(user.id);

    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email } });
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
