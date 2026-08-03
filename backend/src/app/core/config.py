from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from the environment / `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    project_name: str = "Dock API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    # Override in every non-local environment. The app refuses to start in
    # production while this is still the default.
    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db: str = "dock"

    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"]
    )

    # The YouTube Data API key Dock searches with. Server-owned, not the
    # student's. Unlike the AI provider key, this one is Dock's own quota. When
    # it is unset the video shelf answers 503 `youtube_unavailable` rather than
    # falling back to letting the model invent video ids.
    youtube_api_key: str | None = None

    # Auth cookies. In development the frontend is on localhost:3000 and the API
    # on localhost:8000: different origins, but the same site, so `lax` works
    # and `secure` can stay off over plain http.
    cookie_secure: bool 
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    cookie_domain: str | None = None

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production:
        if settings.secret_key.startswith("dev-only"):
            raise RuntimeError("SECRET_KEY must be set outside of development.")
        if not settings.cookie_secure:
            raise RuntimeError("COOKIE_SECURE must be true in production.")
    return settings


settings = get_settings()
