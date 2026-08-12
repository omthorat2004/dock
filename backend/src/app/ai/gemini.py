import contextlib
import json
import logging
from collections.abc import AsyncIterator, Iterator
from typing import Any

from google import genai
from google.genai import errors as genai_errors
from google.genai._gaos.errors.genaierror import GenAiError
from google.genai._gaos.lib import compat_errors

from app.ai.base import AIProvider, ToolHandler, ToolSpec

logger = logging.getLogger("app.ai.gemini")

#: What the interactions API actually raises, and the reason this module has to
#: translate at all.
#:
#: `core.error_handlers` registers its provider handler on
#: `google.genai.errors.APIError`, but nothing on this path is one. The SDK has
#: two *other* hierarchies, neither related to it:
#:
#:   * `compat_errors.APIError` — `BadRequestError`, `RateLimitError` and the
#:     rest, raised when the failure parses cleanly;
#:   * `GenAiError` — `GenAiDefaultError` and `ResponseValidationError`, raised
#:     when it does not, which is what a rejected key produces, because Gemini
#:     answers that one with the error envelope wrapped in a *list*
#:     (`[{"error": {...}}]`) where the SDK expects an object.
#:
#: Either way the exception fell past the provider handler to the catch-all, so
#: every provider failure — a bad key, a spent quota — reached the student as a
#: 500 "Something went wrong". Both hierarchies carry `status_code`, `message`
#: and `body`, which is enough to rebuild the canonical error and leave
#: everything downstream unchanged.
_VENDOR_ERRORS = (compat_errors.APIError, GenAiError)


def _error_payload(body: Any) -> dict[str, Any]:
    """The `{"code", "message", ...}` object out of a provider error body.

    Handles both envelopes: the documented `{"error": {...}}` and the
    list-wrapped `[{"error": {...}}]` that started this. An unreadable body is
    not an error here — the caller still has `status_code` to fall back on.
    """
    if isinstance(body, (str, bytes)):
        try:
            body = json.loads(body)
        except (ValueError, TypeError):
            return {}
    if isinstance(body, list):
        body = body[0] if body else None
    if not isinstance(body, dict):
        return {}
    error = body.get("error")
    return error if isinstance(error, dict) else {}


def _as_api_error(exc: Exception) -> genai_errors.APIError:
    """Rebuild the canonical SDK error from whichever one the SDK raised.

    Returning `google.genai.errors.APIError` rather than a new domain exception
    is deliberate: it is what the global handler already maps and what
    `is_token_limit_error` already duck-types on, so this is the only place that
    has to know the vendor raises three different things.

    The body is preferred over the exception's own attributes for the message,
    because the wrapped case puts the useful sentence ("API key not valid")
    inside the body while the exception's own message is about schemas.
    """
    payload = _error_payload(getattr(exc, "body", None))

    code = payload.get("code")
    if not isinstance(code, int):
        code = getattr(exc, "status_code", None)
    if not isinstance(code, int):
        code = 500

    message = payload.get("message") or getattr(exc, "message", "") or str(exc)
    return genai_errors.APIError(code, {"error": {"code": code, "message": message}})


@contextlib.contextmanager
def _vendor_errors() -> Iterator[None]:
    """Normalise one vendor call's failure into the SDK's canonical error."""
    try:
        yield
    except _VENDOR_ERRORS as exc:
        raise _as_api_error(exc) from exc


class GeminiProvider(AIProvider):
    """Google Gemini, via the `google-genai` SDK.

    The vendor call lives only here. SDK errors (a rejected key, a hit rate
    limit) are deliberately *not* caught: the app-level handler in
    `core.error_handlers` turns `google.genai.errors.APIError` into the API's
    standard error shape, so every route gets the same treatment for free.

    `_vendor_errors` is the one exception, and it exists to *preserve* that: it
    only rebuilds the SDK's own exception for a failure the SDK itself could not
    parse into one. Nothing is swallowed.
    """

    def __init__(self, api_key: str, model_version: str) -> None:
        self._client = genai.Client(api_key=api_key)
        self._model_version = model_version

    async def chat(self, message: str) -> str:
        with _vendor_errors():
            interaction = await self._client.aio.interactions.create(
                model=self._model_version,
                input=message,
            )
        return interaction.output_text or ""

    async def stream(self, message: str) -> AsyncIterator[str]:
        """The same call as `chat`, read as it is written.

        The interactions API answers a streamed request with a sequence of
        events, of which only one carries reply text: a `step.delta` whose delta
        is a `text` delta. The rest — step starts and stops, thought summaries,
        the closing `interaction.completed` — are skipped rather than
        concatenated, because a thought summary is the model reasoning about the
        answer, not the answer, and the student must never be shown it.

        SDK errors propagate exactly as they do from `chat`. A prompt over the
        context window fails here, on the opening request, before the first
        fragment, which is what lets the caller still treat it as a failed turn
        rather than a truncated one.
        """
        with _vendor_errors():
            stream = await self._client.aio.interactions.create(
                model=self._model_version,
                input=message,
                stream=True,
            )

            # Inside the block too: a rate limit can land on the opening request
            # or partway through the events, and both have to reach the caller
            # as the same provider error.
            async for event in stream:
                if getattr(event, "event_type", None) != "step.delta":
                    continue
                delta = getattr(event, "delta", None)
                if getattr(delta, "type", None) != "text":
                    continue
                text = getattr(delta, "text", "")
                if text:
                    yield text

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
        keeps the loop cheap: the prompt is sent once, however many rounds it
        takes.

        Tool calls in one round are run in order rather than concurrently: a
        handler is usually rate-limited downstream, and the ordering makes a
        failure easy to attribute.
        """
        with _vendor_errors():
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

            # Only the vendor call is wrapped, never `handler` above: a tool
            # that fails must reach the caller untouched, as it always has.
            with _vendor_errors():
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
