"""The video shelf: five a call, twenty in all, every one a real search hit."""

import json

import pytest
from bson import ObjectId

from app.core.config import settings
from app.core.exceptions import YoutubeRateLimited, YoutubeUnavailable
from app.core.youtube import VideoResult
from app.models.space import MAX_YOUTUBE_LINKS, YOUTUBE_LINKS_PER_REQUEST
from app.services import video_service
from tests.helpers import (
    FakeProvider,
    clear_provider,
    make_space,
    stored_space,
    topic_ids,
    use_provider,
)


def video_id(audience: str, n: int) -> str:
    """An id shaped like YouTube's: exactly 11 URL-safe characters."""
    return f"{audience[:2]}{n:09d}"


def picks(*ids: str) -> str:
    """A model reply in the JSON shape the prompt asks for."""
    return json.dumps(list(ids))


@pytest.fixture(autouse=True)
def _no_provider_leaks():
    yield
    clear_provider()


@pytest.fixture(autouse=True)
def youtube_configured(monkeypatch):
    """A key is set, so `require_youtube` lets the route through.

    Autouse because "YouTube is available" is the normal state; the tests that
    care about its absence unset it themselves.
    """
    monkeypatch.setattr(settings, "youtube_api_key", "test-key")


@pytest.fixture
def searching(monkeypatch):
    """Stand in for YouTube search, so the suite never leaves the machine.

    The stub answers by audience: a search tagged 'india' returns the Indian
    catalogue, 'global' the international one. That is the whole point of the
    two searches, so a fake that ignored the distinction would test nothing.
    """

    def install(india: int = 10, worldwide: int = 10, fail: Exception | None = None):
        catalogue = {
            "india": [
                VideoResult(video_id("india", n), f"IN video {n}", "Physics Wallah")
                for n in range(india)
            ],
            "global": [
                VideoResult(video_id("global", n), f"EN video {n}", "Khan Academy")
                for n in range(worldwide)
            ],
        }
        calls: list[tuple[str, str | None]] = []

        async def _search(query, *, limit, region_code=None, relevance_language=None):
            calls.append((query, region_code))
            if fail is not None:
                raise fail
            audience = "india" if region_code == "IN" else "global"
            return catalogue[audience][:limit]

        monkeypatch.setattr(video_service, "search_videos", _search)
        return calls

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


def test_a_first_generate_returns_five_links(client, searching):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching()
    use_provider(FakeProvider([picks()]))  # the model picked nothing

    response = client.post(endpoint(space_id, topic_id))
    assert response.status_code == 201

    body = response.json()
    # Five even though the model named none: the searches found them, and the
    # shelf is filled from what the searches found.
    assert len(body["added"]) == YOUTUBE_LINKS_PER_REQUEST
    assert len(body["links"]) == YOUTUBE_LINKS_PER_REQUEST
    assert body["limit_reached"] is False
    assert body["remaining"] == MAX_YOUTUBE_LINKS - YOUTUBE_LINKS_PER_REQUEST


def test_a_shelf_mixes_indian_and_international_videos(client, searching):
    """The reason two searches are run at all."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching()
    use_provider(FakeProvider([picks()]))

    body = client.post(endpoint(space_id, topic_id)).json()
    titles = [link["title"] for link in body["added"]]
    assert sum(title.startswith("IN") for title in titles) == 3
    assert sum(title.startswith("EN") for title in titles) == 2


def test_a_lopsided_model_reply_is_still_balanced(client, searching):
    """Five Indian picks do not make an all-Indian shelf."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching()
    use_provider(FakeProvider([picks(*(video_id("india", n) for n in range(5)))]))

    body = client.post(endpoint(space_id, topic_id)).json()
    titles = [link["title"] for link in body["added"]]
    assert sum(title.startswith("EN") for title in titles) == 2


def test_the_model_ranking_is_kept_within_an_audience(client, searching):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching()
    # Its third choice from each catalogue, ahead of everything else.
    use_provider(FakeProvider([picks(video_id("india", 3), video_id("global", 7))]))

    body = client.post(endpoint(space_id, topic_id)).json()
    ids = [link["video_id"] for link in body["added"]]
    assert ids[0] == video_id("india", 3)
    assert ids[1] == video_id("global", 7)


