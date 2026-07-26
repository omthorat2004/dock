from pymongo.asynchronous.database import AsyncDatabase

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
