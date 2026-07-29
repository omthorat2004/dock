---
name: backend-fastapi
description: Conventions for the Dock FastAPI backend — Poetry src layout, router/service/DAO layering, async MongoDB, Pydantic schemas, the exception hierarchy, hashing and the access/refresh token flow. Load before editing anything under backend/.
---

# Backend — FastAPI + Poetry + MongoDB

Stack: **FastAPI**, Python 3.12+, Poetry (src layout), **MongoDB** via the native
async `pymongo` client, Pydantic v2 / pydantic-settings, PyJWT, bcrypt.
Located in `backend/`.

MongoDB, not SQL: the data is document-shaped (a space owns its lesson, topics and
canvas layout) and there is no relational model to preserve. There is no ORM, no
SQLAlchemy and no Alembic. Beanie is **not** usable here — it does not support
Python 3.14, which this environment runs.

## Layout

```
backend/
  pyproject.toml          # Poetry; packages = [{include = "app", from = "src"}]
  src/app/
    main.py               # FastAPI instance, CORS, lifespan, error handlers, router
    dependencies.py       # DbDep, AuthServiceDep, UserServiceDep, SpaceServiceDep,
                          # CurrentUser, AIProviderDep
    router/               # HTTP layer — __init__.py aggregates api_router
      auth.py  health.py  user.py  spaces.py
    services/             # business logic, class-based (AuthService, UserService,
                          # SpaceService)
    dao/                  # data access, class-based (BaseDAO, UserDAO, SpaceDAO, ...)
    ai/                   # AIProvider ABC, GeminiProvider, build_provider factory
    models/               # Pydantic document models (+ from_document/to_document)
    schemas/              # request/response models
    core/                 # config, constants, security, hashing, cookies, exceptions, error_handlers
    db/mongo.py           # client, get_db, connect/disconnect, indexes
  tests/
```

## Layering rule

`router → service → dao → mongo`.

- **Routers** parse input and return schemas. No queries, no business rules.
- **Services** are classes holding the rules (`AuthService(db)`). They raise domain
  errors from `core.exceptions` — never `HTTPException`.
- **DAOs** are classes extending `BaseDAO`, one per collection. They are the *only*
  place a Mongo query is written, and they speak documents and models — not HTTP.

A router that builds a filter dict, or a DAO that raises an HTTP error, is wrong.

## Errors

`core/exceptions.py` defines `AppError` as the base, with `status_code`, `code` and
`message`, plus the subclasses services actually raise (`NotFoundError`,
`ConflictError`, `AuthenticationError`, `EmailAlreadyRegistered`, …). Add new domain
errors there rather than reaching for `HTTPException`.

`core/error_handlers.py` registers global handlers in `main.py` so **every** error
leaves the API in one shape:

```json
{ "code": "email_already_registered", "detail": "An account with that email already exists." }
```

Handlers cover `AppError`, `RequestValidationError` (flattened to one message plus
`field`), `StarletteHTTPException`, the AI provider SDK error (see *AI providers*),
and a catch-all that logs the traceback and returns a generic 500. Never let a
driver message or stack trace reach a client.

## Async everything

- Routes, dependencies, services and DAOs are `async def`.
- The database comes from `DbDep`; never construct a client in a service. One
  `AsyncMongoClient` per process, created in `db/mongo.py` — it pools internally.
- Indexes are declared in `connect()`: unique on `users.email`, plus a TTL index on
  `refresh_tokens.expires_at` so Mongo evicts dead sessions. `spaces` has **no**
  custom index by the owner's explicit call — do not add one there without asking,
  even though `GET /spaces` filters on `user_id`.
- Correctness is enforced by indexes, not by read-then-write checks. Registration
  inserts and catches `DuplicateKeyError`; checking first leaves a race.
- Work the response does not depend on goes on FastAPI's `BackgroundTasks`, passed
  into the service that queues it — chat's rolling summary is the case in point.
  It is not a task queue: it runs in-process once the response is out, so only
  queue work that is safe to lose and safe to repeat.

