import uuid
from datetime import UTC, datetime, timedelta

from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.exceptions import (
    AuthenticationError,
    EmailAlreadyRegistered,
    InvalidCredentials,
)
from app.core.hashing import hash_token, verify_token
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.dao.refresh_token_dao import RefreshTokenDAO
from app.dao.user_dao import UserDAO
from app.models.refresh_token import RefreshToken
from app.models.user import User, utcnow
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    """Registration, login, token issuing and refresh-token rotation.

    Holds the business rules; every query goes through a DAO. Raises domain
    errors from `core.exceptions`, never `HTTPException`.
    """

    def __init__(self, db: AsyncDatabase) -> None:
        self.users = UserDAO(db)
        self.refresh_tokens = RefreshTokenDAO(db)

    async def register(self, payload: RegisterRequest) -> tuple[TokenResponse, User]:
        user = User(
            _id=str(uuid.uuid4()),
            email=payload.email,
            full_name=payload.full_name.strip(),
            hashed_password=hash_password(payload.password),
            created_at=utcnow(),
        )

        try:
            # The unique index on `email` enforces this; a read-then-write check
            # would leave a race between the two calls.
            await self.users.create(user)
        except DuplicateKeyError as exc:
            raise EmailAlreadyRegistered from exc

        tokens, _ = await self._issue_pair(user)
        return tokens, user

    async def login(self, payload: LoginRequest) -> tuple[TokenResponse, User]:
        user = await self.users.get_by_email(payload.email)

        # One generic error for every failure mode: a wrong password and an
        # unknown email must be indistinguishable to the caller.
        if user is None or not user.is_active:
            raise InvalidCredentials
        if not verify_password(payload.password, user.hashed_password):
            raise InvalidCredentials

        tokens, _ = await self._issue_pair(user)
        return tokens, user

    async def refresh(self, refresh_token: str) -> tuple[TokenResponse, User]:
        """Exchange a refresh token for a new pair, rotating the old one."""
        payload = decode_refresh_token(refresh_token)
        if payload is None or not payload.jti:
            raise AuthenticationError("Invalid refresh token.")

        stored = await self.refresh_tokens.get_by_id(payload.jti)
        if stored is None or not verify_token(refresh_token, stored.token_hash):
            raise AuthenticationError("Invalid refresh token.")

        if not stored.is_active:
            # The token was already rotated away. Either it leaked and is being
            # replayed, or a client raced itself, so kill every session for this
            # user and make them sign in again.
            await self.refresh_tokens.revoke_all_for_user(stored.user_id)
            raise AuthenticationError("This session was ended. Please sign in again.")

        if stored.expires_at <= datetime.now(UTC):
            raise AuthenticationError("Your session has expired. Please sign in again.")

        user = await self.users.get_by_id(stored.user_id)
        if user is None or not user.is_active:
            raise AuthenticationError

        tokens, new_jti = await self._issue_pair(user)
        await self.refresh_tokens.revoke(stored.id, replaced_by=new_jti)
        return tokens, user

    async def logout(self, refresh_token: str) -> None:
        """Revoke a single session. Unknown tokens are a no-op, not an error."""
        payload = decode_refresh_token(refresh_token)
        if payload is None or not payload.jti:
            return
        await self.refresh_tokens.revoke(payload.jti)

    async def logout_everywhere(self, user_id: str) -> int:
        return await self.refresh_tokens.revoke_all_for_user(user_id)

    async def get_user(self, user_id: str) -> User | None:
        user = await self.users.get_by_id(user_id)
        return user if user and user.is_active else None

    async def _issue_pair(self, user: User) -> tuple[TokenResponse, str]:
        """Mints an access/refresh pair and returns it with the new token's jti."""
        jti = str(uuid.uuid4())
        access_token, expires_in = create_access_token(user.id, jti=jti)
        refresh_token, refresh_expires_in = create_refresh_token(user.id, jti=jti)

        await self.refresh_tokens.create(
            RefreshToken(
                _id=jti,
                user_id=user.id,
                # Deterministic keyed hash, so the record is found by its jti and
                # the presented token is verified against the stored digest.
                token_hash=hash_token(refresh_token),
                expires_at=utcnow() + timedelta(seconds=refresh_expires_in),
            )
        )

        return (
            TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                expires_in=expires_in,
                refresh_expires_in=refresh_expires_in,
            ),
            jti,
        )
