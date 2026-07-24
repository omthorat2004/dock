from google import genai

from app.ai.base import AIProvider


class GeminiProvider(AIProvider):
    """Google Gemini, via the `google-genai` SDK.

    The vendor call lives only here. SDK errors — a rejected key, a hit rate
    limit — are deliberately *not* caught: the app-level handler in
    `core.error_handlers` turns `google.genai.errors.APIError` into the API's
    standard error shape, so every route gets the same treatment for free.
    """

    def __init__(self, api_key: str, model_version: str) -> None:
        self._client = genai.Client(api_key=api_key)
        self._model_version = model_version

    async def chat(self, message: str) -> str:
        interaction = await self._client.aio.interactions.create(
            model=self._model_version,
            input=message,
        )
        return interaction.output_text or ""
