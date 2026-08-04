from app.ai.base import AIProvider
from app.ai.gemini import GeminiProvider
from app.core.exceptions import ApiKeyNotConfigured, UnsupportedProvider
from app.models.user import User


def build_provider(user: User) -> AIProvider:
    """Pick the AI provider for a user from their stored preferences.

    `model_name` chooses the provider family; `model_version` is the specific
    model that family should use. Only Gemini exists today; a new provider is a
    new `case` here plus a subclass of `AIProvider`.

    The api-key check is also done by the `AIProviderDep` dependency, but this
    guards again so the factory is safe to call on its own. The key is
    decrypted here, at the point it is handed to the SDK, and a stored value
    this deployment cannot read counts as no key at all.
    """
    api_key = user.provider_api_key
    if not api_key:
        raise ApiKeyNotConfigured

    match user.model_name:
        case "gemini":
            return GeminiProvider(api_key, user.model_version)
        case other:
            raise UnsupportedProvider(f"No provider is configured for '{other}'.")
