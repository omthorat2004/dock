# Dock

A revision workspace. A student creates a **space for one lesson**, shares that
lesson and the syllabus section it covers, and the space lays the lesson's topics
out as cards on a grid canvas. Clicking a card opens a tutor scoped to that topic,
or the videos matched to it.

This repo currently holds the **foundation**: the marketing site, accounts, and the
Next.js + FastAPI base. Spaces and the canvas come next.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Data layer | axios (single global instance) + TanStack Query v5 |
| Backend | FastAPI, Python 3.12+, Poetry (src layout) |
| Database | MongoDB (native async `pymongo`) |
| Auth | JWT access + refresh, rotated, in httpOnly cookies |

The frontend talks to FastAPI **directly**. Next.js does not proxy the API — there
are no route handlers forwarding requests.

## Running it

You need Node 20+, Python 3.12+, Poetry, and a MongoDB on `localhost:27017`.

**Backend** — http://localhost:8000/docs

```bash
cd backend
cp .env.example .env
poetry install
poetry run fastapi dev src/app/main.py
```

**Frontend** — http://localhost:3000

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Use `localhost` (not `127.0.0.1`) for both. The auth cookies are `SameSite=lax`,
so the two must stay same-site or the browser will drop them.

## Checks

```bash
cd backend  && poetry run pytest -q && poetry run ruff check .
cd frontend && npx tsc --noEmit && npx eslint . && npm run build
```

Backend tests run against a real `dock_test` database and drop it between tests.

## Layout

```
.claude/skills/     product-model, design-system, frontend-nextjs, backend-fastapi
backend/src/app/    router/ → services/ → dao/ → mongo
frontend/src/       app/ (route groups), components/, hooks/, lib/
```

## Pages

| Route | What it is |
| --- | --- |
| `/` | Landing — hero, canvas preview, how it works |
| `/features` | Spaces, canvas, learn mode, video shelf, progress |
| `/about` | Why it exists, principles, roadmap |
| `/login`, `/register` | Auth, split layout |
| `/dashboard`, `/spaces` | Signed-in shells, behind `AuthGuard` |

## Conventions

The `.claude/skills/` directory is the source of truth for how this codebase is
written — product vocabulary and scope, the design system, and the frontend and
backend conventions. Read the relevant one before changing that area.
