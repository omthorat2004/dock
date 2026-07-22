# Dock frontend

Next.js 16 App Router frontend for Dock. See `../.claude/skills/frontend-nextjs`
for the conventions, and `../.claude/skills/design-system` before touching any UI.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
```

The backend must be running on `localhost:8000`. Use `localhost` rather than
`127.0.0.1` so the auth cookies stay same-site.

## How data flows

```
component → hook (TanStack Query) → lib/*-api.ts → lib/axios.config.ts → FastAPI
```

Next.js does not proxy the API: there are no route handlers, and no server-side
fetching of backend data. Auth lives in httpOnly cookies the backend sets, so the
axios instance sends `withCredentials` and stores nothing itself.

## Checks

```bash
npx tsc --noEmit     # stale route types? npx next typegen
npx eslint .
npm run build
```
