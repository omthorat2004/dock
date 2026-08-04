from pymongo.asynchronous.database import AsyncDatabase

from app.ai.base import AIProvider
from app.core.exceptions import NotFoundError
from app.dao.space_dao import SpaceDAO
from app.models.space import Space, Topic
from app.models.user import utcnow
from app.schemas.space import CreateSpaceRequest, SpaceSummary, SuggestTopicsRequest

SUGGESTED_TOPIC_COUNT = 5

_LEVEL_GUIDANCE = {
    "beginner": "Start from the foundations; assume nothing has been covered.",
    "intermediate": "Skip the definitions and cover the working parts.",
    "advanced": "Favour the harder, less obvious parts of the lesson.",
}

_TOPICS_PROMPT = (
    "List the {count} topics a student should revise for one lesson.\n"
    "Lesson: {lesson_name}\n"
    "They are revising for: {goal}\n"
    "Their level: {level}. {guidance}\n"
    "Answer with the {count} topic names only, one per line. No numbering, no "
    "bullets, no headings, no explanation. Each name is a few words, and names "
    "the topic rather than describing it."
)


class SpaceService:
    """Spaces: one lesson each, with the topics that lesson covers.

    Holds the rules; every query goes through the DAO. Raises domain errors
    from `core.exceptions`, never `HTTPException`.
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
            goal=payload.goal,
            level=payload.level,
            topics=[Topic(topic_name=name) for name in payload.topics],
            created_at=now,
            updated_at=now,
        )
        return await self.spaces.create(space)

    async def suggest_topics(
        self, provider: AIProvider, payload: SuggestTopicsRequest
    ) -> str:
        """Ask the model for topics to cover, before any space exists.

        Nothing is read or written here: this runs while the create form is
        still open, so there is no space to hang the answer off. The reply
        comes back as the model wrote it and the client splits it.

        Topics the student has already picked travel with the request, so a
        second press asks for five *more* rather than five of the same.
        """
        prompt = _TOPICS_PROMPT.format(
            count=SUGGESTED_TOPIC_COUNT,
            lesson_name=payload.lesson_name,
            goal=payload.goal,
            level=payload.level,
            guidance=_LEVEL_GUIDANCE[payload.level],
        )
        if payload.topics:
            have = "\n".join(f"- {name}" for name in payload.topics)
            prompt = (
                f"{prompt}\n\nThe student already has these topics, so suggest "
                f"{SUGGESTED_TOPIC_COUNT} different ones and do not repeat "
                f"them:\n{have}"
            )
        return await provider.chat(prompt)

    async def list_spaces(self, user_id: str) -> list[SpaceSummary]:
        """The caller's spaces, as cards: lesson, topic count, timestamps."""
        rows = await self.spaces.list_summaries(user_id)
        return [SpaceSummary.model_validate(row) for row in rows]

    async def get_space(self, user_id: str, space_id: str) -> Space:
        """One space in full: the canvas's own load.

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

        Both are returned because every caller needs the space too: the lesson
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
        gets a *fresh* id every time the document is read, which would hand the
        canvas a different id on every load and break every chat and video call
        made against it. Writing them back on the first read makes them stick.
        """
        stored = document.get("topics") or []
        if all(isinstance(topic, dict) and topic.get("id") for topic in stored):
            return
        await self.save_topics(space)
