"""Learn-mode chat: the transcript of a topic's session, and its one summary.

Messages live in their own collection rather than nested in the space document.
A space is read whole on every canvas load, and a conversation grows without
bound — nesting one inside the other would make opening a space get slower the
more the student had talked.

Both collections are keyed by `session_id` (minted by `TopicSession.start()`),
so nothing here needs to know which space or topic it belongs to.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import utcnow

MESSAGES_COLLECTION = "chat_messages"
SUMMARIES_COLLECTION = "chat_summaries"

#: How many of the most recent messages travel with every prompt verbatim.
#: Everything older than this window is represented by the session's single
#: rolling summary instead, which is what keeps a long conversation inside the
#: model's input budget.
RECENT_MESSAGE_WINDOW = 10

#: Who said it, in the vocabulary the model itself uses. The transcript is
#: replayed into the provider on every turn, so storing "user"/"assistant"
#: means the stored rows go straight into a prompt with nothing to translate.
#: The product still says "student" and "Dock" — that is a label, applied in
#: the UI, not a second name for this field.
Role = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    """One turn in a topic's conversation."""

    model_config = ConfigDict(populate_by_name=True)

    id: str | None = Field(default=None, alias="_id")
    session_id: str
    role: Role
    content: str
    created_at: datetime = Field(default_factory=utcnow)

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "ChatMessage":
        return cls.model_validate({**document, "_id": str(document["_id"])})

    def to_document(self) -> dict[str, Any]:
        # Same rule as Space: Mongo generates `_id`, so writing an explicit None
        # would store a null id instead of letting the server mint one.
        data = self.model_dump(by_alias=True)
        data.pop("_id", None)
        return data


class ChatSummary(BaseModel):
    """The single rolling summary of everything that fell out of the window.

    There is exactly **one** summary per session, and it is replaced — never
    appended to. Each rewrite folds the previous summary together with the
    messages that have since aged past `RECENT_MESSAGE_WINDOW`, so the old
    summary is superseded the moment the new one is written.

    `message_count` is how many messages, counting from the start of the
    session, are already represented here. It is what stops each rewrite from
    re-reading the whole transcript: only the messages between it and the
    current window need folding in.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str | None = Field(default=None, alias="_id")
    session_id: str
    content: str
    message_count: int
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "ChatSummary":
        return cls.model_validate({**document, "_id": str(document["_id"])})

    def to_document(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True)
        data.pop("_id", None)
        return data
