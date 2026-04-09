-- init.sql — Schema completo con autenticación
-- Se ejecuta solo cuando el volumen de PostgreSQL está vacío (primer arranque)

-- ── Tabla de usuarios ────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,  -- clave de login
  password_hash TEXT NOT NULL,                 -- hashed con bcryptjs
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ── Tabla de gastos (con user_id) ────────────────
CREATE TABLE IF NOT EXISTS gastos (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monto       NUMERIC(10, 2) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE
);
