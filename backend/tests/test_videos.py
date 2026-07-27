"""The video shelf: five a call, twenty in all, and nothing unverified."""

import json

import pytest
from bson import ObjectId

from app.models.space import (
    MAX_YOUTUBE_LINKS,
    YOUTUBE_LINKS_PER_REQUEST,
    YoutubeLink,
)
from app.services import video_service
from tests.helpers import (
    FakeProvider,
    clear_provider,
    make_space,
    stored_space,
    topic_ids,
    use_provider,
)


def video_id(n: int) -> str:
    """An id shaped like YouTube's: exactly 11 URL-safe characters."""
    return f"vid{n:08d}"


def suggests(*ids: str) -> str:
    """A model reply in the JSON shape the prompt asks for."""
    return json.dumps(
        [
            {"title": f"Guessed title {i}", "url": f"https://youtu.be/{i}"}
            for i in ids
        ]
    )


@pytest.fixture(autouse=True)
def _no_provider_leaks():
    yield
    clear_provider()


@pytest.fixture
def resolving(monkeypatch):
    """Pretend a given set of video ids exists on YouTube, and no others.

    Stands in for `core.youtube.verify_links` so the suite never makes a real
    network call — the point under test is that unverified candidates are
    dropped, not how the lookup is performed.
    """

    def install(available: set[str]):
        async def _verify(video_ids: list[str], limit: int) -> list[YoutubeLink]:
            return [
                YoutubeLink(
                    video_id=v,
                    title=f"Real title {v}",
                    url=f"https://www.youtube.com/watch?v={v}",
                )
                for v in video_ids
                if v in available
            ][:limit]

        monkeypatch.setattr(video_service, "verify_links", _verify)

    return install


def endpoint(space_id: str, topic_id: str) -> str:
    return f"/api/v1/spaces/{space_id}/topics/{topic_id}/videos"


def test_generating_videos_requires_a_configured_api_key(client):
    """No override installed, so the real api-key gate runs."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    response = client.post(endpoint(space_id, topic_id))
    assert response.status_code == 401
    # Its own code, so the client sends the student to /api-key rather than
    # treating this as an expired session.
    assert response.json()["code"] == "api_key_not_configured"


def test_a_first_generate_returns_five_links(client, resolving):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    ids = [video_id(n) for n in range(8)]
    resolving(set(ids))
    use_provider(FakeProvider([suggests(*ids)]))

    response = client.post(endpoint(space_id, topic_id))
    assert response.status_code == 201

    body = response.json()
    assert len(body["added"]) == YOUTUBE_LINKS_PER_REQUEST
    assert len(body["links"]) == YOUTUBE_LINKS_PER_REQUEST
    assert body["limit_reached"] is False
    assert body["remaining"] == MAX_YOUTUBE_LINKS - YOUTUBE_LINKS_PER_REQUEST


def test_the_stored_title_is_youtubes_not_the_models(client, resolving):
    """A verified link keeps the real title, never the one the model guessed."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    ids = [video_id(n) for n in range(5)]
    resolving(set(ids))
    use_provider(FakeProvider([suggests(*ids)]))

    body = client.post(endpoint(space_id, topic_id)).json()
    assert all(link["title"].startswith("Real title") for link in body["added"])
    assert not any("Guessed" in link["title"] for link in body["added"])


def test_candidates_that_do_not_resolve_are_dropped(client, resolving):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    ids = [video_id(n) for n in range(8)]
    # Only two of the eight the model offered actually exist.
    resolving({ids[0], ids[3]})
    use_provider(FakeProvider([suggests(*ids)]))

    body = client.post(endpoint(space_id, topic_id)).json()
    assert len(body["added"]) == 2
    assert [link["video_id"] for link in body["added"]] == [ids[0], ids[3]]


def test_generating_nothing_is_not_an_error(client, resolving):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    resolving(set())
    use_provider(FakeProvider([suggests(video_id(1), video_id(2))]))

    response = client.post(endpoint(space_id, topic_id))
    assert response.status_code == 201
    assert response.json()["added"] == []
    assert response.json()["links"] == []


def test_a_second_generate_appends_without_duplicating(client, resolving):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    first = [video_id(n) for n in range(5)]
    second = [video_id(n) for n in range(3, 11)]  # overlaps the first batch
    resolving(set(first) | set(second))
    use_provider(FakeProvider([suggests(*first), suggests(*second)]))

    client.post(endpoint(space_id, topic_id))
    body = client.post(endpoint(space_id, topic_id)).json()

    ids = [link["video_id"] for link in body["links"]]
    assert len(ids) == 10
    assert len(set(ids)) == 10  # the overlap was excluded, not stored twice


def test_the_shelf_stops_at_the_maximum(client, resolving):
    """The last call is trimmed to the remaining slots, not rounded up to five."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    everything = [video_id(n) for n in range(40)]
    resolving(set(everything))
    use_provider(FakeProvider([suggests(*everything) for _ in range(6)]))

    for _ in range(4):  # 4 × 5 = 20
        client.post(endpoint(space_id, topic_id))

    body = client.post(endpoint(space_id, topic_id))
    # The shelf is full, so the fifth call is refused outright.
    assert body.status_code == 409
    assert body.json()["code"] == "youtube_limit_reached"

    document = stored_space(space_id)
    assert len(document["topics"][0]["youtube_links"]) == MAX_YOUTUBE_LINKS


def test_a_partly_full_shelf_only_takes_what_fits(client, resolving):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    everything = [video_id(n) for n in range(40)]
    resolving(set(everything))
    use_provider(FakeProvider([suggests(*everything) for _ in range(5)]))

    for _ in range(3):  # 15 stored, 5 slots left after the next call
        client.post(endpoint(space_id, topic_id))
    client.post(endpoint(space_id, topic_id))  # 20

    body = client.get(f"/api/v1/spaces/{space_id}").json()
    topic = body["topics"][0]
    assert len(topic["youtube_links"]) == MAX_YOUTUBE_LINKS
    assert topic["video_limit_reached"] is True


def test_videos_for_a_missing_topic_are_404(client, resolving):
    space_id = make_space(client)
    resolving(set())
    use_provider(FakeProvider([suggests()]))

    assert client.post(endpoint(space_id, str(ObjectId()))).status_code == 404


def test_a_reply_that_is_not_json_still_yields_links(client, resolving):
    """Models wrap or narrate their JSON; the ids are pulled out regardless."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    ids = [video_id(n) for n in range(3)]
    resolving(set(ids))
    prose = "Here are some good ones!\n" + "\n".join(
        f"- https://www.youtube.com/watch?v={i}&t=30s" for i in ids
    )
    use_provider(FakeProvider([prose]))

    body = client.post(endpoint(space_id, topic_id)).json()
    assert [link["video_id"] for link in body["added"]] == ids
