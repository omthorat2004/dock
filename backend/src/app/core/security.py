"""Token issuing and verification.

Two token types, deliberately different:

* **Access token** — short-lived (minutes), sent on every request, never stored
  server-side. Cheap to verify, and expiry limits the damage if it leaks.
* **Refresh token** — long-lived (days), used only to mint a new access token.
  Stored *hashed* in Mongo so it can be rotated and revoked; a stolen refresh
  token can be cut off, an access token cannot.

Hashing lives in `app.core.hashing`; password helpers are re-exported so callers
have one obvious import for "security things".
"""

from datetime import UTC, datetime, timedelta

import jwt

from app.core.config import settings
from app.core.hashing import (
    generate_api_key,
    hash_password,
    hash_token,
    verify_password,
    verify_token,
)

__all__ = [
    "ACCESS_TOKEN_TYPE",
    "REFRESH_TOKEN_TYPE",
    "TokenPayload",
    "create_access_token",
    "create_refresh_token",
    "decode_access_token",
    "decode_refresh_token",
    "decode_token",
    "generate_api_key",
    "hash_password",
    "hash_token",
    "verify_password",
    "verify_token",
]

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


class TokenPayload:
    """The parts of a decoded token the application cares about."""

    def __init__(self, subject: str, token_type: str, jti: str) -> None:
        self.subject = subject
        self.token_type = token_type
        self.jti = jti


def _encode(subject: str, token_type: str, lifetime: timedelta, jti: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type,
        "jti": jti,
        "iat": now,
        "exp": now + lifetime,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str, jti: str = "") -> tuple[str, int]:
    """Returns the encoded access token and its lifetime in seconds."""
    lifetime = timedelta(minutes=settings.access_token_expire_minutes)
    token = _encode(subject, ACCESS_TOKEN_TYPE, lifetime, jti)
    return token, int(lifetime.total_seconds())


def create_refresh_token(subject: str, jti: str) -> tuple[str, int]:
    """Returns the encoded refresh token and its lifetime in seconds.

    `jti` identifies this token in the store, so it can be rotated and revoked.
    """
    lifetime = timedelta(days=settings.refresh_token_expire_days)
    token = _encode(subject, REFRESH_TOKEN_TYPE, lifetime, jti)
    return token, int(lifetime.total_seconds())


def decode_token(token: str, expected_type: str) -> TokenPayload | None:
    """Decodes and verifies a token, or returns None when it is unusable.

    The type check matters: without it, a refresh token would be accepted as an
    access token, silently defeating the short access lifetime.
    """
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
    except jwt.PyJWTError:
        return None

    subject = payload.get("sub")
    token_type = payload.get("type")
    if not isinstance(subject, str) or token_type != expected_type:
        return None

    return TokenPayload(subject, token_type, str(payload.get("jti", "")))


def decode_access_token(token: str) -> str | None:
    """Returns the subject (user id) of a valid access token."""
    payload = decode_token(token, ACCESS_TOKEN_TYPE)
    return payload.subject if payload else None


def decode_refresh_token(token: str) -> TokenPayload | None:
    return decode_token(token, REFRESH_TOKEN_TYPE)
