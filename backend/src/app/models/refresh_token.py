from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import utcnow

COLLECTION = "refresh_tokens"


class RefreshToken(BaseModel):
    """A stored refresh token.

    Only the *hash* is persisted: a database dump must not hand out sessions.
    `id` is the token's `jti`, so a presented token maps straight to its record.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    user_id: str
    token_hash: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=utcnow)
    revoked_at: datetime | None = None
    # Set when this token is rotated, so a replayed token points at its successor.
    replaced_by: str | None = None

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "RefreshToken":
        return cls.model_validate({**document, "_id": str(document["_id"])})

    def to_document(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True)
