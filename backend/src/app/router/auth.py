from fastapi import APIRouter, Request, Response, status

from app.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_auth_cookies
from app.core.exceptions import AuthenticationError
from app.dependencies import AuthServiceDep, CurrentUser
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _refresh_token_from(request: Request) -> str:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise AuthenticationError("No refresh token.")
    return token


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an account and start a session",
)
async def register(
    payload: RegisterRequest, response: Response, service: AuthServiceDep
) -> TokenResponse:
    tokens = await service.register(payload)
    set_auth_cookies(response, tokens)
    return tokens


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Exchange credentials for a session",
)
async def login(
    payload: LoginRequest, response: Response, service: AuthServiceDep
) -> TokenResponse:
    tokens = await service.login(payload)
    set_auth_cookies(response, tokens)
    return tokens


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate the session using the refresh cookie",
    description=(
        "Reads the refresh token from its httpOnly cookie, revokes it and issues "
        "a new pair. Replaying a revoked token ends every session for that user."
    ),
)
async def refresh(
    request: Request, response: Response, service: AuthServiceDep
) -> TokenResponse:
    tokens = await service.refresh(_refresh_token_from(request))
    set_auth_cookies(response, tokens)
    return tokens


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke the session and clear the cookies",
)
async def logout(request: Request, response: Response, service: AuthServiceDep) -> None:
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if refresh_token:
        await service.logout(refresh_token)
    # Always clear, even for an unknown token: the caller wanted out.
    clear_auth_cookies(response)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="The currently signed-in user",
)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user, from_attributes=True)
