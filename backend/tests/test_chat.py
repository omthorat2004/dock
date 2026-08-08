"""Learn mode: one topic's conversation, its rolling summary, and its limit."""

import json

import pytest
from bson import ObjectId

from app.models.chat import RECENT_MESSAGE_WINDOW
from tests.helpers import (
    FakeProvider,
    FakeProviderError,
    clear_provider,
    make_space,
    stored,
    stored_space,
    topic_ids,
    use_provider,
)


@pytest.fixture(autouse=True)
def _no_provider_leaks():
    yield
    clear_provider()


def endpoint(space_id: str, topic_id: str) -> str:
    return f"/api/v1/spaces/{space_id}/topics/{topic_id}/chat"


def tutor_prompts(provider: FakeProvider) -> list[str]:
    """Only the prompts that were a student's turn, not a summarisation."""
    return [p for p in provider.prompts if p.startswith("You are Dock")]


def summary_prompts(provider: FakeProvider) -> list[str]:
    return [p for p in provider.prompts if p.startswith("Summarise this stretch")]


def send(client, space_id, topic_id, message):
    return client.post(endpoint(space_id, topic_id), json={"message": message})


def test_chatting_requires_a_configured_api_key(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    response = send(client, space_id, topic_id, "Explain the Calvin cycle.")
    assert response.status_code == 401
    assert response.json()["code"] == "api_key_not_configured"


def test_reading_history_does_not_require_an_api_key(client):
    """The transcript is already written; showing it needs no model."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    response = client.get(endpoint(space_id, topic_id))
    assert response.status_code == 200
    assert response.json() == {
        "session_id": None,
        "limit_reached": False,
        "messages": [],
    }


def test_a_first_message_mints_the_session_and_stores_both_turns(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(FakeProvider(["Light drives the light reactions."]))

    response = send(client, space_id, topic_id, "What powers it?")
    assert response.status_code == 201

    body = response.json()
    assert body["session_id"]
    assert body["reply"]["role"] == "assistant"
    assert body["reply"]["content"] == "Light drives the light reactions."

    # The session id is minted on first chat, not at space creation.
    session = stored_space(space_id)["topics"][0]["session"]
    assert session["session_id"] == body["session_id"]
    assert session["created_at"] is not None

    history = client.get(endpoint(space_id, topic_id)).json()["messages"]
    assert [(m["role"], m["content"]) for m in history] == [
        ("user", "What powers it?"),
        ("assistant", "Light drives the light reactions."),
    ]


def test_the_reply_never_sorts_above_its_own_question(client):
    """Both messages of a turn share a timestamp; `_id` has to break the tie."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(FakeProvider())

    for n in range(4):
        send(client, space_id, topic_id, f"question {n}")

    roles = [
        m["role"] for m in client.get(endpoint(space_id, topic_id)).json()["messages"]
    ]
    assert roles == ["user", "assistant"] * 4


def test_the_prompt_carries_the_recent_window(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    provider = use_provider(FakeProvider())

    send(client, space_id, topic_id, "question 0")
    send(client, space_id, topic_id, "question 1")

    latest = tutor_prompts(provider)[-1]
    assert "Lesson: Photosynthesis" in latest
    assert "Topic: Light reactions" in latest
    assert "question 0" in latest  # the earlier turn travelled with it
    assert latest.rstrip().endswith("user: question 1\nassistant:")


def test_the_prompt_carries_the_goal_and_level(client):
    """What the space was created for is what the tutor answers at."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    provider = use_provider(FakeProvider())

    send(client, space_id, topic_id, "explain this")

    latest = tutor_prompts(provider)[-1]
    assert "Revising for: Exam" in latest
    assert "Student's level: intermediate" in latest
    assert "Assume the basics are known" in latest


def test_a_summary_appears_once_the_window_overflows(client):
    """Six turns is twelve messages, two more than the window holds."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    provider = use_provider(FakeProvider())

    for n in range(5):
        send(client, space_id, topic_id, f"question {n}")

    # Ten messages: still exactly the window, so nothing to summarise yet.
    assert stored("chat_summaries") == []
    assert summary_prompts(provider) == []

    send(client, space_id, topic_id, "question 5")

    (summary,) = stored("chat_summaries")
    assert summary["message_count"] == 12 - RECENT_MESSAGE_WINDOW
    assert summary["content"]


def test_there_is_only_ever_one_summary_per_session(client):
    """Each rewrite supersedes the last rather than accumulating."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(FakeProvider())

    for n in range(8):
        send(client, space_id, topic_id, f"question {n}")

    summaries = stored("chat_summaries")
    assert len(summaries) == 1
    # 16 messages, so everything but the last ten is folded in.
    assert summaries[0]["message_count"] == 16 - RECENT_MESSAGE_WINDOW


def test_the_summary_replaces_the_messages_that_aged_out(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    provider = use_provider(FakeProvider())

    for n in range(7):
        send(client, space_id, topic_id, f"question {n}")

    latest = tutor_prompts(provider)[-1]
    assert "Earlier in this conversation:" in latest
    # The first turn is now the summary's job, not the window's.
    assert "question 0" not in latest
    assert "question 6" in latest


def test_a_token_limit_marks_the_session_and_returns_413(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(
        FakeProvider(
            [FakeProviderError(400, "The input token count exceeds the maximum.")]
        )
    )

    response = send(client, space_id, topic_id, "One more question.")
    assert response.status_code == 413
    assert response.json()["code"] == "token_limit_reached"

    # Recorded on the session, so the panel can say so without sending again.
    assert stored_space(space_id)["topics"][0]["session"]["limit_reached"] is True


def test_a_limited_session_is_refused_without_calling_the_model(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(FakeProvider([FakeProviderError(400, "input token count too large")]))
    send(client, space_id, topic_id, "the one that broke it")

    fresh = use_provider(FakeProvider(["should never be asked"]))
    response = send(client, space_id, topic_id, "and another")

    assert response.status_code == 413
    assert response.json()["code"] == "token_limit_reached"
    assert fresh.prompts == []  # the provider was never reached


def test_the_limit_is_visible_on_the_space_and_in_history(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(FakeProvider([FakeProviderError(400, "context window exceeded")]))
    send(client, space_id, topic_id, "too much")

    topic = client.get(f"/api/v1/spaces/{space_id}").json()["topics"][0]
    assert topic["session"]["limit_reached"] is True
    assert client.get(endpoint(space_id, topic_id)).json()["limit_reached"] is True


def test_other_provider_failures_are_not_treated_as_a_limit(client):
    """A rate limit must not close the session; it is retryable.

    It also has to reach the global handler unchanged, which is the point of
    re-raising rather than swallowing anything that is not a token limit.
    """
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(FakeProvider([FakeProviderError(429, "Quota exceeded.")]))

    response = send(client, space_id, topic_id, "hello")
    assert response.status_code == 429
    assert response.json()["code"] == "provider_rate_limited"
    assert stored_space(space_id)["topics"][0]["session"]["limit_reached"] is False


def test_a_rejected_key_reaches_the_global_handler(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(FakeProvider([FakeProviderError(400, "API key not valid.")]))

    response = send(client, space_id, topic_id, "hello")
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_provider_key"


def test_an_empty_message_is_rejected_before_the_model(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    provider = use_provider(FakeProvider())

    assert send(client, space_id, topic_id, "   ").status_code == 422
    assert provider.prompts == []


def test_chatting_to_a_missing_topic_is_404(client):
    space_id = make_space(client)
    use_provider(FakeProvider())
    assert send(client, space_id, str(ObjectId()), "hello").status_code == 404


# --- Streaming -------------------------------------------------------------
#
# The same turn as `send`, over `text/event-stream`. What these check is the
# seam that only the streaming route has: which failures are still allowed to
# be a status code, and which have to travel as an event because the status
# line already left.


def stream(client, space_id, topic_id, message):
    return client.post(
        f"{endpoint(space_id, topic_id)}/stream", json={"message": message}
    )


def frames(response) -> list[tuple[str, dict]]:
    """The (event, payload) pairs in an SSE body."""
    parsed = []
    for block in response.text.split("\n\n"):
        if not block.strip():
            continue
        event, data = "message", ""
        for line in block.split("\n"):
            if line.startswith("event:"):
                event = line[6:].strip()
            elif line.startswith("data:"):
                data = line[5:].strip()
        parsed.append((event, json.loads(data)))
    return parsed


def test_a_streamed_reply_arrives_in_fragments_and_is_stored_whole(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(FakeProvider(["Light drives the light reactions."]))

    response = stream(client, space_id, topic_id, "What powers it?")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = frames(response)
    tokens = [payload["text"] for event, payload in events if event == "token"]
    assert len(tokens) > 1, "a reply that arrives in one piece is not streaming"
    assert "".join(tokens) == "Light drives the light reactions."

    event, done = events[-1]
    assert event == "done"
    assert done["reply"]["content"] == "Light drives the light reactions."

    # The transcript holds the reply as one message. The fragments are a
    # delivery detail and must not survive into storage.
    stored_messages = [message["content"] for message in stored("chat_messages")]
    assert stored_messages == ["What powers it?", "Light drives the light reactions."]


def test_streaming_requires_a_configured_api_key(client):
    """Known before the model is reached, so it is still a status code."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    response = stream(client, space_id, topic_id, "Explain the Calvin cycle.")
    assert response.status_code == 401
    assert response.json()["code"] == "api_key_not_configured"


def test_streaming_a_closed_session_is_refused_before_the_stream_starts(client):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(
        FakeProvider(
            [FakeProviderError(400, "The input token count exceeds the maximum.")]
        )
    )
    assert send(client, space_id, topic_id, "One more question.").status_code == 413

    # The session is closed now, so this one never reaches the model and can
    # still be answered with a status code rather than an event.
    response = stream(client, space_id, topic_id, "And another.")
    assert response.status_code == 413
    assert response.json()["code"] == "token_limit_reached"


def test_a_token_limit_during_a_stream_arrives_as_an_error_event(client):
    """The response is already 200 by the time the provider refuses."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    use_provider(
        FakeProvider(
            [FakeProviderError(400, "The input token count exceeds the maximum.")]
        )
    )

    response = stream(client, space_id, topic_id, "One more question.")
    assert response.status_code == 200

    event, payload = frames(response)[-1]
    assert event == "error"
    assert payload["code"] == "token_limit_reached"
    # The status the same failure would have carried on the JSON route, so the
    # client branches on one set of codes either way.
    assert payload["status"] == 413

    # Recorded on the session exactly as the non-streaming route records it.
    assert stored_space(space_id)["topics"][0]["session"]["limit_reached"] is True
    # The turn produced no text, so nothing is stored: a transcript holding a
    # question with no answer would be worse than no transcript.
    assert stored("chat_messages") == []


def test_a_streamed_turn_still_rolls_the_summary(client):
    """Streaming changes delivery, not the bookkeeping that follows a turn."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]
    provider = use_provider(FakeProvider())

    for index in range(RECENT_MESSAGE_WINDOW):
        stream(client, space_id, topic_id, f"question {index}")

    assert summary_prompts(provider), "no summary was ever queued"
    assert stored("chat_summaries")
