from app.core.error_handlers import classify_provider_error


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
