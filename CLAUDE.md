# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

**Full-Stack Application:**
- **Frontend:** React 19 with Vite, React Router 7 for navigation, vanilla CSS
- **Backend:** Node.js with Express 4
- **Database:** PostgreSQL 16 with pg driver
- **Authentication:** JWT (jsonwebtoken 9), password hashing with bcryptjs
- **Deployment:** Docker Compose for local orchestration

## Project Overview

App-Gastos is a personal expense tracking application. Users register, login, and manage their expenses with dashboard statistics, full history with filtering, and basic reports. All data is user-isolated via JWT-authenticated API endpoints.

**Main Features:**
1. Secure registration/login with JWT tokens (7-day expiry)
2. Dashboard with expense stats (total, count, max, average)
3. Full expense history with search by description and month filtering
4. Basic reports view (CSS-based visualizations)
5. Responsive UI in Spanish, currency formatted in Bolivianos (Bs)

## High-Level Architecture

### Frontend Structure (frontend/src/)

- **Entry Point:** main.jsx wraps app in BrowserRouter
- **Routing:** App.jsx defines all routes with PrivateRoute and PublicRoute guards
  - Public: / (Landing), /login, /register
  - Protected: /inicio (Home), /historial (History), /reportes (Reports)
- **Auth State Management:** context/AuthContext.jsx
  - Manages token + user object globally
  - Persists to/from localStorage
  - Exports useAuth() hook for component access
- **API Layer:** services/api.js centralizes all backend calls
  - Injects Authorization header with Bearer token
  - Handles 401 responses by clearing auth state and redirecting to /login
  - services/auth.js wraps registration and login endpoints
- **Utilities:** utils/format.js provides currency and date formatting (Spanish locale, Bolivianos)
- **Pages:** pages/{Home, Historial, Reportes, Landing, Login, Register}
  - Home: stats cards + expense form + recent expenses list
  - Historial: full table with search + month filter, delete capability
  - Reportes: visualization placeholder
- **Components:** components/{GastoForm, GastoList} for form and list rendering
- **Styling:** index.css and App.css with CSS custom properties (design tokens)

### Backend Structure (backend/)

- **Entry Point:** index.js
  - Mounts auth router at /api/auth (public routes)
  - Mounts gastos router at /api/gastos (protected routes)
  - Health check at / returns { status: 'ok' }
- **Database Connection:** db.js
  - PostgreSQL pool configured from env vars
  - Logs connection status on startup
- **Authentication Routes:** routes/auth.js
  - POST /api/auth/register - creates user, returns { token, user }
  - POST /api/auth/login - validates credentials, returns { token, user }
  - Passwords hashed with bcrypt (10 salt rounds)
  - JWT expires in 7 days
- **Middleware:** middleware/auth.js
  - Extracts Bearer token from Authorization header
  - Verifies JWT and decodes userId
  - Attaches req.userId to all protected endpoints
  - Returns 401 if token missing or invalid
- **Expense Routes:** routes/gastos.js (all routes protected by authMiddleware)
  - GET /api/gastos - list all expenses for authenticated user
  - GET /api/gastos/total - sum all expenses for authenticated user
  - POST /api/gastos - create new expense (auto-associates to user)
  - DELETE /api/gastos/:id - delete if owned by user
- **Database Schema:** init.sql
  - users table: id, nombre, email (unique), password_hash, created_at
  - gastos table: id, user_id (FK to users), monto, descripcion, fecha

**Key Design Decisions:**
- All expenses are user-scoped via user_id foreign key
- Delete operations check ownership (WHERE id = $1 AND user_id = $2)
- Error messages are user-friendly and avoid exposing internal details
- No soft deletes; CASCADE delete removes expenses when user is deleted

## Build & Run Commands

### Local Development Setup

**Backend:**
```
cd backend
cp .env.example .env        # Edit .env with PostgreSQL credentials and JWT_SECRET
npm install
npm run dev                 # Runs with nodemon on port 3001
npm start                   # Single run with node
```

**Frontend:**
```
cd frontend
npm install
npm run dev                 # Vite dev server on port 5173 with HMR
npm run build              # Production build to dist/
npm run lint               # ESLint check
npm run preview            # Preview production build
```

**Database (first time):**
```
psql -U postgres -d gastos_db -f backend/init.sql
```

### Docker Compose Deployment

