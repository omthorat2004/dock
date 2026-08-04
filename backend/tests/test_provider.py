import pytest

from app.ai.factory import build_provider
from app.ai.gemini import GeminiProvider
from app.core.constants import DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION
from app.core.crypto import encrypt_secret
from app.core.exceptions import ApiKeyNotConfigured, UnsupportedProvider
from app.models.user import User, utcnow

USER_ID = "u1"


def _user(**overrides) -> User:
    base = {
        "_id": USER_ID,
        "email": "ada@university.edu",
        "full_name": "Ada Lovelace",
        "hashed_password": "x",
        "created_at": utcnow(),
    }
    return User(**{**base, **overrides})


def _with_key(key: str = "a-key", **overrides) -> User:
    """A user whose key is stored the way the app stores it: encrypted."""
    return _user(
        api_key_encrypted=encrypt_secret(key, context=USER_ID),
        **overrides,
    )


def test_build_provider_requires_a_key():
    with pytest.raises(ApiKeyNotConfigured):
        build_provider(_user())


def test_build_provider_returns_gemini_when_configured():
    provider = build_provider(
        _with_key(
            model_name=DEFAULT_MODEL_NAME,
            model_version=DEFAULT_MODEL_VERSION,
        )
    )
    assert isinstance(provider, GeminiProvider)


def test_build_provider_rejects_an_unknown_model_name():
    with pytest.raises(UnsupportedProvider):
        build_provider(_with_key(model_name="wat"))


def test_build_provider_hands_the_sdk_the_decrypted_key():
    """What reaches the vendor is the plaintext, not what Mongo holds."""
    user = _with_key("AIzaReal")
    assert user.api_key_encrypted != "AIzaReal"
    assert user.provider_api_key == "AIzaReal"
    assert isinstance(build_provider(user), GeminiProvider)


def test_a_key_encrypted_for_another_user_is_no_key_at_all():
    """Copying one user's stored value into another's document buys nothing."""
    stolen = encrypt_secret("a-key", context="somebody-else")
    with pytest.raises(ApiKeyNotConfigured):
        build_provider(_user(api_key_encrypted=stolen))
