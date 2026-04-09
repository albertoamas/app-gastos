# Project Guidelines

## Architecture
- Full stack app with PostgreSQL, Express API, and React app running locally with Vite.
- Backend boundaries:
  - `backend/routes/auth.js`: registration/login and JWT issuance.
  - `backend/middleware/auth.js`: Bearer token verification for protected endpoints.
  - `backend/routes/gastos.js`: authenticated CRUD-like operations for expenses.
  - `backend/db.js`: PostgreSQL pool and connection settings from env vars.
- Frontend boundaries:
  - `frontend/src/context/AuthContext.jsx`: auth state, localStorage persistence, route guards.
  - `frontend/src/services/api.js`: centralized fetch logic, auth header injection, 401 handling.
  - `frontend/src/components/`: reusable UI units.
  - `frontend/src/pages/`: route-level screens.

## Build And Run
- Backend local dev:
  - `cd backend && npm install`
  - `npm run dev` (nodemon) or `npm start`
- Frontend local dev:
  - `cd frontend && npm install`
  - `npm run dev`
  - `npm run lint`
  - `npm run build`
- No automated test suite is configured yet; validate changes manually using the app flows and API endpoints.

## Conventions
- Keep user-facing copy and formatting in Spanish and preserve Bolivianos formatting behavior from `frontend/src/utils/format.js`.
- Keep styling in plain CSS and existing design token patterns (CSS custom properties in `frontend/src/index.css` and related files).
- Route protection rules:
  - Protected backend routes must use auth middleware.
  - Frontend should use existing route guard behavior in `AuthContext` for authenticated vs public routes.
- API calls should go through `frontend/src/services/api.js` rather than ad-hoc fetch logic in components.
- Preserve ownership checks in expense operations (user can only access/delete own records).

## Environment And Pitfalls
- Use `backend/.env.example` to create `backend/.env` for local backend configuration.
- `JWT_SECRET` in backend `.env` must be set to a strong secret outside development.
- `VITE_API_URL` is read by Vite in development; keep it aligned with backend URL.
- Run `backend/init.sql` manually in your local PostgreSQL before first backend start.

## Docs
- High-level setup and features: `README.md`
- Execution and architecture walkthrough: `walkthrough.md`
- Implementation checklist/status: `task.md`
- Planning notes and intended structure: `implementation_plan.md`
