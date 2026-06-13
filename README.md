# Rozes Skincare · Stock & Sales

Premium stock-management and sales-tracking dashboard for the Rozes Skincare brand.

- **Frontend** — React 18 + Vite + Tailwind + shadcn-style UI primitives + Recharts + Tesseract.js (OCR)
- **Backend** — Express + node-postgres + JWT auth (httpOnly cookie) + bcrypt
- **Database** — PostgreSQL 13+

## First-time setup

### 1 — Install dependencies (frontend + server)

```powershell
npm install
npm run server:install
```

### 2 — Configure the database connection

The server reads `server/.env`. The default for local Postgres is already filled in:

```
DATABASE_URL=postgresql://postgres:sabari12345@localhost:5432/stock_roze
JWT_SECRET=rozes-dev-secret-change-me-in-production
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

Update password / database name if yours differ.

### 3 — Run schema migrations + seed demo data

```powershell
npm run db:migrate
npm run db:seed
```

This creates the tables (`users`, `products`, `sales_entries`, `notifications`)
and inserts the demo admin user plus 8 products and ~60 days of fake sales.

### 4 — Run both servers

```powershell
npm run dev:all
```

This boots:
- API on http://localhost:3001
- Web on http://localhost:5173 (Vite proxies `/api` to the API)

Sign in with **`admin@rozeskin.com` / `rozes123`**.

> If you prefer separate terminals: `npm run dev:server` in one, `npm run dev` in the other.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev:all` | Run frontend + backend together |
| `npm run dev` | Frontend only |
| `npm run dev:server` | Backend only |
| `npm run build` | Build frontend for production |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run db:seed` | Seed demo data (idempotent — only seeds if empty) |

## Project layout

```
d:\rozeskin\
├── src/                      # React frontend
│   ├── api/base44Client.js   # HTTP client (talks to /api)
│   ├── components/
│   ├── context/
│   ├── pages/
│   └── utils/
├── server/                   # Express + Postgres backend
│   ├── migrations/
│   │   ├── 001_init.sql
│   │   └── runner.js
│   ├── src/
│   │   ├── index.js          # server entry
│   │   ├── db.js             # pg pool + transactions
│   │   ├── seed.js           # demo data
│   │   ├── middleware/auth.js
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── products.js
│   │       ├── sales.js
│   │       ├── notifications.js
│   │       ├── utils.js      # recordSales, restock, reverseSale
│   │       └── admin.js      # backup/restore/wipe/reset
│   └── .env                  # DB connection + JWT secret
└── package.json
```

## API surface

All endpoints are under `/api` and require a valid `rozes_session` cookie
(set by `POST /api/auth/login`).

| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/health`               | DB/connection ping |
| POST   | `/api/auth/login`           | Sign in |
| POST   | `/api/auth/logout`          | Sign out |
| GET    | `/api/auth/me`              | Current user (or null) |
| PATCH  | `/api/auth/me`              | Update profile |
| GET    | `/api/products`             | List products (`?sort=-created_date&limit=100`) |
| POST   | `/api/products`             | Create product |
| PATCH  | `/api/products/:id`         | Update product |
| DELETE | `/api/products/:id`         | Delete product |
| GET    | `/api/sales`                | List sales entries |
| POST   | `/api/sales`                | Create sale (no stock deduction — use /utils/record-sales) |
| DELETE | `/api/sales/:id`            | Delete sale (no stock return — use /utils/reverse-sale) |
| GET    | `/api/notifications`        | List notifications |
| PATCH  | `/api/notifications/:id`    | Mark read |
| DELETE | `/api/notifications/:id`    | Remove |
| POST   | `/api/utils/record-sales`   | Atomic: insert sales + deduct stock + auto-notify |
| POST   | `/api/utils/restock`        | Add to stock_quantity + initial_stock |
| POST   | `/api/utils/reverse-sale`   | Remove sale + return stock |
| GET    | `/api/admin/export`         | Full data export (JSON) |
| POST   | `/api/admin/import`         | Replace all data |
| POST   | `/api/admin/wipe`           | Truncate all entity tables |
| POST   | `/api/admin/reset-demo`     | Wipe + reseed demo data |
```
