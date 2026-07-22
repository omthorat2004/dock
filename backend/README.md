# Dock API

FastAPI + MongoDB backend for Dock. See `../.claude/skills/backend-fastapi` for the
conventions this codebase follows.

## Setup

Requires Python 3.12+, Poetry, and MongoDB on `localhost:27017`.

```bash
cp .env.example .env
poetry install
poetry run fastapi dev src/app/main.py   # http://localhost:8000/docs
```

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Liveness probe |
| POST | `/api/v1/auth/register` | Create an account, set auth cookies |
| POST | `/api/v1/auth/login` | Sign in, set auth cookies |
| POST | `/api/v1/auth/refresh` | Rotate the session from the refresh cookie |
| POST | `/api/v1/auth/logout` | Revoke the session, clear cookies |
| GET | `/api/v1/auth/me` | The signed-in user |

## Auth

A 15-minute access token and a 30-day refresh token, both JWTs with a `type` claim,
both delivered as httpOnly cookies. Refresh tokens are stored hashed and rotated on
every use; replaying a rotated token revokes every session for that user.

## Tests

```bash
poetry run pytest -q      # runs against a real dock_test database
poetry run ruff check . && poetry run ruff format .
```
