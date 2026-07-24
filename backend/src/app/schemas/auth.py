from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
            raise ValueError("Password must include a letter and a number.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalise_email(cls, value: str) -> str:
        return value.strip().lower()


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    #: Access token lifetime, in seconds.
    expires_in: int
    #: Refresh token lifetime, in seconds.
    refresh_expires_in: int


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    created_at: datetime
    #: Whether the user has stored a provider API key. The key itself is never
    #: returned — only whether the client should show the "configured" state.
    has_api_key: bool = False


class AuthResponse(BaseModel):
    """Body for register/login/refresh.

    The tokens never travel in the body — they are set as httpOnly cookies. All
    the client gets back is a message and the signed-in user.
    """

    message: str
    user: UserResponse
