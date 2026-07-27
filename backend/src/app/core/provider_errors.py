"""Classifying AI provider SDK failures, independent of any vendor SDK.

This lives apart from `core.error_handlers` because two callers need it and
only one of them is a handler: the global handler turns a provider error into
an HTTP response, and `ChatService` needs to recognise *one* of those cases —
the blown context window — in order to record it on the session before the
error travels on.

Nothing here imports a vendor SDK. The inputs are a status code and a message,
which is all any provider exception carries, so a service can classify one
without importing `google.genai`.
"""

from fastapi import status

#: The code returned when a prompt is too large for the model. `ChatService`
#: matches on this to set `TopicSession.limit_reached`, and the frontend matches
#: on it to explain why the composer is closed — so it is named once, here.
TOKEN_LIMIT_CODE = "token_limit_reached"

# Phrases that mark a provider 400 as "the prompt blew the context window"
# rather than "the key is bad" — both come back as 400s, so the message is the
# only tell. Kept specific so a "token" in an auth message is not misread.
_TOKEN_LIMIT_HINTS = (
    "token count",
    "input token",
    "number of tokens",
    "too many tokens",
    "context length",
    "context window",
    "maximum context",
)


def classify_provider_error(
    status_code: int | None, message: str
) -> tuple[int, str, str]:
    """Map an AI provider SDK error onto (http status, code, detail).

    Pulled out of the handler so the branching is unit-testable without having
    to hand-build a vendor SDK exception.
    """
    text = (message or "").lower()

    if status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        return (
            status.HTTP_429_TOO_MANY_REQUESTS,
            "provider_rate_limited",
            "The AI provider's rate limit was hit. Wait a moment, then retry.",
        )

    if any(hint in text for hint in _TOKEN_LIMIT_HINTS):
        return (
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            TOKEN_LIMIT_CODE,
            "Token limit reached for this session. Start a new session to continue.",
        )

    if status_code in (
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    ):
        return (
            status.HTTP_401_UNAUTHORIZED,
            "invalid_provider_key",
            "Your AI provider API key was rejected. Check the key and try again.",
        )

    return (
        status.HTTP_502_BAD_GATEWAY,
        "provider_error",
        "The AI provider could not be reached. Please try again.",
    )


def is_token_limit_error(exc: Exception) -> bool:
    """Whether an exception from a provider means "the prompt was too big".

    Duck-typed on purpose: `code` and `message` are what the SDK exception
    carries, and reading them with `getattr` keeps the vendor import inside
    `app.ai` where the conventions say it belongs. Anything that is not a
    provider error simply fails to match and is re-raised by the caller.
    """
    _, code, _ = classify_provider_error(
        getattr(exc, "code", None), getattr(exc, "message", "") or str(exc)
    )
    return code == TOKEN_LIMIT_CODE
