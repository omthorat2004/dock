"""A topic's video shelf: the model searches YouTube, it does not recall it.

The shelf fills `YOUTUBE_LINKS_PER_REQUEST` at a time and stops for good at
`MAX_YOUTUBE_LINKS`. Every video on it came back from a real YouTube search —
the model's only job is deciding *what to search for* and which of the hits are
worth a revising student's time. It never supplies an id, so a shelf can no
longer come back half empty because the ids it invented did not exist.

Two searches, two audiences: one aimed at Indian teaching channels and one at
international English ones, and the shelf is built by alternating between them
so a student always gets both.
"""

import json
import logging
import re
from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from app.ai.base import AIProvider, ToolSpec
from app.core.exceptions import VideoLimitReached
from app.core.youtube import (
    VideoResult,
    extract_video_id,
    require_youtube,
    search_videos,
)
from app.models.space import (
    MAX_YOUTUBE_LINKS,
    YOUTUBE_LINKS_PER_REQUEST,
    Topic,
    YoutubeLink,
)
from app.services.space_service import SpaceService

logger = logging.getLogger("app.videos")

#: How the two audiences are asked for. Neither filters — `region_code` and
#: `relevance_language` rank the same catalogue the way YouTube would for a
#: viewer in that market, which is how "Indian" and "global" stop being a guess
#: about channel names and become a property of the search itself.
_AUDIENCES: dict[str, dict[str, str]] = {
    "india": {"region_code": "IN", "relevance_language": "hi"},
    "global": {"region_code": "US", "relevance_language": "en"},
}
_OTHER = {"india": "global", "global": "india"}

#: Hits per search. Wider than the shelf takes, so the model has something to
#: choose between and the fallback has depth to draw on.
_SEARCH_LIMIT = 10

#: Models wrap JSON in ```json fences more often than not.
_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$")

#: A YouTube id, for the scan that runs when the reply is not JSON.
_ID_SHAPED = re.compile(r"[A-Za-z0-9_-]{11}")

SEARCH_TOOL = ToolSpec(
    name="search_youtube",
    description=(
        "Search YouTube and get back videos that really exist, with their id, "
        "title and channel. This is the only way to reach YouTube — you cannot "
        "know a video id without it. Call it several times, with different "
        "wording and both audiences."
    ),
    parameters={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": (
                    "What to search for, phrased as a student would — "
                    "'calvin cycle explained class 11', not 'best videos'."
                ),
            },
            "audience": {
                "type": "string",
                "enum": ["india", "global"],
                "description": (
                    "'india' ranks results as YouTube would for a viewer in "
                    "India, surfacing Hindi and Indian-English teaching "
                    "channels. 'global' ranks them for an international "
                    "English-speaking viewer."
                ),
            },
        },
        "required": ["query", "audience"],
    },
)

_VIDEO_FRAME = (
    "You are finding YouTube explainers for a student revising one topic.\n"
    "Use the search_youtube tool. Never write a video id yourself — the only "
    "ids that exist are the ones a search returned.\n"
    "Run at least two searches: one with audience 'india' and one with "
    "audience 'global', so the student gets both Indian teachers (channels "
    "like Physics Wallah, Vedantu, Khan Academy India, Unacademy, "
    "CodeWithHarry, Apna College, Gate Smashers, NPTEL — whichever suit the "
    "subject) and established international English ones (Khan Academy, "
    "CrashCourse, 3Blue1Brown, Veritasium and the like). Search again with "
    "different wording if the hits look thin or off-topic.\n"
    "Prefer a clear full explanation of this topic over a playlist, a shorts "
    "clip or a whole-course video.\n"
    "Then answer with JSON only — an array of the video ids you chose, best "
    "first, taken only from the search results, about half from each "
    "audience. No prose, no code fence."
)


def _build_prompt(lesson_name: str, topic: Topic, wanted: int) -> str:
    parts = [
        _VIDEO_FRAME,
        f"Lesson: {lesson_name}\nTopic: {topic.topic_name}",
        f"Choose {wanted} videos.",
    ]
    if topic.youtube_links:
        already = "\n".join(f"- {link.title}" for link in topic.youtube_links)
        # Already-shelved videos are filtered out of the search results anyway;
        # this is so the model spends the request on new ground rather than
        # re-picking what the student has.
        parts.append(f"The student already has these, so find others:\n{already}")
    return "\n\n".join(parts)


