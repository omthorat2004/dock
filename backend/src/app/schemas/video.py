from pydantic import BaseModel

from app.schemas.space import YoutubeLinkRead


class GenerateVideosResponse(BaseModel):
    """The result of one "find videos" request.

    Both lists are sent because the client needs both answers: `links` is the
    shelf to render, and `added` is how many are new, which can be zero when
    every search came back with videos the student already has.
    """

    added: list[YoutubeLinkRead]
    links: list[YoutubeLinkRead]
    #: True once the shelf is full, so the client can retire the button rather
    #: than working the limit out from a count it would have to keep in step.
    limit_reached: bool
    remaining: int