## Documents and schemas

- Mongo stores the id as `_id`; the app calls it `id`. That seam exists **only** in
  `Model.from_document()` / `to_document()` — nothing else touches `_id`.
- Primary keys are UUID strings **where the app mints them** (`users`,
  `refresh_tokens`). `spaces` is the exception: it has no natural key, so Mongo
  generates the `_id` and the model carries `id: str | None`, unset until the
  insert returns. Such a model's `to_document()` must **drop** `_id` — writing an
  explicit `None` stores a null id instead of letting the server generate one.
- Timestamps are timezone-aware UTC (`utcnow()`).
- Request and response schemas are separate. A response model never exposes
  `hashed_password`; return `Schema.model_validate(obj, from_attributes=True)`.
- Validation lives on the schema (`field_validator`) so FastAPI returns 422 before
  any service runs. Emails are normalised to lowercase on the way in.
- Every route declares `response_model`, an explicit non-200 `status_code`, a
  `summary`, and `tags` on its router.
- New models must be re-exported from `app/models/__init__.py`.

## Hashing (`core/hashing.py`)

Two jobs, two algorithms — do not mix them up:

- **Passwords** → `PasswordHasher` (bcrypt): slow and salted, because passwords are
  low-entropy and guessable. Inputs are capped at 72 bytes; bcrypt silently
  truncates beyond that.
- **Opaque tokens we verify** → `TokenHasher` (HMAC-SHA256 keyed with
  `secret_key`): fast and *deterministic*, so a record can be found by its hash.
  bcrypt cannot do that. This is what stores refresh tokens.

Both verifications are constant-time. Never bcrypt an opaque token; never SHA-256 a
password.

A user's **AI provider API key is the exception**: we have to replay it to the
vendor, so it cannot be hashed (hashing is one-way). It lives on the user document
as `api_key`, must be **encrypted at rest** before production, and is never
returned to the client — only whether one is set (`has_api_key`).

## Auth: access + refresh

- **Access token** — 15 minutes, sent on every request, not stored server-side.
- **Refresh token** — 30 days, used only to mint a new pair, stored *hashed* in
  `refresh_tokens` so it can be rotated and revoked.
- Both are JWTs carrying a `type` claim. `decode_token` verifies that claim, so a
  refresh token cannot be used as an access token — without it, the short access
  lifetime means nothing.
- **Rotation**: every `/auth/refresh` revokes the presented token and issues a new
  pair. Replaying an already-rotated token is treated as a leak: **every** session
  for that user is revoked.
- **Cookies** (`core/cookies.py`): the API sets `dock_access` and `dock_refresh` as
  httpOnly cookies on register, login and refresh, and clears them on logout. The
  frontend stores nothing. `COOKIE_SECURE` must be true in production — the config
  refuses to boot otherwise.
- **Response bodies carry no tokens.** Register / login / refresh return
  `AuthResponse` (`{ message, user }`); the tokens live only in the cookies. The
  body never exposes the access or refresh token.
- `get_current_user` reads the access token from the cookie first, falling back to
  a bearer header for scripts and tests. Auth is enforced by the `CurrentUser`
  dependency, never by ad-hoc checks in a route body.
- Login failures return one generic 401 for every cause — never reveal whether an
  email exists. Registration's 409 is the one intentional exception.

## Spaces (`models/space.py`)

One space is one lesson. The document is nested rather than split across
collections — a topic's videos and chat session belong to that topic and are never
queried on their own:

```
Space { user_id, lesson_name, topics[], created_at, updated_at }
  Topic { topic_name, youtube_links[], session }
    TopicSession { session_id, limit_reached, created_at, updated_at }
```

- `lesson_name` is **not unique**. A student may re-share the same lesson when
  their syllabus changes, so two spaces with one name is a valid state.
