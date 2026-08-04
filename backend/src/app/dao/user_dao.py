from app.dao.base import BaseDAO
from app.models.user import COLLECTION, User


class UserDAO(BaseDAO):
    collection_name = COLLECTION

    async def get_by_email(self, email: str) -> User | None:
        document = await self.find_one({"email": email})
        return User.from_document(document) if document else None

    async def get_by_id(self, user_id: str) -> User | None:
        document = await self.find_by_id(user_id)
        return User.from_document(document) if document else None

    async def create(self, user: User) -> User:
        await self.insert_one(user.to_document())
        return user

    async def email_exists(self, email: str) -> bool:
        return await self.find_one({"email": email}) is not None

    async def set_provider_config(
        self,
        user_id: str,
        *,
        api_key_encrypted: str,
        model_name: str,
        model_version: str,
    ) -> bool:
        """Store the user's encrypted provider key and model choice.

        The key arrives already encrypted; encrypting it is a rule, so it
        belongs to the service. False if there is no such user.

        `$unset` drops the plaintext `api_key` field that predates encryption,
        so a user who saves a key is migrated by the act of saving it.
        """
        result = await self.collection.update_one(
            {"_id": user_id},
            {
                "$set": {
                    "api_key_encrypted": api_key_encrypted,
                    "model_name": model_name,
                    "model_version": model_version,
                },
                "$unset": {"api_key": ""},
            },
        )
        return result.matched_count > 0

    async def clear_api_key(self, user_id: str) -> bool:
        """Drop the stored provider key. Model choice is left in place."""
        result = await self.collection.update_one(
            {"_id": user_id},
            {"$set": {"api_key_encrypted": None}, "$unset": {"api_key": ""}},
        )
        return result.matched_count > 0
