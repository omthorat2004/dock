import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
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