- A topic's `session` starts empty — `session_id` is None until the student opens
  the card and chats, which is what `TopicSession.start()` is for. Its timestamps
  describe the chat, so they only begin when the chat does.
- `POST /spaces` accepts topic **names** only (`{ lesson_name, topics: [str] }`,
  both required). Videos and sessions are server-owned; a client cannot seed them.
  The schema trims, drops blanks and collapses case-insensitive duplicates.
- `GET /spaces` returns `SpaceSummary` — `{ id, lesson_name, topic_count,
  created_at, updated_at }`, newest `updated_at` first. It never sends the topics:
  the count comes from Mongo via a `$size` projection, so listing twenty spaces
  does not drag twenty topic arrays (with their links and sessions) across the
  wire. Add fields to that projection rather than fetching whole documents.

## AI providers (`app/ai/`)

Chat runs through a provider abstraction, so no vendor SDK is imported outside
`app/ai/`:

- `AIProvider` (ABC) has two async methods: `chat(message) -> str`, and
  `chat_with_tools(message, tools, handler) -> str` for a prompt the model may
  answer by calling tools first. A tool is a vendor-neutral `ToolSpec` (name,
  description, JSON-Schema `parameters`); the `handler` runs one call and returns
  anything JSON-serialisable. **Handler exceptions are not caught** — a tool that
  fails because its downstream service is down ends the request with that error
  rather than leaving the model to improvise around it.
- `GeminiProvider` wraps `google-genai` (`client.aio.interactions.create`). Its
  tool loop continues the same interaction by `previous_interaction_id` rather
  than resending the transcript, and is bounded by `max_rounds`.
- `build_provider(user)` picks the provider from the user's stored preferences —
  `model_name` selects the family (only `"gemini"` today), `model_version` is the
  model string. It raises `ApiKeyNotConfigured` (401) when the user has no key.
- The `AIProviderDep` dependency runs that check and injects a ready provider, so
  a route needing the model never re-checks the key. The user sets their key +
  model through `POST /users/api-key` (`UserService`); `DELETE` clears it.
  Defaults live in `core/constants.py` (`DEFAULT_MODEL_NAME`,
  `DEFAULT_MODEL_VERSION`).
- **Vendor SDK errors are handled globally.** A dedicated
  `google.genai.errors.APIError` handler in `core/error_handlers.py`
  (`classify_provider_error`) maps them: rate limit → 429 `provider_rate_limited`,
  over the context window → 413 `token_limit_reached`, rejected key → 401
  `invalid_provider_key`, otherwise → 502 `provider_error`. Providers let the SDK
  error propagate — the handler is the one place it is translated.

## Config

- Everything goes through `app.core.config.Settings` (pydantic-settings, `.env`).
  Never read `os.environ` in application code.
- `get_settings()` is `lru_cache`d and refuses to boot production with the default
  `secret_key` or with insecure cookies.
- Secrets stay in `.env` (gitignored); `.env.example` documents every key.
- `youtube_api_key` is Dock's own, unlike the per-user AI key: YouTube search is
  server quota. Unset means the video shelf answers 503 `youtube_unavailable`,
  never a fallback that lets the model invent links.
- CORS origins are explicit. Never `allow_origins=["*"]` with credentials enabled —
  the browser rejects it, and cookie auth depends on credentials.

## Commands

```bash
cd backend
poetry install
poetry run fastapi dev src/app/main.py     # http://127.0.0.1:8000/docs
poetry run pytest -q                        # needs a local mongod on :27017
poetry run ruff check . && poetry run ruff format .
poetry add <pkg>                            # never hand-edit pyproject deps
```

Tests run against a real `dock_test` database and drop it between tests; there is
no mocking layer. Keep it that way — index behaviour and rotation semantics are
exactly what mocks would get wrong.

## Style

- Full type hints; modern syntax (`str | None`, `list[str]`).
- Ruff is linter and formatter, 88 columns.
- Docstrings on modules and non-obvious functions; skip the obvious ones.
