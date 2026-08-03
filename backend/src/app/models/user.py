from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.constants import DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION

COLLECTION = "users"


def utcnow() -> datetime:
    return datetime.now(UTC)


class User(BaseModel):
    """A user document.

    Mongo stores the id under `_id`; everywhere else in the app it is `id`.
    `from_document` / `to_document` are the only places that seam is visible.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    email: EmailStr
    full_name: str
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)

    # AI provider config. `model_name` selects the provider, so the key stays
    # provider-agnostic: one `api_key`, not `gemini_api_key`. The key is stored
    # because we must replay it to the vendor, so unlike the refresh token it
    # cannot be hashed; it must be encrypted at rest before production. None
    # until the user configures it.
    api_key: str | None = None
    model_name: str = DEFAULT_MODEL_NAME
    model_version: str = DEFAULT_MODEL_VERSION

    @property
    def has_api_key(self) -> bool:
        """Whether a provider key is configured. Safe to expose; the key is not."""
        return bool(self.api_key)

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "User":
        return cls.model_validate({**document, "_id": str(document["_id"])})

    def to_document(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True)
        data["email"] = str(data["email"])
        return data
