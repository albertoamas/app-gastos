// middleware/auth.js — Verifica el JWT en cada petición protegida

const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  // El token viene en el header: "Authorization: Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido. Inicia sesión.' });
  }

  try {
    // Verificar y decodificar el token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId; // Disponible en todas las rutas protegidas
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};
