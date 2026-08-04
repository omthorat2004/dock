"""GET /spaces/{id}: what opening a canvas loads."""

from bson import ObjectId
from pymongo import MongoClient

from app.core.config import settings
from tests.helpers import LESSON, SPACES, make_space, stored_space
from tests.test_auth import register


def test_space_detail_requires_authentication(client):
    assert client.get(f"{SPACES}/{ObjectId()}").status_code == 401


def test_space_detail_returns_the_topics_the_list_withholds(client):
    space_id = make_space(client)

    response = client.get(f"{SPACES}/{space_id}")
    assert response.status_code == 200

    body = response.json()
    assert body["lesson_name"] == "Photosynthesis"
    assert body["goal"] == "Exam"
    assert body["level"] == "intermediate"
    assert [topic["topic_name"] for topic in body["topics"]] == [
        "Light reactions",
        "Calvin cycle",
    ]

    topic = body["topics"][0]
    assert topic["youtube_links"] == []
    assert topic["video_limit_reached"] is False
    assert topic["session"] == {"session_id": None, "limit_reached": False}


def test_a_missing_space_is_404(client):
    register(client)
    assert client.get(f"{SPACES}/{ObjectId()}").status_code == 404


def test_an_unparseable_id_is_404_not_500(client):
    """A malformed id is a space that does not exist, not a server error."""
    register(client)
    assert client.get(f"{SPACES}/not-an-object-id").status_code == 404


def test_another_users_space_is_404_not_403(client):
    space_id = make_space(client)
    client.post("/api/v1/auth/logout")
    register(client, email="someone.else@university.edu")

    # 404, so an id's existence is not something a stranger can probe for.
    assert client.get(f"{SPACES}/{space_id}").status_code == 404


def test_topic_ids_are_stable_across_loads(client):
    space_id = make_space(client)

    first = [t["id"] for t in client.get(f"{SPACES}/{space_id}").json()["topics"]]
    second = [t["id"] for t in client.get(f"{SPACES}/{space_id}").json()["topics"]]

    assert first == second
    assert all(first)


def test_topics_stored_without_ids_are_backfilled_once(client):
    """A topic saved before `Topic.id` existed must not get a new id each read.

    `Topic.id` has a default factory, so without the backfill every load would
    mint fresh ids, and the chat and video routes address a topic *by* id, so
    the canvas would break on the second render.
    """
    register(client)
    user_id = client.get("/api/v1/auth/me").json()["id"]

    with MongoClient(settings.mongodb_uri) as mongo:
        result = mongo[settings.mongodb_db]["spaces"].insert_one(
            {
                "user_id": user_id,
                "lesson_name": "Legacy lesson",
                "topics": [
                    {
                        "topic_name": "Old topic",
                        "youtube_links": [],
                        "session": {
                            "session_id": None,
                            "limit_reached": False,
                            "created_at": None,
                            "updated_at": None,
                        },
                    }
                ],
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        )
    space_id = str(result.inserted_id)

    body = client.get(f"{SPACES}/{space_id}").json()
    # A space created before the goal was asked for still loads, without one.
    assert body["goal"] is None and body["level"] is None

    first = [t["id"] for t in body["topics"]]
    second = [t["id"] for t in client.get(f"{SPACES}/{space_id}").json()["topics"]]

    assert first == second
    # And it was written back, not just made consistent in memory.
    assert stored_space(space_id)["topics"][0]["id"] == first[0]


def test_the_list_endpoint_still_withholds_topics(client):
    make_space(client)
    (summary,) = client.get(SPACES).json()
    assert summary["topic_count"] == len(LESSON["topics"])
    assert "topics" not in summary
