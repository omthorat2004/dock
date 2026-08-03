from pymongo import MongoClient

from app.core.config import settings
from tests.test_auth import register

ENDPOINT = "/api/v1/spaces"
LESSON = {
    "lesson_name": "Photosynthesis",
    "topics": ["Light reactions", "Calvin cycle"],
}


def stored_spaces() -> list[dict]:
    """Read the documents straight from Mongo to assert the write shape."""
    with MongoClient(settings.mongodb_uri) as mongo:
        return list(mongo[settings.mongodb_db]["spaces"].find())


def test_creating_a_space_requires_authentication(client):
    assert client.post(ENDPOINT, json=LESSON).status_code == 401


def test_listing_spaces_requires_authentication(client):
    assert client.get(ENDPOINT).status_code == 401


def test_a_signed_in_user_can_create_a_space(client):
    register(client)  # leaves the auth cookies on the client

    response = client.post(ENDPOINT, json=LESSON)
    assert response.status_code == 201

    body = response.json()
    assert body["lesson_name"] == "Photosynthesis"
    assert body["topic_count"] == 2
    assert body["id"]
    assert body["created_at"] and body["updated_at"]


def test_a_created_space_stores_topics_with_an_empty_session(client):
    register(client)
    client.post(ENDPOINT, json=LESSON)

    (document,) = stored_spaces()
    assert document["lesson_name"] == "Photosynthesis"
    assert [topic["topic_name"] for topic in document["topics"]] == [
        "Light reactions",
        "Calvin cycle",
    ]

    for topic in document["topics"]:
        assert topic["youtube_links"] == []
        # No chat has happened yet, so the session is empty but present.
        assert topic["session"] == {
            "session_id": None,
            "limit_reached": False,
            "created_at": None,
            "updated_at": None,
        }


def test_the_same_lesson_can_be_shared_twice(client):
    # lesson_name is not unique on purpose; a student may re-share a lesson
    # when their syllabus changes.
    register(client)
    assert client.post(ENDPOINT, json=LESSON).status_code == 201
    assert client.post(ENDPOINT, json=LESSON).status_code == 201
    assert len(client.get(ENDPOINT).json()) == 2


def test_a_lesson_name_is_required(client):
    register(client)
    body = {"lesson_name": "   ", "topics": ["Light reactions"]}
    assert client.post(ENDPOINT, json=body).status_code == 422


def test_at_least_one_topic_is_required(client):
    register(client)
    assert (
        client.post(
            ENDPOINT, json={"lesson_name": "Photosynthesis", "topics": []}
        ).status_code
        == 422
    )
    assert (
        client.post(ENDPOINT, json={"lesson_name": "Photosynthesis"}).status_code == 422
    )


def test_blank_and_duplicate_topics_are_collapsed(client):
    register(client)
    body = {
        "lesson_name": "Photosynthesis",
        "topics": ["  Calvin cycle  ", "calvin cycle", "   ", "Light reactions"],
    }
    response = client.post(ENDPOINT, json=body)
    assert response.status_code == 201
    assert response.json()["topic_count"] == 2

    (document,) = stored_spaces()
    assert [topic["topic_name"] for topic in document["topics"]] == [
        "Calvin cycle",
        "Light reactions",
    ]


def test_listing_returns_a_summary_without_the_topics(client):
    register(client)
    client.post(ENDPOINT, json=LESSON)

    response = client.get(ENDPOINT)
    assert response.status_code == 200

    (summary,) = response.json()
    assert summary["lesson_name"] == "Photosynthesis"
    assert summary["topic_count"] == 2
    # A card needs the count, never the topics themselves.
    assert "topics" not in summary
    assert set(summary) == {
        "id",
        "lesson_name",
        "topic_count",
        "created_at",
        "updated_at",
    }


def test_listing_is_newest_activity_first(client):
    register(client)
    for name in ("Photosynthesis", "Respiration", "Osmosis"):
        client.post(ENDPOINT, json={"lesson_name": name, "topics": ["Overview"]})

    names = [space["lesson_name"] for space in client.get(ENDPOINT).json()]
    assert names == ["Osmosis", "Respiration", "Photosynthesis"]


def test_a_user_only_sees_their_own_spaces(client):
    register(client)
    client.post(ENDPOINT, json=LESSON)
    client.post("/api/v1/auth/logout")

    register(client, email="someone.else@example.com")

    assert client.get(ENDPOINT).json() == []
