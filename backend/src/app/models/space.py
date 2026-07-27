from datetime import datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from app.models.user import utcnow

COLLECTION = "spaces"

#: The whole video shelf for one topic, not a page size. Once a topic holds this
#: many links the shelf is closed: the API refuses to generate more and the card
#: says so rather than offering a button that cannot work.
MAX_YOUTUBE_LINKS = 20

#: How many links one "find videos" request asks for. The shelf fills five at a
#: time so the first open is quick and a student only pulls more if the first
#: five missed.
YOUTUBE_LINKS_PER_REQUEST = 5


class YoutubeLink(BaseModel):
    """One explainer on a topic's video shelf.

    `title` is the one YouTube itself returned when the link was verified — not
    the one the model guessed — so a shelf never labels a video with someone
    else's title. `video_id` is what dedupes the shelf: the same video reached
    through `youtu.be`, `/shorts` and `watch?v=` is one video, not three.
    """

    video_id: str
    title: str
    url: str


class TopicSession(BaseModel):
    """The learn-mode chat session attached to a single topic.

    Nothing is minted when the space is created: `session_id` stays None until
    the student opens the card and starts a chat, which is what `start()` is
    for. `limit_reached` records that the conversation has run past the model's
    input budget, so the UI can say so rather than failing the next send.
    """

    session_id: str | None = None
    limit_reached: bool = False
    # Both None while there is no session — the timestamps describe the chat,
    # not the topic, so they only start once the chat does.
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @classmethod
    def start(cls) -> "TopicSession":
        """A fresh session, id and all. Called on the first chat for a topic."""
        now = utcnow()
        return cls(session_id=str(uuid4()), created_at=now, updated_at=now)


class Topic(BaseModel):
    """One thing to learn within the lesson — a card on the space's canvas.

    The id is minted by the app rather than left to Mongo, because a topic is
    nested inside its space and so never gets an `_id` of its own. It is what
    the chat and video routes address a single card by.
    """

    id: str = Field(default_factory=lambda: str(uuid4()))
    topic_name: str
    #: YouTube explainers matched to this topic, capped at MAX_YOUTUBE_LINKS.
    youtube_links: list[YoutubeLink] = Field(default_factory=list)
    session: TopicSession = Field(default_factory=TopicSession)

    @property
    def video_limit_reached(self) -> bool:
        """True once the shelf is full and no further links can be generated."""
        return len(self.youtube_links) >= MAX_YOUTUBE_LINKS

    @property
    def remaining_video_slots(self) -> int:
        """How many links this topic can still take, never below zero."""
        return max(0, MAX_YOUTUBE_LINKS - len(self.youtube_links))


class Space(BaseModel):
    """A space: one lesson, its topics, and the chat session under each topic.

    Unlike users and refresh tokens, a space has no natural key to key itself
    on, so `_id` is left to Mongo. That is why `id` is None on a space that has
    not been inserted yet and why `to_document` omits the field entirely —
    writing an explicit None would store a null `_id` instead of letting the
    server generate one.

    `lesson_name` is deliberately *not* unique: a student may re-share the same
    lesson when their syllabus changes, and two spaces for it is a valid state.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: str | None = Field(default=None, alias="_id")
    user_id: str
    lesson_name: str
    topics: list[Topic]
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @property
    def topic_count(self) -> int:
        """How many topics the space holds — what a space card shows."""
        return len(self.topics)

    def topic_by_id(self, topic_id: str) -> Topic | None:
        """The topic a chat or video request is addressing, if it exists."""
        return next((topic for topic in self.topics if topic.id == topic_id), None)

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "Space":
        return cls.model_validate({**document, "_id": str(document["_id"])})

    def to_document(self) -> dict[str, Any]:
        data = self.model_dump(by_alias=True)
        data.pop("_id", None)
        return data