def _picked_ids(reply: str) -> list[str]:
    """The ids the model chose, in its order.

    The prompt asks for a JSON array and that is the path taken when the reply
    parses. It often does not — a stray sentence before the array is enough —
    so the fallback scans the raw text. Either way an id is only ever a
    *selector* into what a search returned, so an invented one selects nothing
    and disappears.
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
                raw = entry.get("id") or entry.get("url")
            else:
                raw = entry
            video_id = extract_video_id(raw) if isinstance(raw, str) else None
            if video_id:
                ids.append(video_id)

    if not ids:
        ids = _ID_SHAPED.findall(reply or "")

    seen: set[str] = set()
    return [i for i in ids if not (i in seen or seen.add(i))]


def _alternating(
    order: list[str], pool: dict[str, tuple[str, VideoResult]], wanted: int
) -> list[VideoResult]:
    """Take `wanted` videos, alternating Indian and global.

    The model's ranking is respected *within* each audience but not across
    them: left alone a model will happily return five videos from whichever
    search read better, and the point of running two was to get both. Starting
    on 'india' is deliberate — it is the half a plain YouTube search is least
    likely to have surfaced on its own.

    Ids the model did not pick queue up behind the ones it did, so a reply that
    named only two videos still fills a shelf of five.
    """
    queues: dict[str, list[VideoResult]] = {"india": [], "global": []}
    seen: set[str] = set()
    for video_id in [*order, *pool]:
        if video_id in seen or video_id not in pool:
            continue
        seen.add(video_id)
        audience, result = pool[video_id]
        queues[audience].append(result)

    chosen: list[VideoResult] = []
    turn = "india"
    while len(chosen) < wanted and (queues["india"] or queues["global"]):
        queue = queues[turn] or queues[_OTHER[turn]]
        chosen.append(queue.pop(0))
        turn = _OTHER[turn]
    return chosen


class VideoService:
    """Generating the next few videos for one topic."""

    def __init__(self, db: AsyncDatabase) -> None:
        self.spaces = SpaceService(db)

    async def generate_links(
        self, user_id: str, space_id: str, topic_id: str, provider: AIProvider
    ) -> tuple[Topic, list[YoutubeLink]]:
        """Add up to `YOUTUBE_LINKS_PER_REQUEST` videos to a topic.

        Returns the topic as it now stands together with just the links this
        call added, so the client can both render the whole shelf and say how
        many are new.

        Raises `YoutubeUnavailable` or `YoutubeRateLimited` when the search
        itself cannot run: the student is told to come back later rather than
        handed whatever the model could recall unaided.
        """
        space, topic = await self.spaces.get_topic(user_id, space_id, topic_id)

        if topic.video_limit_reached:
            raise VideoLimitReached(
                f"This topic already holds all {MAX_YOUTUBE_LINKS} of its videos."
            )

        # Checked before the model is called, not after: without the tool it
        # cannot do this job, so calling it would only buy a slower 503.
        require_youtube()

        wanted = min(YOUTUBE_LINKS_PER_REQUEST, topic.remaining_video_slots)
        known = {link.video_id for link in topic.youtube_links}

        # Every hit the model's searches turned up, by id, tagged with the
        # audience that found it. This — not the model's reply — is the set a
        # shelf can be built from.
        pool: dict[str, tuple[str, VideoResult]] = {}

        async def run_tool(name: str, arguments: dict[str, Any]) -> Any:
            if name != SEARCH_TOOL.name:
                return {"error": f"There is no tool called {name}."}

            query = str(arguments.get("query") or "").strip()
            if not query:
                return {"error": "query is required."}
            audience = (
                "india" if str(arguments.get("audience")) == "india" else "global"
            )

            # A failed search raises straight out of the tool loop by design:
            # the request ends as 503 or 429 rather than letting the model carry
            # on without the one thing it needed.
            results = await search_videos(
                query, limit=_SEARCH_LIMIT, **_AUDIENCES[audience]
            )
            fresh = [result for result in results if result.video_id not in known]
            for result in fresh:
                pool.setdefault(result.video_id, (audience, result))

            return {
                "videos": [
                    {
                        "id": result.video_id,
                        "title": result.title,
                        "channel": result.channel,
                    }
                    for result in fresh
                ]
            }

        reply = await provider.chat_with_tools(
            _build_prompt(space.lesson_name, topic, wanted),
            [SEARCH_TOOL],
            run_tool,
        )

        if not pool:
            # The model answered without searching, or searched only for videos
            # the student already has. Running the obvious two searches here is
            # what keeps that from costing the student their whole request.
            logger.info(
                "Model ran no usable search for topic %s; searching directly.",
                topic_id,
            )
            await self._search_directly(space.lesson_name, topic, known, pool)

        added = [
            result.to_link()
            for result in _alternating(_picked_ids(reply), pool, wanted)
        ]
        if not added:
            logger.info("No videos found for topic %s", topic_id)
            return topic, []

        topic.youtube_links.extend(added)
        await self.spaces.save_topics(space)
        return topic, added

    @staticmethod
    async def _search_directly(
        lesson_name: str,
        topic: Topic,
        known: set[str],
        pool: dict[str, tuple[str, VideoResult]],
    ) -> None:
        """The searches the model should have run, run without it.

        Deliberately plain: topic first, lesson as context, one search per
        audience. It exists so an unhelpful model reply degrades to a decent
        shelf instead of an empty one.
        """
        query = f"{topic.topic_name} {lesson_name} explained"
        for audience, options in _AUDIENCES.items():
            for result in await search_videos(query, limit=_SEARCH_LIMIT, **options):
                if result.video_id not in known:
                    pool.setdefault(result.video_id, (audience, result))
