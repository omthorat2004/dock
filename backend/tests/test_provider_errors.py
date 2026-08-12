import json

import httpx
import pytest
from google.genai import errors as genai_errors
from google.genai._gaos.errors.genaidefaulterror import GenAiDefaultError
from google.genai._gaos.lib import compat_errors

from app.ai.gemini import _as_api_error, _vendor_errors
from app.core.error_handlers import classify_provider_error
from app.core.provider_errors import is_token_limit_error


def test_rate_limit_maps_to_429():
    status_code, code, _ = classify_provider_error(429, "Resource exhausted.")
    assert status_code == 429
    assert code == "provider_rate_limited"


def test_token_limit_maps_to_413_and_asks_for_a_new_session():
    status_code, code, detail = classify_provider_error(
        400, "The input token count (1200000) exceeds the maximum number of tokens."
    )
    assert status_code == 413
    assert code == "token_limit_reached"
    assert "new session" in detail.lower()


def test_a_rejected_key_maps_to_401_not_token_limit():
    # A 400 whose message is about the key, not tokens, stays an auth failure.
    status_code, code, _ = classify_provider_error(400, "API key not valid.")
    assert status_code == 401
    assert code == "invalid_provider_key"


def test_anything_else_is_a_generic_provider_error():
    status_code, code, _ = classify_provider_error(500, "Internal error.")
    assert status_code == 502
    assert code == "provider_error"


# --- What the interactions API actually raises -----------------------------
#
# None of these are `google.genai.errors.APIError`, which is the only thing
# `error_handlers` registers a handler for, so every one of them used to reach
# the catch-all: a rejected key and a spent quota both came back as a 500
# "Something went wrong". `_as_api_error` rebuilds the canonical error so the
# existing handler maps them as it always has.


def response(status_code: int, body: str) -> httpx.Response:
    return httpx.Response(
        status_code, request=httpx.Request("POST", "https://x"), text=body
    )


#: The envelope Gemini answers a rejected key with: wrapped in a list, which is
#: what the SDK cannot parse.
WRAPPED_KEY = json.dumps(
    [
        {
            "error": {
                "code": 400,
                "message": "API key not valid. Please pass a valid API key.",
                "status": "INVALID_ARGUMENT",
            }
        }
    ]
)


def test_an_unparseable_rejected_key_maps_to_401():
    """The failure in the report: a 500 "Something went wrong" before."""
    exc = GenAiDefaultError(
        "Error response body did not match expected schema",
        response(400, WRAPPED_KEY),
        WRAPPED_KEY,
    )

    recovered = _as_api_error(exc)
    status_code, code, _ = classify_provider_error(recovered.code, recovered.message)
    assert status_code == 401
    assert code == "invalid_provider_key"


def test_the_message_comes_from_the_body_not_the_schema_complaint():
    """Classification reads the provider's sentence, not the SDK's."""
    exc = GenAiDefaultError(
        "Error response body did not match expected schema",
        response(400, WRAPPED_KEY),
        WRAPPED_KEY,
    )
    assert "API key not valid" in _as_api_error(exc).message


def test_a_rate_limit_maps_to_429():
    """The second half of the report: a 429 that surfaced as nothing useful."""
    body = json.dumps({"error": {"code": 429, "message": "Resource exhausted."}})
    exc = compat_errors.RateLimitError(
        "Error code: 429", response=response(429, body), body=body
    )

    recovered = _as_api_error(exc)
    status_code, code, _ = classify_provider_error(recovered.code, recovered.message)
    assert status_code == 429
    assert code == "provider_rate_limited"


def test_a_token_limit_still_reaches_the_session_check():
    """`ChatService` must still recognise it, since it closes the session."""
    body = json.dumps(
        [{"error": {"code": 400, "message": "The input token count exceeds the max."}}]
    )
    exc = GenAiDefaultError("schema", response(400, body), body)
    assert is_token_limit_error(_as_api_error(exc))


def test_an_unreadable_body_falls_back_to_the_status_code():
    """A body we cannot parse must not become a 500 by default."""
    exc = GenAiDefaultError("schema", response(429, "<html>gateway</html>"), "<html>")
    assert _as_api_error(exc).code == 429


def test_the_provider_wrapper_converts_what_the_handler_can_catch():
    """The wiring, not just the mapping.

    `_vendor_errors` is what makes the rest true: unless the exception leaving a
    vendor call is a `google.genai.errors.APIError`, the handler registered in
    `error_handlers` never sees it.
    """
    with pytest.raises(genai_errors.APIError) as caught, _vendor_errors():
        raise GenAiDefaultError("schema", response(400, WRAPPED_KEY), WRAPPED_KEY)

    assert caught.value.code == 400
    assert "API key not valid" in caught.value.message


def test_the_provider_wrapper_leaves_unrelated_errors_alone():
    """A bug in our own code must stay a bug, not become a provider failure."""
    with pytest.raises(ZeroDivisionError), _vendor_errors():
        raise ZeroDivisionError("a real bug")
