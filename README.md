# D'DECOR · ID Card Studio

A pixel-perfect, print-ready employee ID-card studio. Full-stack modular monolith:
a **React + Vite + TypeScript** front end and a **secure Node/Express** back end, sharing one origin.

Cards are reproduced to the point from the official artwork — true **CR80** portrait
(53.98 × 85.0 mm), the exact **Barlow** typography of the source, the D'DECOR ink colour
(`#4D4D4F`), and four vector-clean brand marks. Everything renders on an HTML5 canvas in the
same coordinate system used for export, so **what you see is exactly what prints** — at
300 / 600 / 1200 DPI, with optional bleed + crop marks, as PNG or true-size PDF.

## Accounts, roles & security
The studio is behind an email + password login. Accounts are created by the superadmin from the
in-app **Users** panel (name, email, password, role). Everyone can change their own password.

**Roles (RBAC):**
| Role | Cards | Users | Audit log |
|------|-------|-------|-----------|
| **User** | sees & edits **only their own** cards | — | — |
| **Admin** | sees & edits **all** cards | — | **view** |
| **Superadmin** (platform owner) | all cards | **create users, promote user↔admin, reset/disable/delete** | **view** |

**Row-level security (RLS):** the card list and every read/update/delete are scoped server-side by
owner — a user can never see or touch another user's card, even by guessing an id.

**Audit log:** every sign-in (and failed sign-in), card **created / deleted / exported / printed**,
and account change is recorded with who/when/what/IP — searchable, with a dynamic event-type filter,
viewable by admins and the superadmin. The platform-owner superadmin is never recorded.

**Under the hood:** passwords hashed with scrypt; stateless HMAC-signed session in an `HttpOnly`,
`SameSite=Strict` cookie; login rate-limiting; Helmet CSP; validated + re-encoded uploads; no secrets
in the bundle. No external auth service.

## Features
- **Multiple workspaces** — manage many ID cards side-by-side; each auto-saves to the backend.
- **Four brand logos** — Home Fabrics (Live beautiful), Home Store, Home Ideas, Corporate.
- **Photo upload** with zoom + drag-to-reposition; server strips EXIF and re-encodes safely.
- **Saved addresses** — two built-in D'DECOR locations + your own custom, saved per browser.
- **Print quality that never degrades** — resolution-independent vector/text rendering.
- **Secure backend** — Helmet CSP, rate limiting, CORS, validated uploads (multer + sharp),
  SQLite persistence, same-origin photo serving (canvas never tainted).

## Requirements
- **Docker Desktop** (the app runs as containers: Postgres + the app server)

## Quick start (Docker)
Double-click **`start.bat`**, or:
```bash
cp .env.example .env      # first time only (edit secrets if you like)
docker compose up -d --build
```
Open **http://localhost:4000**. First login (superadmin): **admin@ddecor.com / change-Me!**

Stop with **`stop.bat`** or `docker compose down` — **your data is preserved**.
To wipe everything (and re-seed the superadmin from `.env`): `docker compose down -v`.

### Data & persistence
- **Postgres** (service `db`) stores users, cards, and the audit log in the named volume `pgdata`.
- Uploaded photos live in the `uploads` volume.
- Both survive `docker compose down` / rebuilds and are only removed by `docker compose down -v`.

### The platform-owner superadmin
Seeded **once** from `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` in `.env`. After the first boot it
lives in Postgres — you can delete those two env lines and it persists. The superadmin is **hidden**
from user management and never appears in the audit log.

## Local development (optional, without Docker)
Needs a reachable Postgres. Set `DATABASE_URL`, then:
```bash
npm run install:all
DATABASE_URL=postgres://user:pass@localhost:5432/db SUPERADMIN_EMAIL=... SUPERADMIN_PASSWORD=... npm run dev
```
API on :4000, UI on :5173 (Vite proxies /api).

## Layout
```
ddecor-id-studio/
├─ server/            Express API — auth, Postgres, upload, workspaces, audit
│  └─ src/
│     ├─ index.js     app wiring + static client (prod)
│     ├─ security.js  helmet / cors / rate-limit
│     ├─ db.js        better-sqlite3 workspace repo
│     └─ routes/      workspaces.js · upload.js
└─ client/            React + Vite front end
   └─ src/
      ├─ lib/         render.ts (card engine) · pdf.ts · exportCard.ts · api.ts
      ├─ assets/      embedded fonts + brand logos (base64)
      ├─ components/  rail · stage · inspector · export bar …
      └─ store.ts     workspace state (Zustand) + backend sync
```

## Notes on fidelity
- **Barlow Regular / SemiBold** are the *actual* fonts used in the source artwork (embedded, subset to Latin).
- The employee name uses **Helvetica Neue Thin** on machines that have it, else an embedded
  **Inter Thin** that matches its stroke weight (Helvetica Neue can't be legally redistributed).
- Logos were extracted as clean, transparent, high-resolution marks from the source.

Data lives in Docker volumes (`pgdata` for Postgres, `uploads` for photos). `docker compose down -v` resets everything.
