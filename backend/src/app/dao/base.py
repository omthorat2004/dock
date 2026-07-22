from typing import Any

from pymongo.asynchronous.collection import AsyncCollection
from pymongo.asynchronous.database import AsyncDatabase


class BaseDAO:
    """Data-access object for a single Mongo collection.

    DAOs are the *only* place a query is written. They speak documents
    (`dict`) and know nothing about HTTP or business rules.
    """

    collection_name: str

    def __init__(self, db: AsyncDatabase) -> None:
        self.db = db

    @property
    def collection(self) -> AsyncCollection:
        return self.db[self.collection_name]

    async def find_one(self, filter: dict[str, Any]) -> dict[str, Any] | None:
        return await self.collection.find_one(filter)

    async def find_by_id(self, doc_id: str) -> dict[str, Any] | None:
        return await self.collection.find_one({"_id": doc_id})

    async def insert_one(self, document: dict[str, Any]) -> str:
        result = await self.collection.insert_one(document)
        return str(result.inserted_id)

    async def update_by_id(self, doc_id: str, changes: dict[str, Any]) -> bool:
        result = await self.collection.update_one({"_id": doc_id}, {"$set": changes})
        return result.matched_count > 0

    async def delete_by_id(self, doc_id: str) -> bool:
        result = await self.collection.delete_one({"_id": doc_id})
        return result.deleted_count > 0

    async def list(
        self, filter: dict[str, Any] | None = None, limit: int = 100
    ) -> list[dict[str, Any]]:
        cursor = self.collection.find(filter or {}).limit(limit)
        return [doc async for doc in cursor]
