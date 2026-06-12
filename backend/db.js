// db.js — Pool de conexión a PostgreSQL
// Usa variables de entorno para no hardcodear credenciales

const { Pool } = require('pg');

// El Pool gestiona múltiples conexiones de forma eficiente
const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     process.env.PGPORT     || 5432,
  user:     process.env.PGUSER     || 'gastos_user',
  password: process.env.PGPASSWORD || 'gastos_pass',
  database: process.env.PGDATABASE || 'gastos_db',
  // PGSSL=true requerido para Azure Database for PostgreSQL
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Verificar conexión al arrancar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL');
    release();
  }
});

module.exports = pool;
