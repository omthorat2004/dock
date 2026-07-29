import json
import logging
from typing import Any

from google import genai

from app.ai.base import AIProvider, ToolHandler, ToolSpec

logger = logging.getLogger("app.ai.gemini")


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

    async def chat_with_tools(
        self,
        message: str,
        tools: list[ToolSpec],
        handler: ToolHandler,
        *,
        max_rounds: int = 4,
    ) -> str:
        """The interactions API's function-calling loop.

        Each round: read the `function_call` steps the model produced, run them,
        and continue the same interaction with the results. Continuing by
        `previous_interaction_id` rather than resending the transcript is what
        keeps the loop cheap — the prompt is sent once, however many rounds it
        takes.

        Tool calls in one round are run in order rather than concurrently: a
        handler is usually rate-limited downstream, and the ordering makes a
        failure easy to attribute.
        """
        interaction = await self._client.aio.interactions.create(
            model=self._model_version,
            input=message,
            tools=[self._declare(tool) for tool in tools],
        )

        for _ in range(max_rounds):
            calls = [
                step
                for step in (interaction.steps or [])
                if getattr(step, "type", None) == "function_call"
            ]
            if not calls:
                return interaction.output_text or ""

            results: list[dict[str, Any]] = []
            for call in calls:
                output = await handler(call.name, dict(call.arguments or {}))
                results.append(
                    {
                        "type": "function_result",
                        "call_id": call.id,
                        "name": call.name,
                        # The API takes the result as text; JSON is what the
                        # model reads back most reliably.
                        "result": json.dumps(output, ensure_ascii=False),
                    }
                )

            interaction = await self._client.aio.interactions.create(
                model=self._model_version,
                previous_interaction_id=interaction.id,
                input=results,
            )

        # Out of rounds with the model still calling tools. Whatever text it has
        # produced is returned as-is; the caller decides whether that is usable.
        logger.info("Tool loop hit its %d-round limit.", max_rounds)
        return interaction.output_text or ""

    @staticmethod
    def _declare(tool: ToolSpec) -> dict[str, Any]:
        return {
            "type": "function",
            "name": tool.name,
            "description": tool.description,
            "parameters": tool.parameters,
        }
