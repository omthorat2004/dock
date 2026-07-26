---
name: frontend-nextjs
description: Conventions for the Dock Next.js frontend — App Router structure, Next 16 breaking changes, axios + TanStack Query data layer, cookie auth with refresh rotation, forms and theming. Load before editing anything under frontend/.
---

# Frontend — Next.js (App Router)

Stack: **Next.js 16**, React 19, TypeScript (strict), Tailwind CSS v4,
**axios**, **TanStack Query v5**, **zustand** (auth state only), ESLint. Located in
`frontend/`. Pair this with the `design-system` skill for anything visual.

> This is **not** the Next.js in your training data. `frontend/AGENTS.md` says it
> outright: read `node_modules/next/dist/docs/` before using an API you are
> unsure of. The v16 upgrade notes are at
> `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.

## Architecture: FastAPI is the backend

**Next.js does not proxy the API.** There are no route handlers under `app/api/`,
no server-side `fetch` to the backend, and no server actions for data. The browser
calls FastAPI directly through the axios instance.

Do not add:
- `app/api/**/route.ts` handlers that forward to the backend
- server actions that call the API
- a second HTTP client, or bare `fetch` in a component

If something needs data, it goes: **component → hook → `lib/*-api.ts` → `api`
(axios) → FastAPI**.

## Next 16 breaking changes that bite

- **Async request APIs.** `cookies()`, `headers()`, `draftMode()`, and `params` /
  `searchParams` are async-only; synchronous access was removed.
- **Cookies cannot be written during a render** — only in a route handler or
  server action. This is why the *backend* sets the auth cookies.
- **`PageProps` / `LayoutProps` / `RouteContext`** are global typegen helpers.
  Run `npx next typegen` after adding or moving routes; stale types are a common
  phantom `tsc` error.
- **`middleware.ts` is now `proxy.ts`**, exporting `proxy()`. Node runtime only.
- **Turbopack is the default** bundler. `next lint` was removed — run `eslint`.

## Directory layout

```
src/
  app/
    layout.tsx            # fonts, metadata template, ThemeScript, Providers
    globals.css           # the only place design tokens are defined
    error.tsx             # global error boundary
    not-found.tsx
    (marketing)/          # public site — header + footer, loading.tsx
      layout.tsx  page.tsx  features/  about/
    (auth)/               # login + register — split layout, no site chrome
      layout.tsx  loading.tsx  login/  register/
    (app)/                # signed-in surfaces — ProtectedProvider + AppHeader
      layout.tsx  loading.tsx  dashboard/  spaces/  api-key/  space/[id]/
  components/             # presentational; subfoldered (auth/, dashboard/,
                          # spaces/ = the list, space/ = one space's canvas,
                          # settings/, ui/) plus app-header.tsx / site-header.tsx
  hooks/                  # use-auth.ts, use-api-key.ts, use-spaces.ts (TanStack), use-async.ts
  lib/                    # axios.config.ts, query-client.ts, auth-store.ts (zustand), *-api.ts,
                          # space-url.ts, relative-time.ts, gemini-models.ts, validation.ts
```

Route groups keep each area's chrome separate without touching the URL. Keep that
boundary.

## Space URLs

A space's route segment is `lesson-name-<id>` — `/space/photosynthesis-6a662e…`.
The **whole** string is the route's `id` param; only the trailing id is load
bearing, and the name is there so the URL reads as something. Build it with
`spaceHref()` / `spaceSlug()` and read it back with `spaceIdFromSlug()`
(`lib/space-url.ts`) — never hand-concatenate one. A lesson name that slugs to
nothing (punctuation only, non-Latin script) falls back to the bare id.

## The axios instance

`lib/axios.config.ts` exports the single global `api` instance. Everything uses it.

- `baseURL` is `NEXT_PUBLIC_API_URL` (must be `NEXT_PUBLIC_`; the browser reads it).
- `withCredentials: true` — this is what sends the auth cookies cross-origin, and
  why the backend's CORS names the origin explicitly instead of `*`.
- **No token handling.** The tokens are httpOnly cookies; JavaScript cannot read
  them and must not try.
- A response interceptor refreshes on 401. Its guards matter — keep all three:
  1. only when `status === 401`,
  2. only when the failing URL is **not** an auth endpoint (login/register/logout/
     refresh) — refreshing the refresh call is an infinite loop,
  3. only when `config._retry` is unset — one attempt per request.
- Concurrent 401s share one `refreshInFlight` promise. Without that, parallel
  requests each rotate the token and invalidate each other, because the backend
  revokes a refresh token the moment it is used.
- Errors are normalised to `ApiError { status, code, message }`. Never surface a
  raw `AxiosError` to a component.

## TanStack Query

- The client is configured in `lib/query-client.ts` and mounted by
  `components/providers.tsx`. One client per server request, one singleton in the
  browser — a module-scope client would leak one user's cache into another's
  request.
- **Queries** for anything read repeatedly (`useUser`, `useSpaces`, API health).
  **Mutations** for login, register, logout, creating a space, and the API-key
  config. Query keys are declared as objects (`authKeys`, `spaceKeys`), never
  inline strings scattered across files.
- A mutation whose response *is* the new list row (`useCreateSpace`) seeds it into
  the cache with `setQueryData` and then invalidates — the card appears at once,
  and the server still settles the ordering.
- `retry: false` on auth queries: a 401 is a legitimate answer ("nobody is signed
  in"), not a transient failure.
- Invalidate `authKeys.user` after anything that changes the session or the user.

`hooks/use-async.ts` also exists for one-shot imperative async that has nothing to
cache. If the result should be cached, shared or refetched, use TanStack Query
instead — that is the default.

## Auth model

- The **backend** issues httpOnly cookies (`dock_access`, `dock_refresh`) on
  register, login and refresh, and clears them on logout. The frontend stores
  nothing — no `localStorage`, no `sessionStorage`, no cookie writing.
- The server is the source of truth: `useUser()` (`hooks/use-auth.ts`) queries
  `/auth/me`. `useAuthSync()` mirrors that query into a small **zustand** store
  (`lib/auth-store.ts`) — `status` / `isAuthenticated` — so providers and chrome
  read one shared, synchronous value. The store is a *mirror* of the query; do not
  put state in it the query does not own.
- Two providers gate on that state, each running `useAuthSync` once:
  - `ProtectedProvider` wraps the `(app)` **page** — redirects to `/login` when not
    authenticated, shows a shimmer while resolving.
  - `AuthProvider` wraps the `(auth)` routes — sends an already-signed-in user to
    `/dashboard`.
- Headers hold a placeholder rather than popping in. `AppHeader` sits *outside*
  `ProtectedProvider` (only `<main>` is gated) and skeletons the parts that need a
  user — the email and sign-out button — while `status` is unresolved; the logo,
  nav and theme toggle are static and stay. The marketing `SiteHeader` does the
  same with its CTA, and runs its own `useAuthSync` because no provider gates it.
  `(app)/layout.tsx` therefore needs no hooks and stays a server component.
- Login/register **seed** the user into the cache from the `{ message, user }`
  response instead of refetching `/auth/me`.
- When a refresh fails, the interceptor calls the handler registered by
  `Providers`, which clears the query cache, resets the store and redirects to
  `/login`.
- Because auth is cookie-based and checked client-side, signed-in pages (and the
  marketing header) are client components. Marketing *pages* stay server components.

## Forms

- Controlled by `useMutation`, not server actions. Validate locally first
  (`lib/validation.ts`, mirroring the Pydantic rules), then mutate.
- Map API errors to the right place: a 409 on register belongs on the email
  **field**; a 401 on login belongs in the form-level banner.
- Every input has a real `<label>`, sets `aria-invalid`, and links its message
  with `aria-describedby`. Submit buttons disable and relabel while pending.

## Loading, errors and theming

- Use Next's own file conventions: `loading.tsx` per route group (skeletons built
  from the `.skeleton` class), `error.tsx`, `not-found.tsx`. Do not hand-roll
  spinner state for route transitions.
- Theme is `data-theme` on `<html>`, set before paint by `ThemeScript` to avoid a
  flash, toggled by `ThemeToggle`. The toggle reads the DOM through
  `useSyncExternalStore` — do not reintroduce `setState` inside an effect, the
  React Compiler lint rule rejects it.

## The canvas surface (`components/space/`)

`SpaceCanvas` is pan and zoom in ~150 lines, with no library — read it before
reaching for one:

- The view is **one CSS transform on one wrapper**: `translate3d(x, y, 0)
  scale(s)` over a zero-sized origin pinned to the middle, so the lesson sits
  centred whatever the viewport. Cards are ordinary DOM inside it.
- Cards are passed as **`children`**. View state lives inside the canvas, so a pan
  or zoom re-renders that component alone — React reuses the same child elements
  and skips the cards. Never lift the view state up to the page.
- Zoom is focal-point corrected (the point under the cursor stays put) and clamped.
- The wheel listener is attached by hand with `{ passive: false }`: React registers
  `onWheel` as passive, and a passive listener cannot `preventDefault`, so
  ctrl+scroll would zoom the browser instead of the canvas.
- A drag starting inside `[data-canvas-card]` is ignored, so card buttons work.
- Only what is open is mounted: the video shelf renders for the expanded card,
  learn-mode chat for the selected topic. Do not give every card its own chat.

## Conventions

- Import via the `@/*` alias, never `../../..`.
- Relative timestamps go through `formatRelativeTime()` (`lib/relative-time.ts`),
  which wraps `Intl.RelativeTimeFormat` — do not hand-roll "3 days ago" again.
- Components: named exports, `PascalCase` names, `kebab-case` files.
- Every page exports `metadata`; the root layout supplies the `%s · Dock` template.
- `next/link` for internal navigation, `next/image` for images.
- No new dependency without a reason a few lines of local code cannot cover.

## Checks before you call it done

```bash
cd frontend
npx tsc --noEmit    # if it complains about a route that moved: npx next typegen
npx eslint .
npm run build
```
