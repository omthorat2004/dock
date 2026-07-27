from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings

# One client per process. It pools connections internally, so never build a
# client per request.
_client: AsyncMongoClient | None = None


def get_client() -> AsyncMongoClient:
    global _client
    if _client is None:
        _client = AsyncMongoClient(settings.mongodb_uri, tz_aware=True)
    return _client


def get_db() -> AsyncDatabase:
    """The application database. Use as a FastAPI dependency."""
    return get_client()[settings.mongodb_db]


async def connect() -> None:
    """Open the connection and apply indexes. Called from the app lifespan."""
    db = get_db()
    await db.command("ping")

    # Registration relies on this unique index, not on a read-then-write check.
    await db.users.create_index("email", unique=True)

    # Sessions are looked up per user, and Mongo evicts expired ones for us.
    await db.refresh_tokens.create_index("user_id")
    await db.refresh_tokens.create_index("expires_at", expireAfterSeconds=0)

    # Every transcript read is "this session, in order", and the `_id` tail is
    # what keeps the two messages of one turn from sorting arbitrarily.
    await db.chat_messages.create_index(
        [("session_id", 1), ("created_at", 1), ("_id", 1)]
    )

    # One summary per session, enforced rather than assumed: the rolling
    # rewrite upserts on this key, so a duplicate here would mean two summaries
    # racing to be the latest.
    await db.chat_summaries.create_index("session_id", unique=True)


async def disconnect() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
