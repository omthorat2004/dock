from datetime import datetime

from pydantic import BaseModel, Field, field_validator

MAX_TOPICS = 50
MAX_TOPIC_LENGTH = 200


class CreateSpaceRequest(BaseModel):
    """A new space: the lesson, and the topics it covers.

    Only topic *names* are accepted. The youtube links and the chat session on
    each topic are server-owned — a client cannot seed them.
    """

    lesson_name: str = Field(min_length=1, max_length=200)
    topics: list[str] = Field(min_length=1, max_length=MAX_TOPICS)

    @field_validator("lesson_name")
    @classmethod
    def _clean_lesson_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Give the lesson a name.")
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

    Listing spaces must not drag every topic — with its links and session —
    across the wire, so this is the only shape the list endpoint returns.
    """

    id: str
    lesson_name: str
    topic_count: int
    created_at: datetime
    updated_at: datetime