```
cd project-root
cp .env.example .env        # Configure POSTGRES_PASSWORD, JWT_SECRET, VITE_API_URL
docker compose build
docker compose up -d        # Starts postgres, backend, frontend in network
docker compose down         # Stop containers (preserves data)
docker compose down -v      # Stop and delete volumes (fresh database)
```

**Expected Services:**
- Frontend: http://localhost (Nginx reverse proxy)
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

## Key Configuration Files

### Environment Variables

**Backend .env** (from .env.example):
- PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE - PostgreSQL connection
- JWT_SECRET - MUST be strong/random for production
- PORT - defaults to 3001

**Frontend** (read by Vite at build time):
- VITE_API_URL - backend API base URL (defaults to http://localhost:3001 in dev)

**Docker Compose .env** (at project root):
- POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB - PostgreSQL setup
- JWT_SECRET - passed to backend
- VITE_API_URL - passed to frontend build

### Vite Config (frontend/vite.config.js)
- Uses @vitejs/plugin-react for fast refresh
- Minimal setup; no custom aliases or build optimizations configured

## Important Patterns & Conventions

### Frontend

1. **Expense List Fetching:**
   - Always use getGastos() from services/api.js (not ad-hoc fetch)
   - Returned data is plain object array with fields: id, user_id, monto, descripcion, fecha
   - Format currency with fmtBs(value) and dates with fmtDate(fecha) or fmtMonth(fecha)

2. **Form Submission:**
   - GastoForm.jsx calls createGasto() from API service
   - On success, parent (Home) updates local state immediately for UX
   - Fecha defaults to current date if not provided

3. **Error Handling:**
   - Catch blocks show generic error messages to user (avoid exposing server errors)
   - 401 responses are caught by api.js and trigger logout + redirect
   - Network errors use try/catch in page components

4. **Component Props:**
   - GastoList receives gastos array and onEliminar callback
   - GastoForm receives onCrear callback, clears form after success
   - Pages manage their own loading/error state

### Backend

1. **Protected Routes:**
   - All routes in routes/gastos.js use authMiddleware via router.use()
   - req.userId is always available after middleware passes
   - Always filter by user_id in queries to prevent data leakage

2. **Error Responses:**
   - Use consistent JSON error format: { error: "message" }
   - HTTP 400 for bad request (missing/invalid input)
   - HTTP 401 for auth failures (missing/invalid token)
   - HTTP 409 for conflicts (email already registered)
   - HTTP 404 for not found (expense does not exist or not owned by user)
   - HTTP 500 for server errors (log to console)

3. **Parameterized Queries:**
   - Always use pool.query(sql, [values]) with placeholders ($1, $2, etc.)
   - Never concatenate user input into SQL strings
   - Pool handles connection pooling automatically

## Existing Documentation

- **README.md** - Setup instructions, tech stack overview, Docker deployment
- **.github/copilot-instructions.md** - Architecture overview and conventions

## Common Tasks

### Adding a New Expense Field

1. Update backend/init.sql schema (add column to gastos table)
2. Update backend/routes/gastos.js POST/GET handlers to include field
3. Update frontend/src/components/GastoForm.jsx form inputs
4. Update frontend/src/services/api.js if new validation needed
5. Update frontend/src/pages/Historial.jsx table columns if user-visible

### Modifying Auth Logic

- JWT expiry is set in backend/routes/auth.js (expiresIn: '7d')
- Frontend auth state is in AuthContext.jsx; token/user persist to localStorage
- Logout clears localStorage and redirects; see services/api.js for 401 handling

### Styling Changes

- Use CSS custom properties defined in frontend/src/index.css
- Common properties: --accent, --muted, --border-color, --shadow
- Keep styling in vanilla CSS (no Tailwind, no CSS-in-JS)
- Ensure responsive design; mobile-first approach preferred

## Testing & Validation

**No automated test suite is configured.** Validate changes manually:
- Backend: Use curl, Postman, or the frontend app to test endpoints
- Frontend: Run dev server and test flows in the browser
- Full stack: Use Docker Compose to test all services together

## Notes for Future Development

- Reportes page is a placeholder; implement visualizations as needed
- No pagination implemented for large expense lists (consider adding if data grows)
- Frontend fetches all expenses on load; optimize with pagination or date range filters
- No input sanitization on backend; consider adding validation library (e.g., joi, zod) if complexity grows
- Consider adding update (PATCH/PUT) endpoint for expenses if edit feature is needed
