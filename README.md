# Dock

A revision workspace. A student creates a **space for one lesson**, shares that
lesson and the syllabus section it covers, and the space lays the lesson's topics
out as cards on a grid canvas. Clicking a card opens a tutor scoped to that topic,
or the videos matched to it.

This repo currently holds the **foundation plus spaces**: the marketing site,
accounts, per-user AI setup (bring a Gemini key, pick a model), and creating and
listing spaces against the API. A space's canvas — the lesson in the middle, topic
cards around it, videos and chat on each card — is built as UI and renders
placeholder content; topic extraction, a persisted card layout and live chat come
next.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Data layer | axios (single global instance) + TanStack Query v5 |
| Backend | FastAPI, Python 3.12+, Poetry (src layout) |
| Database | MongoDB (native async `pymongo`) |
| Auth | JWT access + refresh, rotated, in httpOnly cookies (responses carry `{ message, user }`, never tokens) |
| AI | Bring-your-own Gemini key + model, behind an `app/ai` provider abstraction |
| Client state | zustand — auth status only; the server (TanStack Query) stays the source of truth |

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
backend/src/app/    router/ → services/ → dao/ → mongo, plus ai/ (provider layer)
frontend/src/       app/ (route groups), components/ (spaces/ = the list,
                    space/ = one space's canvas), hooks/, lib/
```

## Pages

| Route | What it is |
| --- | --- |
| `/` | Landing — hero, canvas preview, how it works |
| `/features` | Spaces, canvas, learn mode, video shelf, progress |
| `/about` | Why it exists, principles, roadmap |
| `/login`, `/register` | Auth, split layout, behind `AuthProvider` |
| `/dashboard`, `/spaces` | Your spaces as cards, plus create — behind `ProtectedProvider` |
| `/space/<lesson-name>-<id>` | One space's canvas: pan, zoom, topic cards, videos, learn mode |
| `/api-key` | Configure your Gemini key + model (signed-in) |

The space segment is `lesson-name-<id>`; the whole string is the route param and
only the trailing id is load bearing (`lib/space-url.ts`).

## Conventions

The `.claude/skills/` directory is the source of truth for how this codebase is
written — product vocabulary and scope, the design system, and the frontend and
backend conventions. Read the relevant one before changing that area.
