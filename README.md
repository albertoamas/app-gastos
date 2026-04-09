# 💸 Gastos Personales

Aplicacion web Full-Stack para el control de gastos personales con backend en Express, frontend en React y base de datos PostgreSQL.

## 🚀 Tecnologias

- Frontend: React, Vite, React Router y CSS nativo.
- Backend (API): Node.js, Express, bcryptjs y JWT.
- Base de datos: PostgreSQL 16.

## ✨ Funcionalidades principales

1. Dashboard con resumen de gastos.
2. Historial con busqueda por descripcion y filtro por mes.
3. Reportes visuales con CSS.
4. Registro e inicio de sesion seguros.
5. Interfaz responsiva.
6. Formato en Bolivianos (Bs).

## 🛠️ Ejecucion local

### 1. Crear base de datos en PostgreSQL

Ejecuta este script para crear tablas:

```bash
psql -U postgres -d gastos_db -f backend/init.sql
```

### 2. Configurar backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Backend disponible en http://localhost:3001

### 3. Configurar frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en http://localhost:5173

## 🐳 Despliegue con Docker Compose

### 1. Variables de entorno

En la raiz del proyecto:

```bash
cp .env.example .env
```

Actualiza `POSTGRES_PASSWORD` y `JWT_SECRET` en `.env`.

### 2. Construir y levantar los 3 servicios

```bash
docker compose build
docker compose up -d
```

Servicios esperados:
- Frontend: http://localhost
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

### 3. Apagar servicios

```bash
docker compose down
```

### 4. Reiniciar desde cero (incluyendo datos)

```bash
docker compose down -v
```

## 📂 Organizacion de carpetas

- backend/: API Node.js con rutas de auth y gastos.
- frontend/: aplicacion React con paginas, componentes y servicios.
- docker-compose.yml: orquestacion local de frontend, backend y base de datos.

## 🤝 Contribucion / Proyecto universitario

Proyecto academico para practicar arquitectura full-stack y buenas practicas de autenticacion y persistencia.
