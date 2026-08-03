"""Searching YouTube for videos that actually exist.

A language model asked for "the five best explainers" answers with confident,
well-formed YouTube URLs whose ids frequently belong to no video at all, which
is why this module used to guess-then-verify, and why a shelf so often came
back with one or two links instead of five.

So the model no longer supplies ids. It supplies *searches*, through the
`search_youtube` tool, and every video on a shelf comes from YouTube's own Data
API: real id, real title, real channel. Nothing needs verifying afterwards
because nothing was invented.

The key is Dock's, not the student's, so its two failure modes are ours to
report plainly: `YoutubeUnavailable` when there is no key or the API cannot be
reached, and `YoutubeRateLimited` when the quota is spent.
"""

import html
import logging
import re
from dataclasses import dataclass

import httpx

from app.core.config import settings
from app.core.exceptions import YoutubeRateLimited, YoutubeUnavailable
from app.models.space import YoutubeLink

logger = logging.getLogger("app.youtube")

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

#: One search should not hang the whole generate call. The model may run
#: several, and it is better to lose one than to make the student wait.
_SEARCH_TIMEOUT = 8.0

#: YouTube's own cap on `maxResults`.
_MAX_RESULTS = 50

# The 403 reasons that mean "come back later" rather than "this is broken".
# YouTube spends a 403 on quota exhaustion, where a 429 would be plainer.
_RATE_LIMIT_REASONS = {
    "quotaExceeded",
    "dailyLimitExceeded",
    "rateLimitExceeded",
    "userRateLimitExceeded",
}

# A YouTube video id is exactly 11 characters of URL-safe base64. Matching the
# id rather than the whole URL means every form the model might echo back
# (watch, youtu.be, /shorts, /embed, with or without query junk) collapses to
# one key.
_VIDEO_ID = re.compile(r"(?:youtu\.be/|v=|/shorts/|/embed/|/live/)([A-Za-z0-9_-]{11})")
_BARE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


@dataclass(frozen=True)
class VideoResult:
    """One search hit, as YouTube describes it.

    Carries the channel as well as the title because the model picks with it:
    "which of these is a teaching channel" is not answerable from a title alone,
    even though only the title is ever stored.
    """

    video_id: str
    title: str
    channel: str

    def to_link(self) -> YoutubeLink:
        return YoutubeLink(
            video_id=self.video_id, title=self.title, url=watch_url(self.video_id)
        )


def watch_url(video_id: str) -> str:
    """The one canonical form a stored link takes."""
    return f"https://www.youtube.com/watch?v={video_id}"


def extract_video_id(value: str) -> str | None:
    """The video id inside a URL, or the id itself if that is what was given."""
    if not value:
        return None
    candidate = value.strip()
    if _BARE_ID.match(candidate):
        return candidate
    match = _VIDEO_ID.search(candidate)
    return match.group(1) if match else None


def require_youtube() -> None:
    """Refuse early when YouTube search is not configured.

    Called before the model is, so a deployment without a key costs one 503
    instead of a full model call whose only possible outcome is the same 503.
    """
    if not settings.youtube_api_key:
        logger.warning("YOUTUBE_API_KEY is not set; video search is disabled.")
        raise YoutubeUnavailable


def _error_reason(response: httpx.Response) -> str:
    """The machine-readable reason YouTube gave, for logs and rate-limit checks."""
    try:
        errors = response.json().get("error", {}).get("errors") or []
    except ValueError:
        return ""
    return errors[0].get("reason", "") if errors else ""


def _raise_for_status(response: httpx.Response) -> None:
    """Turn a failed search into whichever of the two errors fits it."""
    if response.status_code == httpx.codes.OK:
        return

    reason = _error_reason(response)

    if response.status_code == httpx.codes.TOO_MANY_REQUESTS or (
        response.status_code == httpx.codes.FORBIDDEN and reason in _RATE_LIMIT_REASONS
    ):
        logger.warning("YouTube search rate limited (%s)", reason or "no reason given")
        raise YoutubeRateLimited

    # Everything else (a rejected key, a disabled API, an outage) is the same
    # story to the student: not right now. The reason is logged for whoever
    # holds the key, since only they can act on it.
    logger.error(
        "YouTube search failed: %s %s",
        response.status_code,
        reason or response.text[:200],
    )
    raise YoutubeUnavailable


def _parse(payload: dict) -> list[VideoResult]:
    results: list[VideoResult] = []
    for item in payload.get("items") or []:
        video_id = (item.get("id") or {}).get("videoId")
        snippet = item.get("snippet") or {}
        title = snippet.get("title") or ""
        if not video_id or not title:
            continue
        results.append(
            VideoResult(
                video_id=video_id,
                # Snippets arrive HTML-escaped ("Newton&#39;s laws") and the
                # title is rendered as text, so it is unescaped once, here.
                title=html.unescape(title).strip(),
                channel=html.unescape(snippet.get("channelTitle") or "").strip(),
            )
        )
    return results


async def search_videos(
    query: str,
    *,
    limit: int,
    region_code: str | None = None,
    relevance_language: str | None = None,
) -> list[VideoResult]:
    """Run one YouTube search and return what it found.

    `region_code` and `relevance_language` are what make an "Indian" search
    different from a global one: the same query, answered the way YouTube would
    answer it in that market. They shape the ranking rather than filtering: a
    Hindi-market search still surfaces English videos, which is exactly the mix
    a shelf wants.

    Only embeddable, syndicated videos are asked for, because the panel plays
    them inline: a video that cannot be embedded is a dead tile.
    """
    require_youtube()

    params: dict[str, str | int] = {
        "key": settings.youtube_api_key or "",
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max(1, min(limit, _MAX_RESULTS)),
        "videoEmbeddable": "true",
        "videoSyndicated": "true",
        "safeSearch": "moderate",
        "order": "relevance",
    }
    if region_code:
        params["regionCode"] = region_code
    if relevance_language:
        params["relevanceLanguage"] = relevance_language

    try:
        async with httpx.AsyncClient(timeout=_SEARCH_TIMEOUT) as client:
            response = await client.get(SEARCH_URL, params=params)
    except httpx.HTTPError as exc:
        logger.warning("Could not reach YouTube search: %s", exc)
        raise YoutubeUnavailable from exc

    _raise_for_status(response)

    try:
        payload = response.json()
    except ValueError as exc:
        logger.error("YouTube search returned a body that is not JSON.")
        raise YoutubeUnavailable from exc

    return _parse(payload)
