from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ToolSpec:
    """One function the model may call, described the way every vendor asks.

    `parameters` is a JSON Schema object for the arguments. Kept vendor-neutral
    here so a tool is declared once and each provider translates it into its own
    SDK's shape.
    """

    name: str
    description: str
    parameters: dict[str, Any]


#: Runs one tool call: given the tool's name and the arguments the model chose,
#: return whatever should be handed back to it (anything JSON-serialisable).
#:
#: Exceptions are deliberately *not* caught by the provider. A tool that fails
#: because a downstream service is down or rate limited should end the request
#: with that error, not leave the model guessing its way around it.
ToolHandler = Callable[[str, dict[str, Any]], Awaitable[Any]]


class AIProvider(ABC):
    """A chat-capable model provider.

    Every concrete provider wraps one vendor SDK behind these two calls, so
    nothing outside `app.ai` imports a vendor client. Adding another provider is
    a new subclass plus a branch in `build_provider` — callers never change.
    """

    @abstractmethod
    async def chat(self, message: str) -> str:
        """Send one prompt and return the model's text reply."""
        raise NotImplementedError

    @abstractmethod
    async def chat_with_tools(
        self,
        message: str,
        tools: list[ToolSpec],
        handler: ToolHandler,
        *,
        max_rounds: int = 4,
    ) -> str:
        """Send one prompt that the model may answer by calling tools first.

        Runs the call/result loop to completion and returns the model's final
        text. `max_rounds` bounds it: a model that keeps calling tools is cut
        off after that many rounds, so one request cannot spin.
        """
        raise NotImplementedError
