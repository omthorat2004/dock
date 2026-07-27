import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from google.genai import errors as genai_errors
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError
from app.core.provider_errors import classify_provider_error

logger = logging.getLogger("app.errors")

# `classify_provider_error` used to live here. It moved to `core.provider_errors`
# once ChatService needed it too — a service must be able to recognise a blown
# context window without importing an error *handler*. It is re-exported so the
# existing tests and imports keep working.
__all__ = ["classify_provider_error", "register_error_handlers"]


def _response(status_code: int, code: str, detail: str, **extra) -> JSONResponse:
    """Every error leaves the API in the same shape: {code, detail, ...}.

    `detail` is kept because that is what FastAPI and the frontend already read.
    """
    return JSONResponse(
        status_code=status_code, content={"code": code, "detail": detail, **extra}
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
