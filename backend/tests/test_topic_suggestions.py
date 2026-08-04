"""Topic suggestions: the model proposes topics while the create form is open."""

import pytest

from tests.helpers import FakeProvider, clear_provider, use_provider
from tests.test_auth import register

ENDPOINT = "/api/v1/spaces/topic-suggestions"
ASK = {
    "lesson_name": "Photosynthesis",
    "goal": "Exam",
    "level": "intermediate",
}
REPLY = "Light reactions\nCalvin cycle\nChlorophyll and pigments"


@pytest.fixture(autouse=True)
def _no_provider_leaks():
    yield
    clear_provider()


def test_suggesting_requires_authentication(client):
    assert client.post(ENDPOINT, json=ASK).status_code == 401


def test_suggesting_requires_a_configured_api_key(client):
    """No override installed, so the real api-key gate runs."""
    register(client)
    response = client.post(ENDPOINT, json=ASK)
    assert response.status_code == 401
    assert response.json()["code"] == "api_key_not_configured"


def test_the_reply_comes_back_as_the_model_wrote_it(client):
    register(client)
    use_provider(FakeProvider([REPLY]))

    response = client.post(ENDPOINT, json=ASK)
    assert response.status_code == 200
    assert response.json()["topics"] == REPLY


def test_the_prompt_carries_the_lesson_goal_and_level(client):
    register(client)
    provider = use_provider(FakeProvider([REPLY]))

    client.post(ENDPOINT, json=ASK)

    prompt = provider.prompts[0]
    assert "Photosynthesis" in prompt
    assert "Exam" in prompt
    assert "intermediate" in prompt
    assert "5 topics" in prompt


def test_topics_already_picked_are_sent_so_they_are_not_repeated(client):
    """A second press asks for five more, not five of the same."""
    register(client)
    provider = use_provider(FakeProvider([REPLY]))

    client.post(ENDPOINT, json={**ASK, "topics": ["Light reactions", "  "]})

    prompt = provider.prompts[0]
    assert "already has these topics" in prompt
    assert "- Light reactions" in prompt


def test_all_three_fields_are_required(client):
    register(client)
    use_provider(FakeProvider([REPLY, REPLY, REPLY, REPLY]))

    for field in ("lesson_name", "goal", "level"):
        body = {key: value for key, value in ASK.items() if key != field}
        assert client.post(ENDPOINT, json=body).status_code == 422

    assert client.post(ENDPOINT, json={**ASK, "goal": "   "}).status_code == 422
    assert client.post(ENDPOINT, json={**ASK, "level": "expert"}).status_code == 422


def test_suggesting_stores_nothing(client):
    register(client)
    use_provider(FakeProvider([REPLY]))

    client.post(ENDPOINT, json=ASK)
    assert client.get("/api/v1/spaces").json() == []
