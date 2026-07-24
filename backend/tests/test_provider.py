import pytest

from app.ai.factory import build_provider
from app.ai.gemini import GeminiProvider
from app.core.constants import DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION
from app.core.exceptions import ApiKeyNotConfigured, UnsupportedProvider
from app.models.user import User, utcnow


def _user(**overrides) -> User:
    base = {
        "_id": "u1",
        "email": "ada@university.edu",
        "full_name": "Ada Lovelace",
        "hashed_password": "x",
        "created_at": utcnow(),
    }
    return User(**{**base, **overrides})


def test_build_provider_requires_a_key():
    with pytest.raises(ApiKeyNotConfigured):
        build_provider(_user())


def test_build_provider_returns_gemini_when_configured():
    provider = build_provider(
        _user(
            api_key="a-key",
            model_name=DEFAULT_MODEL_NAME,
            model_version=DEFAULT_MODEL_VERSION,
        )
    )
    assert isinstance(provider, GeminiProvider)


def test_build_provider_rejects_an_unknown_model_name():
    with pytest.raises(UnsupportedProvider):
        build_provider(_user(api_key="a-key", model_name="wat"))
