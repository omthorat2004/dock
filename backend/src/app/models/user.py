from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "User":
        return cls.model_validate({**document, "_id": str(document["_id"])})

    def to_document(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True)
        data["email"] = str(data["email"])
        return data
