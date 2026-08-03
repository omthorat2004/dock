"""Auth cookie handling.

The browser never sees a token in JavaScript: the API sets the access and
refresh tokens as httpOnly cookies, and the frontend sends them automatically
with `withCredentials`. That keeps an XSS bug from walking off with a session.

Two cookies rather than one, because they have very different lifetimes: the
access token is minutes, the refresh token is weeks.
"""

from fastapi import Response

from app.core.config import settings
from app.schemas.auth import TokenResponse

ACCESS_COOKIE = "dock_access"
REFRESH_COOKIE = "dock_refresh"


def set_auth_cookies(response: Response, tokens: TokenResponse) -> None:
    common = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "domain": settings.cookie_domain,
        "path": "/",
    }

    response.set_cookie(
        ACCESS_COOKIE,
        tokens.access_token,
        max_age=tokens.expires_in,
        **common,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        tokens.refresh_token,
        max_age=tokens.refresh_expires_in,
        **common,
    )


def clear_auth_cookies(response: Response) -> None:
    for name in (ACCESS_COOKIE, REFRESH_COOKIE):
        response.delete_cookie(
            name,
            path="/",
            domain=settings.cookie_domain,
            httponly=True,
            secure=settings.cookie_secure,
            samesite=settings.cookie_samesite,
        )