def test_ids_the_model_invented_are_ignored(client, searching):
    """A pick is a selector into the search results, never a link on its own."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching()
    use_provider(FakeProvider([picks("dQw4w9WgXcQ", video_id("india", 2))]))

    body = client.post(endpoint(space_id, topic_id)).json()
    ids = [link["video_id"] for link in body["added"]]
    assert "dQw4w9WgXcQ" not in ids
    assert ids[0] == video_id("india", 2)


def test_the_stored_title_is_youtubes(client, searching):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching()
    use_provider(FakeProvider(["Here you go! I found some great ones."]))

    body = client.post(endpoint(space_id, topic_id)).json()
    assert all(
        link["title"].startswith(("IN video", "EN video")) for link in body["added"]
    )


def test_a_model_that_never_searches_still_fills_the_shelf(client, searching):
    """The fallback: Dock runs the two obvious searches itself."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    calls = searching()
    use_provider(FakeProvider(["I would recommend looking on YouTube."], searches=[]))

    body = client.post(endpoint(space_id, topic_id)).json()
    assert len(body["added"]) == YOUTUBE_LINKS_PER_REQUEST
    # One search per audience, run by the service rather than the model.
    assert [region for _, region in calls] == ["IN", "US"]
    assert all("Light reactions" in query for query, _ in calls)


def test_searching_finding_nothing_is_not_an_error(client, searching):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching(india=0, worldwide=0)
    use_provider(FakeProvider([picks()]))

    response = client.post(endpoint(space_id, topic_id))
    assert response.status_code == 201
    assert response.json()["added"] == []
    assert response.json()["links"] == []


def test_youtube_being_unconfigured_is_a_503(client, searching, monkeypatch):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    monkeypatch.setattr(settings, "youtube_api_key", None)
    searching()
    provider = use_provider(FakeProvider([picks()]))

    response = client.post(endpoint(space_id, topic_id))
    assert response.status_code == 503
    assert response.json()["code"] == "youtube_unavailable"
    assert "not available" in response.json()["detail"]
    # Refused before the model was called, not after paying for it.
    assert provider.prompts == []


def test_youtube_rate_limiting_reaches_the_client_as_429(client, searching):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching(fail=YoutubeRateLimited())
    use_provider(FakeProvider([picks()]))

    response = client.post(endpoint(space_id, topic_id))
    assert response.status_code == 429
    assert response.json()["code"] == "youtube_rate_limited"


def test_youtube_failing_mid_search_is_a_503(client, searching):
    """A tool failure ends the request rather than letting the model improvise."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching(fail=YoutubeUnavailable())
    use_provider(FakeProvider([picks()]))

    response = client.post(endpoint(space_id, topic_id))
    assert response.status_code == 503
    assert response.json()["code"] == "youtube_unavailable"
    assert stored_space(space_id)["topics"][0]["youtube_links"] == []


def test_a_second_generate_appends_without_duplicating(client, searching):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching()
    use_provider(FakeProvider([picks(), picks()]))

    client.post(endpoint(space_id, topic_id))
    body = client.post(endpoint(space_id, topic_id)).json()

    ids = [link["video_id"] for link in body["links"]]
    assert len(ids) == 10
    assert len(set(ids)) == 10  # the second search's overlap was excluded


def test_the_shelf_stops_at_the_maximum(client, searching):
    """The last call is trimmed to the remaining slots, not rounded up to five."""
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching(india=20, worldwide=20)
    use_provider(FakeProvider([picks() for _ in range(6)]))

    for _ in range(4):  # 4 × 5 = 20
        client.post(endpoint(space_id, topic_id))

    response = client.post(endpoint(space_id, topic_id))
    # The shelf is full, so the fifth call is refused outright.
    assert response.status_code == 409
    assert response.json()["code"] == "youtube_limit_reached"

    document = stored_space(space_id)
    assert len(document["topics"][0]["youtube_links"]) == MAX_YOUTUBE_LINKS


def test_a_partly_full_shelf_only_takes_what_fits(client, searching):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching(india=20, worldwide=20)
    use_provider(FakeProvider([picks() for _ in range(5)]))

    for _ in range(4):
        client.post(endpoint(space_id, topic_id))

    body = client.get(f"/api/v1/spaces/{space_id}").json()
    topic = body["topics"][0]
    assert len(topic["youtube_links"]) == MAX_YOUTUBE_LINKS
    assert topic["video_limit_reached"] is True


def test_videos_for_a_missing_topic_are_404(client, searching):
    space_id = make_space(client)
    searching()
    use_provider(FakeProvider([picks()]))

    assert client.post(endpoint(space_id, str(ObjectId()))).status_code == 404


def test_the_prompt_names_the_lesson_the_topic_and_both_audiences(client, searching):
    space_id = make_space(client)
    topic_id = topic_ids(client, space_id)[0]

    searching()
    provider = use_provider(FakeProvider([picks()]))

    client.post(endpoint(space_id, topic_id))
    prompt = provider.prompts[0]
    assert "Photosynthesis" in prompt
    assert "Light reactions" in prompt
    assert "'india'" in prompt and "'global'" in prompt
