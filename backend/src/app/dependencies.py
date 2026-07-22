from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.asynchronous.database import AsyncDatabase

from app.core.cookies import ACCESS_COOKIE
from app.core.exceptions import AuthenticationError
from app.core.security import decode_access_token
from app.db.mongo import get_db
from app.models.user import User
from app.services.auth_service import AuthService

# auto_error=False so a missing header falls through to the cookie.
bearer_scheme = HTTPBearer(auto_error=False)

DbDep = Annotated[AsyncDatabase, Depends(get_db)]


def get_auth_service(db: DbDep) -> AuthService:
    return AuthService(db)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


async def get_current_user(
    request: Request,
    service: AuthServiceDep,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ] = None,
) -> User:
    # The browser sends the httpOnly cookie; scripts and tests can use a bearer
    # header instead. Cookie first, since that is the app's own path.
    token = request.cookies.get(ACCESS_COOKIE) or (
        credentials.credentials if credentials else None
    )
    if not token:
        raise AuthenticationError

    user_id = decode_access_token(token)
    if user_id is None:
        raise AuthenticationError("Your session has expired. Please sign in again.")

    user = await service.get_user(user_id)
    if user is None:
        raise AuthenticationError

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
