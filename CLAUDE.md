# Dock — working notes

Dock is a revision workspace: one **space per lesson**, holding that lesson and its
syllabus section, with the lesson's topics laid out as cards on a grid canvas.

## Read the skills first

`.claude/skills/` is the source of truth. Load the relevant one *before* editing:

| Skill | When |
| --- | --- |
| `product-model` | Any feature, user-facing copy, or naming a model/route/collection |
| `design-system` | Any UI, CSS, Tailwind class or layout |
| `frontend-nextjs` | Anything under `frontend/` |
| `backend-fastapi` | Anything under `backend/` |

## Non-negotiables

- **Next.js does not proxy the API.** No `app/api/**/route.ts`, no server-side
  fetch to the backend, no server actions for data. The browser calls FastAPI
  directly through the axios instance in `lib/axios.config.ts`.
- **The backend owns the session.** It sets httpOnly cookies; the frontend stores
  nothing — no `localStorage`, no token in JS.
- **No file uploads.** No PDFs, slides or attachments. Lessons and syllabus come in
  as text. Also out of scope: assignments, grading, collaboration, payments.
- **Spaces are lesson-scoped**, never subject- or course-scoped.
- Layering is `router → service → dao` on the backend, and
  `component → hook → *-api.ts → axios` on the frontend. Skipping a layer is a bug.

## Commands

```bash
# backend (needs mongod on :27017)
cd backend && poetry run fastapi dev src/app/main.py
cd backend && poetry run pytest -q && poetry run ruff check .

# frontend
cd frontend && npm run dev
cd frontend && npx tsc --noEmit && npx eslint . && npm run build
```

Run both on `localhost` (not `127.0.0.1`) — the `SameSite=lax` auth cookies depend
on the two being same-site.

If `tsc` reports a missing module for a route that was moved, the generated route
types are stale: `npx next typegen`.

## State of play

Built: marketing site (`/`, `/features`, `/about`), auth (register, login, logout,
refresh rotation), signed-in shells (`/dashboard`, `/spaces`), theming, error and
loading boundaries.

Next: creating a space (share a lesson + its syllabus section), topic extraction,
the canvas with persisted card layout. Then per-topic chat and the video shelf.
