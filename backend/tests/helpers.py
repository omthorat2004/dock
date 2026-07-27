"""Shared fixtures for the routes that need a model.

Both the chat and the video routes hang off `AIProviderDep`. Overriding it is
how a test gets past the api-key gate; a test *of* that gate simply does not
install the override.
"""

from typing import Any

from google.genai import errors as genai_errors
from pymongo import MongoClient

from app.ai.base import AIProvider
from app.core.config import settings
from app.dependencies import get_ai_provider
from app.main import app
from tests.test_auth import register

SPACES = "/api/v1/spaces"
LESSON = {
    "lesson_name": "Photosynthesis",
    "topics": ["Light reactions", "Calvin cycle"],
}


class FakeProvider(AIProvider):
    """A provider that answers from a script and records what it was asked.

    `replies` may hold exceptions as well as strings — raising one is how a
    test reproduces a provider failure without a vendor SDK object.
    """

    def __init__(self, replies: list[Any] | None = None) -> None:
        self.replies = list(replies or [])
        self.prompts: list[str] = []

    async def chat(self, message: str) -> str:
        self.prompts.append(message)
        if not self.replies:
            return "A short explanation."
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


class FakeProviderError(genai_errors.APIError):
    """A real SDK error, built by hand.

    It subclasses the vendor type rather than imitating it so both halves of
    the path are exercised: `ChatService` classifying it by `code`/`message`,
    and — for everything that is *not* a token limit — the global handler
    catching it and mapping it to the right status. A stand-in `Exception`
    would fall through to the 500 catch-all and prove nothing.
    """

    def __init__(self, code: int | None, message: str) -> None:
        super().__init__(code or 500, {"error": {"message": message}})


def use_provider(provider: FakeProvider) -> FakeProvider:
    """Install `provider` for every route that depends on one."""
    app.dependency_overrides[get_ai_provider] = lambda: provider
    return provider


def clear_provider() -> None:
    app.dependency_overrides.pop(get_ai_provider, None)


def make_space(client, **overrides) -> str:
    """Register, create a space, and return its id."""
    register(client)
    response = client.post(SPACES, json={**LESSON, **overrides})
    return response.json()["id"]


def topic_ids(client, space_id: str) -> list[str]:
    body = client.get(f"{SPACES}/{space_id}").json()
    return [topic["id"] for topic in body["topics"]]


def stored_space(space_id: str) -> dict:
    from bson import ObjectId

    with MongoClient(settings.mongodb_uri) as mongo:
        return mongo[settings.mongodb_db]["spaces"].find_one(
            {"_id": ObjectId(space_id)}
        )


def stored(collection: str) -> list[dict]:
    with MongoClient(settings.mongodb_uri) as mongo:
        return list(mongo[settings.mongodb_db][collection].find())
