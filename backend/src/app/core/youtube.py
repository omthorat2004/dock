"""Turning a model's video suggestions into links that actually resolve.

A language model asked for "the five best explainers" answers with confident,
well-formed YouTube URLs whose ids frequently belong to no video at all. Storing
those unchecked would fill a topic's shelf with dead links, and the student only
finds out by clicking.

So every candidate is verified against YouTube's public oEmbed endpoint before
it is saved. That endpoint needs no API key and no quota: it answers 200 with
the video's real title, or 404 if there is nothing there. The title it returns
is the one that gets stored, so a shelf can never show a title the model
invented for a video that exists but is about something else.
"""

import asyncio
import json
import logging
import re

import httpx

from app.models.space import YoutubeLink

logger = logging.getLogger("app.youtube")

OEMBED_URL = "https://www.youtube.com/oembed"

#: One request should not hang the whole generate call; a candidate that is slow
#: to verify is treated the same as one that does not exist.
_VERIFY_TIMEOUT = 5.0

# A YouTube video id is exactly 11 characters of URL-safe base64. Matching the
# id rather than the whole URL means every form the model might emit — watch,
# youtu.be, /shorts, /embed, with or without query junk — collapses to one key.
_VIDEO_ID = re.compile(
    r"(?:youtu\.be/|v=|/shorts/|/embed/|/live/)([A-Za-z0-9_-]{11})"
)
_BARE_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")

# Models wrap JSON in ```json fences more often than not.
_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$")


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


def parse_candidate_ids(reply: str) -> list[str]:
    """Pull video ids out of a model reply, in the order it gave them.

    The prompt asks for a JSON array, and that is the path taken when the reply
    parses. It often does not — a stray sentence before the array is enough —
    so the fallback simply scans the raw text for anything shaped like a
    YouTube link. Both paths end at the same place: a deduped list of ids.
    """
    ids: list[str] = []

    stripped = _FENCE.sub("", reply or "").strip()
    try:
        parsed = json.loads(stripped)
    except (json.JSONDecodeError, TypeError):
        parsed = None

    if isinstance(parsed, list):
        for entry in parsed:
            if isinstance(entry, dict):
                raw = entry.get("url") or entry.get("id")
            else:
                raw = entry
            video_id = extract_video_id(raw) if isinstance(raw, str) else None
            if video_id:
                ids.append(video_id)

    if not ids:
        ids = _VIDEO_ID.findall(reply or "")

    # Dedupe while keeping the model's ordering — it ranked them.
    seen: set[str] = set()
    return [i for i in ids if not (i in seen or seen.add(i))]


async def _verify_one(client: httpx.AsyncClient, video_id: str) -> YoutubeLink | None:
    """One oEmbed lookup. Anything other than a clean 200 drops the candidate."""
    try:
        response = await client.get(
            OEMBED_URL,
            params={"url": watch_url(video_id), "format": "json"},
        )
    except httpx.HTTPError:
        # Unreachable or timed out. Dropping it is the safe answer: a link we
        # could not confirm is exactly the link we set out not to store.
        logger.info("Could not verify YouTube video %s", video_id)
        return None

    if response.status_code != httpx.codes.OK:
        return None

    try:
        payload = response.json()
    except ValueError:
        return None

    title = (payload.get("title") or "").strip()
    if not title:
        return None

    return YoutubeLink(video_id=video_id, title=title, url=watch_url(video_id))


async def verify_links(video_ids: list[str], limit: int) -> list[YoutubeLink]:
    """Keep the candidates that resolve to a real video, up to `limit`.

    All lookups run concurrently — five sequential round trips would be the
    slowest part of generating a shelf. The model's ordering is preserved, so
    what it ranked first stays first among the survivors.

    Returning fewer than `limit` is a normal outcome, not an error: it means
    the model suggested videos that do not exist, which is the case this
    function exists to catch.
    """
    if not video_ids:
        return []

    async with httpx.AsyncClient(timeout=_VERIFY_TIMEOUT) as client:
        results = await asyncio.gather(
            *(_verify_one(client, video_id) for video_id in video_ids)
        )

    return [link for link in results if link is not None][:limit]
