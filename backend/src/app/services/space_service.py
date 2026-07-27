from pymongo.asynchronous.database import AsyncDatabase

from app.core.exceptions import NotFoundError
from app.dao.space_dao import SpaceDAO
from app.models.space import Space, Topic
from app.models.user import utcnow
from app.schemas.space import CreateSpaceRequest, SpaceSummary


class SpaceService:
    """Spaces: one lesson each, with the topics that lesson covers.

    Holds the rules; every query goes through the DAO. Raises domain errors
    from `core.exceptions` — never `HTTPException`.
    """

    def __init__(self, db: AsyncDatabase) -> None:
        self.spaces = SpaceDAO(db)

    async def create_space(self, user_id: str, payload: CreateSpaceRequest) -> Space:
        """Build a space from the shared lesson and its topics.

        Each topic starts with no videos and an empty session: the session id
        is minted on the first chat, not here, so a space the student never
        opens carries no session at all.
        """
        now = utcnow()
        space = Space(
            user_id=user_id,
            lesson_name=payload.lesson_name,
            topics=[Topic(topic_name=name) for name in payload.topics],
            created_at=now,
            updated_at=now,
        )
        return await self.spaces.create(space)

    async def list_spaces(self, user_id: str) -> list[SpaceSummary]:
        """The caller's spaces, as cards — lesson, topic count, timestamps."""
        rows = await self.spaces.list_summaries(user_id)
        return [SpaceSummary.model_validate(row) for row in rows]

    async def get_space(self, user_id: str, space_id: str) -> Space:
        """One space in full — the canvas's own load.

        A space belonging to somebody else is a 404, not a 403: whether an id
        exists is not something a stranger gets to learn.
        """
        document = await self.spaces.get_for_user(space_id, user_id)
        if document is None:
            raise NotFoundError("That space does not exist.")

        space = Space.from_document(document)
        await self._backfill_topic_ids(space, document)
        return space

    async def get_topic(
        self, user_id: str, space_id: str, topic_id: str
    ) -> tuple[Space, Topic]:
        """The space and the one topic a chat or video request addresses.

        Both are returned because every caller needs the space too — the lesson
        name grounds the prompt, and saving a topic means writing the space.
        """
        space = await self.get_space(user_id, space_id)
        topic = space.topic_by_id(topic_id)
        if topic is None:
            raise NotFoundError("That topic is not in this space.")
        return space, topic

    async def save_topics(self, space: Space) -> None:
        """Persist the topic array after a chat turn or a video generation."""
        if space.id is None:  # pragma: no cover - a loaded space always has one
            raise NotFoundError("That space does not exist.")
        space.updated_at = utcnow()
        topics = [topic.model_dump() for topic in space.topics]
        await self.spaces.replace_topics(space.id, topics, space.updated_at)

    async def _backfill_topic_ids(self, space: Space, document: dict) -> None:
        """Give topics stored before they had ids a permanent one.

        `Topic.id` has a default factory, so a topic saved without the field
        gets a *fresh* id every time the document is read — which would hand the
        canvas a different id on every load and break every chat and video call
        made against it. Writing them back on the first read makes them stick.
        """
        stored = document.get("topics") or []
        if all(isinstance(topic, dict) and topic.get("id") for topic in stored):
            return
        await self.save_topics(space)
