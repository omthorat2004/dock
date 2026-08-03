from pydantic import BaseModel


class MessageResponse(BaseModel):
    """A bare acknowledgement, used where a route has nothing else to return."""

    message: str
