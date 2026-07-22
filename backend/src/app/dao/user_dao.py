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
