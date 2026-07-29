"""What Dock does with each answer YouTube's Data API can give.

The search call itself is stubbed everywhere else in the suite; this is the one
place the response handling is exercised directly, because "quota spent" and
"key rejected" arrive as the same 403 and are told apart only here.
"""

import httpx
import pytest

from app.core.exceptions import YoutubeRateLimited, YoutubeUnavailable
from app.core.youtube import (
    _parse,
    _raise_for_status,
    extract_video_id,
    require_youtube,
    watch_url,
)


def error_response(status: int, reason: str) -> httpx.Response:
    return httpx.Response(
        status,
        json={"error": {"code": status, "errors": [{"reason": reason}]}},
        request=httpx.Request("GET", "https://example.test"),
    )


def test_no_key_configured_is_unavailable(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "youtube_api_key", None)
    with pytest.raises(YoutubeUnavailable):
        require_youtube()


@pytest.mark.parametrize(
    "reason",
    [
        "quotaExceeded",
        "dailyLimitExceeded",
        "rateLimitExceeded",
        "userRateLimitExceeded",
    ],
)
def test_a_403_about_quota_is_a_rate_limit(reason):
    """YouTube spends a 403 on quota exhaustion where a 429 would be plainer."""
    with pytest.raises(YoutubeRateLimited):
        _raise_for_status(error_response(403, reason))


def test_a_plain_429_is_a_rate_limit():
    with pytest.raises(YoutubeRateLimited):
        _raise_for_status(error_response(429, "rateLimitExceeded"))


def test_a_403_about_the_key_is_unavailable():
    """Nothing the student can do about it, so it reads as "not right now"."""
    with pytest.raises(YoutubeUnavailable):
        _raise_for_status(error_response(403, "keyInvalid"))


def test_a_server_error_is_unavailable():
    with pytest.raises(YoutubeUnavailable):
        _raise_for_status(error_response(500, "backendError"))


def test_a_200_passes():
    _raise_for_status(httpx.Response(200, json={"items": []}))


def test_titles_are_unescaped():
    """Snippets arrive HTML-escaped; the panel renders the title as text."""
    results = _parse(
        {
            "items": [
                {
                    "id": {"videoId": "abcdefghijk"},
                    "snippet": {
                        "title": "Newton&#39;s laws &amp; friction",
                        "channelTitle": "Physics Wallah",
                    },
                }
            ]
        }
    )
    assert results[0].title == "Newton's laws & friction"
    assert results[0].to_link().url == watch_url("abcdefghijk")


def test_channel_results_are_skipped():
    """`type=video` is asked for, but a payload without a videoId is not a video."""
    items = [{"id": {"channelId": "x"}, "snippet": {"title": "A channel"}}]
    assert _parse({"items": items}) == []


@pytest.mark.parametrize(
    "value,expected",
    [
        ("dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("not a video", None),
        ("", None),
    ],
)
def test_ids_are_pulled_out_of_whatever_shape_they_arrive_in(value, expected):
    assert extract_video_id(value) == expected
