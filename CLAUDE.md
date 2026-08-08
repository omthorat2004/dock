# Dock working notes

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
  nothing: no `localStorage`, no token in JS.
- **A provider key is never stored in plaintext.** It cannot be hashed (it goes to
  the vendor on every call), so it is AES-256-GCM encrypted in `core/crypto.py`,
  bound to its owner's id, and stored as `api_key_encrypted`. Only
  `build_provider` sees the plaintext, and the API returns `has_api_key`, never
  the key.
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
- **A YouTube link is never the model's own.** The model calls the `search_youtube`
  tool and picks from what came back; ids it writes itself select nothing. Search
  lives in `core/youtube.py` and needs `YOUTUBE_API_KEY`; without it the shelf
  answers 503, it does not fall back to guessing.
- The 20/5/10 limits live in `models/space.py` and `models/chat.py`, mirrored for
  the UI only in `frontend/src/lib/constants.ts`. The server is the authority;
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

Run both on `localhost` (not `127.0.0.1`), because the `SameSite=lax` auth cookies depend
on the two being same-site.

If `tsc` reports a missing module for a route that was moved, the generated route
types are stale: `npx next typegen`.

## State of play

Built: marketing site (`/`, `/features`, `/about`), auth (register, login, logout,
refresh rotation), signed-in shells (`/dashboard`, `/spaces`), theming, error and
loading boundaries. Creating a space (`POST /spaces`) and listing them as cards
(`GET /spaces`, summary only: lesson, topic count, timestamps). The space canvas
at `/space/<lesson-name>-<id>`, with pan, zoom and the lesson centred among its
topic cards, now loads the real space from `GET /spaces/{id}`; the demo fixture
is gone.

Learn mode and the video shelf are live, both on the user's own key via
`AIProviderDep`:

- **Chat**: `POST /spaces/{id}/topics/{topic_id}/chat`, and `…/chat/stream` for
  the same turn as `text/event-stream`, which is what the panel uses. Both go
  through `ChatService.prepare_turn`, so the checks that must happen before the
  model — ownership, then a closed session — are written once. A streamed reply
  is stored as **one** message when the provider stops, never rewritten per
  fragment. The split that matters is where a failure can be reported: anything
  known before the first byte is an ordinary status code, and anything after it
  is an SSE `error` frame carrying the same `{code, detail}`, because the status
  line is already spent. **The browser reads that stream with `fetch`, not
  axios** — XHR cannot surface a partial body — so `chat-api.ts` re-does by hand
  the two things the interceptor did: the shared `refreshSession()` retry on 401,
  and normalising failures to `ApiError`. It is the one sanctioned exception to
  the axios-only rule; do not spread it.
  Each prompt carries one
  rolling summary plus the last `RECENT_MESSAGE_WINDOW` (10) messages, so the
  conversation stays bounded. Overflow past the window is folded into the
  session's single summary, which is *replaced*, never appended to. A provider
  token-limit error sets `TopicSession.limit_reached`, and later sends are
  refused with 413 before the model is called. Rolling the summary is a second
  model call, so it is queued on `BackgroundTasks` and runs *after* the reply is
  sent, and a turn it misses is folded in by the next one.
- **Videos**: `POST /spaces/{id}/topics/{topic_id}/videos`. Five per request,
  `MAX_YOUTUBE_LINKS` (20) in total. The model reaches YouTube through the
  `search_youtube` tool (`AIProvider.chat_with_tools`), once per audience,
  `india` (regionCode IN) and `global` (US), and then picks from the hits. The
  shelf alternates between the two audiences, so it is never all one or the
  other, and it is filled from the search results even when the model's reply is
  useless. Only embeddable videos are searched for, and the stored title is
  YouTube's own. Search failures are their own answers: 429
  `youtube_rate_limited` for spent quota, 503 `youtube_unavailable` for no key
  or an unreachable API, checked *before* the model is called. Videos open in
  the **same panel slot as learn mode**, with an embedded player.

Next: topic extraction from the lesson text (topics are still typed in by hand at
create time), a persisted card layout to replace the derived ring in
`lib/topic-layout.ts`, and real revision progress; the topic card's bar is
honestly hard-wired to "Not started" until something feeds it.
