from datetime import datetime

from app.dao.base import BaseDAO
from app.models.refresh_token import COLLECTION, RefreshToken
from app.models.user import utcnow


class RefreshTokenDAO(BaseDAO):
    collection_name = COLLECTION

    async def create(self, token: RefreshToken) -> RefreshToken:
        await self.insert_one(token.to_document())
        return token

    async def get_by_id(self, token_id: str) -> RefreshToken | None:
        document = await self.find_by_id(token_id)
        return RefreshToken.from_document(document) if document else None

    async def revoke(self, token_id: str, *, replaced_by: str | None = None) -> bool:
        changes: dict[str, datetime | str | None] = {"revoked_at": utcnow()}
        if replaced_by:
            changes["replaced_by"] = replaced_by
        return await self.update_by_id(token_id, changes)

    async def revoke_all_for_user(self, user_id: str) -> int:
        """Used on logout-everywhere and on a replay attempt."""
        result = await self.collection.update_many(
            {"user_id": user_id, "revoked_at": None},
            {"$set": {"revoked_at": utcnow()}},
        )
        return result.modified_count
