from pymongo.asynchronous.database import AsyncDatabase

from app.core.constants import DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION
from app.core.exceptions import NotFoundError
from app.dao.user_dao import UserDAO


class UserService:
    """User profile and AI-provider configuration.

    Holds the rules; every query goes through the DAO. Raises domain errors from
    `core.exceptions` — never `HTTPException`.
    """

    def __init__(self, db: AsyncDatabase) -> None:
        self.users = UserDAO(db)

    async def configure_api_key(self, user_id: str, api_key: str) -> None:
        """Store the caller's provider API key with the default model + version.

        Model and version are defaulted deliberately: the endpoint only takes a
        key today, but the storage already carries both so that when the UI lets
        a user pick a version this grows into new parameters here — not a new
        column and not a schema migration.
        """
        updated = await self.users.set_provider_config(
            user_id,
            api_key=api_key,
            model_name=DEFAULT_MODEL_NAME,
            model_version=DEFAULT_MODEL_VERSION,
        )
        if not updated:
            raise NotFoundError("User not found.")

    async def remove_api_key(self, user_id: str) -> None:
        """Clear the caller's stored provider key."""
        updated = await self.users.clear_api_key(user_id)
        if not updated:
            raise NotFoundError("User not found.")
