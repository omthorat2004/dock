from abc import ABC, abstractmethod


class AIProvider(ABC):
    """A chat-capable model provider.

    Every concrete provider wraps one vendor SDK behind a single `chat` call, so
    nothing outside `app.ai` imports a vendor client. Adding another provider is
    a new subclass plus a branch in `build_provider` — callers never change.
    """

    @abstractmethod
    async def chat(self, message: str) -> str:
        """Send one prompt and return the model's text reply."""
        raise NotImplementedError
