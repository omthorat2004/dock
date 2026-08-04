from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.asynchronous.database import AsyncDatabase

from app.ai.base import AIProvider
from app.ai.factory import build_provider
from app.core.cookies import ACCESS_COOKIE
from app.core.exceptions import ApiKeyNotConfigured, AuthenticationError
from app.core.security import decode_access_token
from app.db.mongo import get_db
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.chat_service import ChatService
from app.services.space_service import SpaceService
from app.services.user_service import UserService
from app.services.video_service import VideoService

# auto_error=False so a missing header falls through to the cookie.
bearer_scheme = HTTPBearer(auto_error=False)

DbDep = Annotated[AsyncDatabase, Depends(get_db)]


def get_auth_service(db: DbDep) -> AuthService:
    return AuthService(db)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


def get_user_service(db: DbDep) -> UserService:
    return UserService(db)


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


def get_space_service(db: DbDep) -> SpaceService:
    return SpaceService(db)


SpaceServiceDep = Annotated[SpaceService, Depends(get_space_service)]


def get_chat_service(db: DbDep) -> ChatService:
    return ChatService(db)


ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]


def get_video_service(db: DbDep) -> VideoService:
    return VideoService(db)


VideoServiceDep = Annotated[VideoService, Depends(get_video_service)]


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


async def get_ai_provider(user: CurrentUser) -> AIProvider:
    """The caller's configured AI provider, or 401 if they have no key yet.

    Routes that need the model depend on this instead of re-checking the key, so
    the "no key configured" answer is one exception raised in one place.
    """
    if not user.has_api_key:
        raise ApiKeyNotConfigured
    return build_provider(user)


AIProviderDep = Annotated[AIProvider, Depends(get_ai_provider)]
