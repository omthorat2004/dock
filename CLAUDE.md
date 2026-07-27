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
- A space's URL is `/space/<lesson-name>-<id>`. Build and parse it with
  `lib/space-url.ts`; never hand-concatenate the segment.
- The canvas pans and zooms with **one CSS transform on one wrapper**, and the
  cards reach it as `children` so a pan never re-renders them. No canvas element,
  no graph library.
- **A YouTube link is never stored on the model's word.** Every candidate is
  verified through `core/youtube.py` first; unverified links do not reach Mongo.
- The 20/5/10 limits live in `models/space.py` and `models/chat.py`, mirrored for
  the UI only in `frontend/src/lib/constants.ts`. The server is the authority —
  the client copies exist so a card can retire its own button, not so it can
  decide.

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
loading boundaries. Creating a space (`POST /spaces`) and listing them as cards
(`GET /spaces`, summary only — lesson, topic count, timestamps). The space canvas
at `/space/<lesson-name>-<id>` — pan, zoom, the lesson centred with topic cards
around it — now loads the real space from `GET /spaces/{id}`; the demo fixture
is gone.

Learn mode and the video shelf are live, both on the user's own key via
`AIProviderDep`:

- **Chat** — `POST /spaces/{id}/topics/{topic_id}/chat`. Each prompt carries one
  rolling summary plus the last `RECENT_MESSAGE_WINDOW` (10) messages, so the
  conversation stays bounded. Overflow past the window is folded into the
  session's single summary, which is *replaced*, never appended to. A provider
  token-limit error sets `TopicSession.limit_reached`, and later sends are
  refused with 413 before the model is called.
- **Videos** — `POST /spaces/{id}/topics/{topic_id}/videos`. Five per request,
  `MAX_YOUTUBE_LINKS` (20) in total. The model only *suggests*; every candidate
  is resolved against YouTube's oEmbed endpoint and the dead ones are dropped,
  so an empty result is a normal success. The stored title is YouTube's own.
  Videos open in the **same panel slot as learn mode**, with an embedded player.

Next: topic extraction from the lesson text (topics are still typed in by hand at
create time), a persisted card layout to replace the derived ring in
`lib/topic-layout.ts`, and real revision progress — the topic card's bar is
honestly hard-wired to "Not started" until something feeds it.
