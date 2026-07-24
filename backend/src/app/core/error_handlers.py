import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from google.genai import errors as genai_errors
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError

logger = logging.getLogger("app.errors")


def _response(status_code: int, code: str, detail: str, **extra) -> JSONResponse:
    """Every error leaves the API in the same shape: {code, detail, ...}.

    `detail` is kept because that is what FastAPI and the frontend already read.
    """
    return JSONResponse(
        status_code=status_code, content={"code": code, "detail": detail, **extra}
    )


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
            "token_limit_reached",
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


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        if exc.status_code >= 500:
            logger.exception("Unhandled application error", exc_info=exc)
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _: Request, exc: RequestValidationError
    ) -> JSONResponse:
        first = exc.errors()[0] if exc.errors() else None
        detail = first["msg"] if first else "The submitted data is invalid."
        field = ".".join(str(p) for p in first["loc"][1:]) if first else None
        return _response(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "validation_error",
            detail,
            field=field,
        )

    @app.exception_handler(genai_errors.APIError)
    async def handle_provider_error(
        _: Request, exc: genai_errors.APIError
    ) -> JSONResponse:
        """Turn an AI provider SDK error into the API's standard error shape.

        The cases the frontend must tell apart are a rejected key, a hit rate
        limit, and a prompt over the token limit; anything else is an upstream
        failure the caller can only retry.
        """
        status_code, code, detail = classify_provider_error(
            getattr(exc, "code", None), getattr(exc, "message", "") or ""
        )
        if status_code >= 500:
            logger.exception("AI provider error", exc_info=exc)
        return _response(status_code, code, detail)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(
        _: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _response(exc.status_code, "http_error", str(exc.detail))

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        # Never leak a traceback or driver message to the client.
        logger.exception("Unexpected error", exc_info=exc)
        return _response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "internal_error",
            "Something went wrong. Please try again.",
        )
