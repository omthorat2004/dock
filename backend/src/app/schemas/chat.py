from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.chat import Role

MAX_MESSAGE_LENGTH = 4000


class SendMessageRequest(BaseModel):
    """One message from the student to a topic's tutor."""

    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)

    @field_validator("message")
    @classmethod
    def _clean_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Write a message first.")
        return cleaned


class ChatMessageRead(BaseModel):
    """One turn, as the panel renders it.

    `role` is the model's vocabulary ("user" / "assistant"), which is what the
    transcript is stored in; turning that into "you" and "Dock" is the UI's job,
    not the API's.
    """

    role: Role
    content: str
    created_at: datetime


class ChatReply(BaseModel):
    """The answer to one send, plus the session state that came with it."""

    session_id: str
    reply: ChatMessageRead
    #: Always false here: a send that hit the limit raises 413 instead. It is
    #: present so the client reads session state from one field in both shapes.
    limit_reached: bool = False


class ChatHistory(BaseModel):
    """A topic's conversation as it stands when the panel opens.

    `session_id` is None for a topic that has never been chatted to, which is
    the normal state of most cards on a canvas.
    """

    session_id: str | None
    limit_reached: bool
    messages: list[ChatMessageRead]
