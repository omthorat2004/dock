from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.space import MAX_GOAL_LENGTH, RevisionLevel

MAX_TOPICS = 50
MAX_TOPIC_LENGTH = 200


class CreateSpaceRequest(BaseModel):
    """A new space: the lesson, what it is being revised for, and its topics.

    Only topic *names* are accepted. The youtube links and the chat session on
    each topic are server-owned; a client cannot seed them.
    """

    lesson_name: str = Field(min_length=1, max_length=200)
    goal: str = Field(min_length=1, max_length=MAX_GOAL_LENGTH)
    level: RevisionLevel
    topics: list[str] = Field(min_length=1, max_length=MAX_TOPICS)

    @field_validator("lesson_name")
    @classmethod
    def _clean_lesson_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Give the lesson a name.")
        return cleaned

    @field_validator("goal")
    @classmethod
    def _clean_goal(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Say what you are revising this for.")
        return cleaned

    @field_validator("topics")
    @classmethod
    def _clean_topics(cls, values: list[str]) -> list[str]:
        """Trim, drop blanks, and collapse case-insensitive duplicates.

        The same rules the create-space modal applies client-side, enforced
        again here because the API is reachable without it.
        """
        seen: set[str] = set()
        cleaned: list[str] = []

        for value in values:
            topic = value.strip()
            if not topic or topic.lower() in seen:
                continue
            if len(topic) > MAX_TOPIC_LENGTH:
                raise ValueError(
                    f"Keep each topic under {MAX_TOPIC_LENGTH} characters."
                )
            seen.add(topic.lower())
            cleaned.append(topic)

        if not cleaned:
            raise ValueError("Add at least one topic.")
        return cleaned


class SpaceSummary(BaseModel):
    """A space as a card sees it: never the topics themselves, just the count.

    Listing spaces must not drag every topic, with its links and session,
    across the wire, so this is the only shape the list endpoint returns.
    """

    id: str
    lesson_name: str
    goal: str | None = None
    level: RevisionLevel | None = None
    topic_count: int
    created_at: datetime
    updated_at: datetime


class YoutubeLinkRead(BaseModel):
    """One video on a topic's shelf. Every one of these has been verified."""

    video_id: str
    title: str
    url: str


class TopicSessionRead(BaseModel):
    """A topic's chat state, without the timestamps the canvas has no use for.

    `session_id` is None until the student first chats, and `limit_reached`
    says the conversation has outgrown the model's input budget, which is what
    lets the card show a closed composer without having to send a message to
    discover it.
    """

    session_id: str | None
    limit_reached: bool


class TopicRead(BaseModel):
    """A topic as a card on the canvas.

    `video_limit_reached` is computed from the shelf rather than counted by the
    client, so the rule about how full is full lives on the server only.
    """

    id: str
    topic_name: str
    youtube_links: list[YoutubeLinkRead]
    video_limit_reached: bool
    session: TopicSessionRead


class SpaceDetail(BaseModel):
    """One space in full: what opening its canvas loads.

    The counterpart to `SpaceSummary`: the list deliberately withholds the
    topics, and this is the endpoint that has them.
    """

    id: str
    lesson_name: str
    goal: str | None = None
    level: RevisionLevel | None = None
    topics: list[TopicRead]
    created_at: datetime
    updated_at: datetime
