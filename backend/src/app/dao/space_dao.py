from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.dao.base import BaseDAO
from app.models.space import COLLECTION, Space


def _object_id(value: str) -> ObjectId | None:
    """A space's `_id` as Mongo stores it, or None if the string is not one.

    Spaces are the one collection whose ids the *server* mints, so unlike users
    and refresh tokens they are `ObjectId`s rather than UUID strings; a filter
    built from the raw string would silently match nothing. A malformed id is
    not an error here; it is simply a space that does not exist, and the caller
    turns that into the same 404 as any other miss.
    """
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


class SpaceDAO(BaseDAO):
    collection_name = COLLECTION

    async def create(self, space: Space) -> Space:
        """Insert a space and stamp it with the `_id` Mongo generated."""
        space.id = await self.insert_one(space.to_document())
        return space

    async def get_for_user(self, space_id: str, user_id: str) -> dict[str, Any] | None:
        """One space, scoped to its owner.

        Ownership is part of the filter rather than a check after the read, so
        there is no path on which another user's space is loaded at all.
        """
        object_id = _object_id(space_id)
        if object_id is None:
            return None
        return await self.collection.find_one({"_id": object_id, "user_id": user_id})

    async def replace_topics(
        self, space_id: str, topics: list[dict[str, Any]], updated_at: datetime
    ) -> bool:
        """Write the topic array back after a chat or a video generation.

        The whole array goes at once: a topic's session and links are nested
        inside it, and the space is only ever mutated by a caller that already
        holds the current document.
        """
        object_id = _object_id(space_id)
        if object_id is None:
            return False
        result = await self.collection.update_one(
            {"_id": object_id},
            {"$set": {"topics": topics, "updated_at": updated_at}},
        )
        return result.matched_count > 0

    async def list_summaries(self, user_id: str) -> list[dict[str, Any]]:
        """Every space a user owns, reduced to what a card shows.

        The topic count is computed by Mongo (`$size`) rather than by loading
        the arrays and counting them here: a list of twenty spaces should not
        pull twenty topic arrays, each with its youtube links and session.
        Most recently updated first, which is the order the dashboard wants.
        """
        cursor = self.collection.find(
            {"user_id": user_id},
            {
                "lesson_name": 1,
                "created_at": 1,
                "updated_at": 1,
                "topic_count": {"$size": "$topics"},
            },
        ).sort("updated_at", -1)

        summaries: list[dict[str, Any]] = []
        async for document in cursor:
            # The `_id` → `id` seam, same as `Model.from_document`; this
            # projection never builds a full model, so it maps the key itself.
            document["id"] = str(document.pop("_id"))
            summaries.append(document)
        return summaries
