from typing import Any

from app.dao.base import BaseDAO
from app.models.space import COLLECTION, Space


class SpaceDAO(BaseDAO):
    collection_name = COLLECTION

    async def create(self, space: Space) -> Space:
        """Insert a space and stamp it with the `_id` Mongo generated."""
        space.id = await self.insert_one(space.to_document())
        return space

    async def list_summaries(self, user_id: str) -> list[dict[str, Any]]:
        """Every space a user owns, reduced to what a card shows.

        The topic count is computed by Mongo (`$size`) rather than by loading
        the arrays and counting them here — a list of twenty spaces should not
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
            # The `_id` → `id` seam, same as `Model.from_document` — this
            # projection never builds a full model, so it maps the key itself.
            document["id"] = str(document.pop("_id"))
            summaries.append(document)
        return summaries
