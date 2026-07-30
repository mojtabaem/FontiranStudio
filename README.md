# FontiranStudio

Browser-based Persian typography design editor for Fontiran customers.

## Stack

- **Frontend:** React + TypeScript + Vite + Zustand + DOM/SVG renderer + harfbuzzjs
- **Backend:** NestJS + Prisma + PostgreSQL
- **Auth:** Mock Fontiran provider (swap to real API at publish time)

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (required — all services run in containers)

## Quick start

```bash
# 1. Seed open-source Persian fonts into mock/fonts/ (or drop your own .ttf/.otf/.woff2)
node scripts/download-seed-fonts.mjs

# 2. Start Postgres + API + Vite
docker compose up --build
```

| Service  | URL |
|----------|-----|
| Editor   | http://localhost:5173 |
| API      | http://localhost:3000/api |
| Admin UI | http://localhost:3000/admin |

Admin API endpoints require header: `x-admin-token: admin-dev-token`

## Mock Fontiran login

With `FONTIRAN_PROVIDER=mock` (default), clicking **ورود از طریق فونت‌ایران** authenticates a configured test user and grants every font discovered under `mock/fonts/`.

Font files are scanned on backend startup — no config file needed. Metadata (family, weight, variable axes, OpenType features) is parsed from the binaries.

## Fontiran.com API contract (for later)

When ready to publish, implement these on Fontiran.com and set `FONTIRAN_PROVIDER=real`:

```ts
// Entitlements after OAuth callback
{
  user: { id: string; phone?: string; email?: string };
  fonts: [{ fontiranId: string; name: string }];
}
```

Studio stores font files locally; Fontiran only sends IDs/names.

## Project layout

```
frontend/     React editor
backend/      NestJS API
mock/fonts/   Drop font files here
UI Template/  Original static design reference
docker-compose.yml
```

## Architecture notes

- Document model (Zustand) is the source of truth; DOM/SVG is the renderer
- Text uses browser shaping + CSS `font-feature-settings` / `font-variation-settings`
- Text → outline uses HarfBuzz WASM (`harfbuzzjs`) for correct Persian joining
- Autosave: localStorage (~1s) then backend PUT (~10s idle)
- Undo/redo: 5 snapshots
- Max 7 layers per design
