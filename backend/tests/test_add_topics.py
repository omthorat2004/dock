"""Adding topics to a space that already exists, by hand or from the model."""

import pytest

from tests.helpers import FakeProvider, clear_provider, make_space, use_provider
from tests.test_auth import register


@pytest.fixture(autouse=True)
def _no_provider_leaks():
    yield
    clear_provider()


def endpoint(space_id: str) -> str:
    return f"/api/v1/spaces/{space_id}/topics"


def suggestions_endpoint(space_id: str) -> str:
    return f"/api/v1/spaces/{space_id}/topic-suggestions"


def names(body: dict) -> list[str]:
    return [topic["topic_name"] for topic in body["topics"]]


def test_adding_requires_authentication(client):
    space_id = make_space(client)
    client.post("/api/v1/auth/logout")
    assert client.post(endpoint(space_id), json={"topics": ["X"]}).status_code == 401


def test_topics_are_appended_to_the_space(client):
    space_id = make_space(client)

    response = client.post(endpoint(space_id), json={"topics": ["Stomata", "ATP"]})
    assert response.status_code == 200
    assert names(response.json()) == [
        "Light reactions",
        "Calvin cycle",
        "Stomata",
        "ATP",
    ]

    # The response is the whole space, so the canvas needs no follow-up fetch.
    assert names(client.get(f"/api/v1/spaces/{space_id}").json()) == names(
        response.json()
    )


def test_a_new_topic_starts_empty(client):
    space_id = make_space(client)

    body = client.post(endpoint(space_id), json={"topics": ["Stomata"]}).json()
    added = body["topics"][-1]

    assert added["id"]
    assert added["youtube_links"] == []
    assert added["session"] == {"session_id": None, "limit_reached": False}


def test_names_the_space_already_holds_are_skipped(client):
    space_id = make_space(client)

    body = client.post(
        endpoint(space_id), json={"topics": ["calvin cycle", "Stomata"]}
    ).json()

    assert names(body) == ["Light reactions", "Calvin cycle", "Stomata"]


def test_adding_only_topics_that_exist_changes_nothing(client):
    space_id = make_space(client)
    before = client.get(f"/api/v1/spaces/{space_id}").json()

    body = client.post(endpoint(space_id), json={"topics": ["Light reactions"]}).json()

    assert names(body) == names(before)


def test_at_least_one_topic_is_required(client):
    space_id = make_space(client)
    assert client.post(endpoint(space_id), json={"topics": []}).status_code == 422
    assert client.post(endpoint(space_id), json={"topics": ["  "]}).status_code == 422
    assert client.post(endpoint(space_id), json={}).status_code == 422


def test_somebody_elses_space_is_a_404(client):
    space_id = make_space(client)
    client.post("/api/v1/auth/logout")
    register(client, email="someone.else@university.edu")

    response = client.post(endpoint(space_id), json={"topics": ["Stomata"]})
    assert response.status_code == 404


def test_suggestions_read_the_lesson_and_topics_off_the_space(client):
    """Nothing is asked for here: the space already knows all of it."""
    space_id = make_space(client)
    provider = use_provider(FakeProvider(["Stomata\nATP synthase"]))

    response = client.post(suggestions_endpoint(space_id))
    assert response.status_code == 200
    assert response.json()["topics"] == "Stomata\nATP synthase"

    prompt = provider.prompts[0]
    assert "Photosynthesis" in prompt
    assert "Exam" in prompt
    assert "intermediate" in prompt
    # What is on the canvas travels too, so the model proposes something else.
    assert "- Light reactions" in prompt
    assert "- Calvin cycle" in prompt


def test_suggestions_for_a_space_require_an_api_key(client):
    space_id = make_space(client)
    response = client.post(suggestions_endpoint(space_id))
    assert response.status_code == 401
    assert response.json()["code"] == "api_key_not_configured"
