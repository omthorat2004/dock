from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.constants import DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION
from app.core.crypto import decrypt_secret

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
    # provider-agnostic: one key field, not `gemini_api_key`. The key must be
    # replayed to the vendor on every call, so unlike a refresh token it cannot
    # be hashed; it is AES-256-GCM encrypted instead (`core.crypto`) and only
    # ever leaves this model through `provider_api_key`. None until the user
    # configures it.
    api_key_encrypted: str | None = None
    model_name: str = DEFAULT_MODEL_NAME
    model_version: str = DEFAULT_MODEL_VERSION

    @property
    def provider_api_key(self) -> str | None:
        """The decrypted provider key, for the vendor call. None if unreadable.

        Bound to this user's id, so a ciphertext copied from another user's
        document decrypts to nothing rather than to their key.
        """
        return decrypt_secret(self.api_key_encrypted, context=self.id)

    @property
    def has_api_key(self) -> bool:
        """Whether a *usable* provider key is configured. Safe to expose.

        Decryptability rather than presence: a stored value this deployment
        cannot read (written under an older `SECRET_KEY`, say) would otherwise
        show as configured in the UI while every model call answered 401.
        """
        return self.provider_api_key is not None

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "User":
        return cls.model_validate({**document, "_id": str(document["_id"])})

    def to_document(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True)
        data["email"] = str(data["email"])
        return data
