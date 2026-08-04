from typing import Any


class AppError(Exception):
    """Base class for every error the application raises deliberately.

    Services raise these instead of `HTTPException`, so business logic stays
    framework-free. The global handler in `core.error_handlers` maps them to a
    consistent JSON response.
    """

    status_code: int = 500
    code: str = "internal_error"
    message: str = "Something went wrong."

    def __init__(
        self,
        message: str | None = None,
        *,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message or self.message
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "detail": self.message}
        if self.details:
            payload["details"] = self.details
        return payload


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
    message = "Resource not found."


class ConflictError(AppError):
    status_code = 409
    code = "conflict"
    message = "That resource already exists."


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"
    message = "The submitted data is invalid."


class AuthenticationError(AppError):
    status_code = 401
    code = "authentication_error"
    message = "Not authenticated."


class PermissionError(AppError):  # noqa: A001 - deliberate domain name
    status_code = 403
    code = "permission_denied"
    message = "You do not have access to this resource."


class EmailAlreadyRegistered(ConflictError):
    code = "email_already_registered"
    message = "An account with that email already exists."


class InvalidCredentials(AuthenticationError):
    code = "invalid_credentials"
    message = "Incorrect email or password."


class ApiKeyNotConfigured(AuthenticationError):
    # 401 on purpose: the caller is authenticated to Dock but has not yet given
    # us the third-party key the request needs, so it cannot proceed.
    #
    # Its own `code`, not the inherited `authentication_error`, because the two
    # 401s mean opposite things to a client: one says the session is over and
    # the user should be sent to /login, this one says the session is fine and
    # they need to visit /api-key. Without the distinction the frontend's
    # refresh-on-401 interceptor treats a missing key as an expired session.
    status_code = 401
    code = "api_key_not_configured"
    message = "Add your AI provider API key before using the model."


class UnsupportedProvider(ValidationError):
    status_code = 422
    message = "That model provider is not supported."


class ContextLimitReached(AppError):
    """This topic's conversation no longer fits in the model's input budget.

    Raised in two places, and it has to be both: `ChatService` raises it *after*
    a provider rejected the prompt for size (having recorded that on the
    session), and again on every later send, up front, so a session known to be
    over the limit never pays for another provider call to be told the same
    thing.

    The code matches `provider_errors.TOKEN_LIMIT_CODE` deliberately: the
    frontend must not have to tell "the provider just said so" apart from "we
    already knew".
    """

    status_code = 413
    code = "token_limit_reached"
    message = "Token limit reached for this session. Start a new session to continue."


class VideoLimitReached(ConflictError):
    """The topic's video shelf is full; see `MAX_YOUTUBE_LINKS`."""

    code = "youtube_limit_reached"
    message = "This topic already holds every video it can."


class YoutubeUnavailable(AppError):
    """YouTube search cannot be reached: no key configured, or it is down.

    Distinct from `VideoLimitReached`: nothing is wrong with the topic, the
    search itself is unavailable, so the honest answer is "not right now" and
    the student should try again later rather than change anything.
    """

    status_code = 503
    code = "youtube_unavailable"
    message = "YouTube fetch is not available at this time. Please try again later."


class YoutubeRateLimited(AppError):
    """YouTube refused the search for quota or rate reasons.

    Its own code rather than `provider_rate_limited`: that one means the
    student's *own* AI key is being throttled and is theirs to fix, while this
    is Dock's shared YouTube quota and only waiting helps.
    """

    status_code = 429
    code = "youtube_rate_limited"
    message = "YouTube search has hit its request limit. Please try again in a while."
