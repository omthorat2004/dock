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
