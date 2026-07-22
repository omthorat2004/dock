---
name: frontend-nextjs
description: Conventions for the Dock Next.js frontend — App Router structure, Next 16 breaking changes, axios + TanStack Query data layer, cookie auth with refresh rotation, forms and theming. Load before editing anything under frontend/.
---

# Frontend — Next.js (App Router)

Stack: **Next.js 16**, React 19, TypeScript (strict), Tailwind CSS v4,
**axios**, **TanStack Query v5**, ESLint. Located in `frontend/`. Pair this with
the `design-system` skill for anything visual.

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
    (app)/                # signed-in surfaces — AuthGuard + app chrome
      layout.tsx  loading.tsx  dashboard/  spaces/
  components/             # presentational; subfoldered (auth/, dashboard/, ui/)
  hooks/                  # use-auth.ts (TanStack), use-async.ts
  lib/                    # axios.config.ts, query-client.ts, *-api.ts, validation.ts
```

Route groups keep each area's chrome separate without touching the URL. Keep that
boundary.

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
- **Queries** for anything read repeatedly (`useMe`, API health). **Mutations**
  for login, register, logout. Query keys are declared as objects (`authKeys`),
  never inline strings scattered across files.
- `retry: false` on auth queries: a 401 is a legitimate answer ("nobody is signed
  in"), not a transient failure.
- Invalidate `authKeys.me` after anything that changes the session.

`hooks/use-async.ts` also exists for one-shot imperative async that has nothing to
cache. If the result should be cached, shared or refetched, use TanStack Query
instead — that is the default.

## Auth model

- The **backend** issues httpOnly cookies (`dock_access`, `dock_refresh`) on
  register, login and refresh, and clears them on logout. The frontend stores
  nothing — no `localStorage`, no `sessionStorage`, no cookie writing.
- `AuthGuard` (`components/auth/auth-guard.tsx`) wraps `(app)/layout.tsx`: it calls
  `useMe()`, redirects to `/login` on error, and renders a skeleton meanwhile
  rather than flashing the page to a user who will bounce.
- When a refresh fails, the interceptor calls the handler registered by
  `Providers`, which clears the cache and redirects to `/login`.
- Because auth is cookie-based and checked client-side, signed-in pages are client
  components. Marketing pages stay server components.

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

## Conventions

- Import via the `@/*` alias, never `../../..`.
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
