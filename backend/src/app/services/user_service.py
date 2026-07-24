from pymongo.asynchronous.database import AsyncDatabase

from app.core.constants import DEFAULT_MODEL_NAME
from app.core.exceptions import NotFoundError
from app.dao.user_dao import UserDAO


class UserService:
    """User profile and AI-provider configuration.

    Holds the rules; every query goes through the DAO. Raises domain errors from
    `core.exceptions` — never `HTTPException`.
    """

    def __init__(self, db: AsyncDatabase) -> None:
        self.users = UserDAO(db)

    async def configure_api_key(
        self, user_id: str, api_key: str, model_version: str
    ) -> None:
        """Store the caller's provider API key and chosen model.

        The provider family (`model_name`) is still defaulted to Gemini — only
        the model version is user-chosen for now. When more providers land, the
        family is derived from the model instead of hard-defaulted here.
        """
        updated = await self.users.set_provider_config(
            user_id,
            api_key=api_key,
            model_name=DEFAULT_MODEL_NAME,
            model_version=model_version,
        )
        if not updated:
            raise NotFoundError("User not found.")

    async def remove_api_key(self, user_id: str) -> None:
        """Clear the caller's stored provider key."""
        updated = await self.users.clear_api_key(user_id)
        if not updated:
            raise NotFoundError("User not found.")
