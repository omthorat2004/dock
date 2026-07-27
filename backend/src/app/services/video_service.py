"""A topic's video shelf: asking the model for explainers, then checking them.

The shelf fills `YOUTUBE_LINKS_PER_REQUEST` at a time and stops for good at
`MAX_YOUTUBE_LINKS`. Nothing is stored on the model's word alone — see
`core.youtube` for why every candidate is resolved against YouTube first.
"""

import logging

from pymongo.asynchronous.database import AsyncDatabase

from app.ai.base import AIProvider
from app.core.exceptions import VideoLimitReached
from app.core.youtube import parse_candidate_ids, verify_links
from app.models.space import (
    MAX_YOUTUBE_LINKS,
    YOUTUBE_LINKS_PER_REQUEST,
    Topic,
    YoutubeLink,
)
from app.services.space_service import SpaceService

logger = logging.getLogger("app.videos")

#: Ask for more candidates than we intend to keep. Verification drops the ids
#: that resolve to nothing, and asking for exactly five reliably returns fewer
#: than five once the dead ones are removed.
_OVERASK = 3

_VIDEO_FRAME = (
    "You recommend YouTube explainers to a student revising one topic.\n"
    "Return only videos you are confident exist on YouTube today, from "
    "established educational channels. Prefer a clear full explanation of the "
    "topic over a playlist or a channel page.\n"
    'Answer with JSON only: a list of {"title": ..., "url": ...} objects, and '
    "nothing else — no prose, no code fence."
)


def _build_prompt(lesson_name: str, topic: Topic, wanted: int) -> str:
    parts = [
        _VIDEO_FRAME,
        f"Lesson: {lesson_name}\nTopic: {topic.topic_name}",
        f"Give {wanted} videos.",
    ]
    if topic.youtube_links:
        already = "\n".join(f"- {link.title}" for link in topic.youtube_links)
        # The shelf is deduped by id anyway; this is so the model spends the
        # request on new ground instead of re-suggesting what is already there.
        parts.append(f"The student already has these, so suggest others:\n{already}")
    return "\n\n".join(parts)


class VideoService:
    """Generating the next few videos for one topic."""

    def __init__(self, db: AsyncDatabase) -> None:
        self.spaces = SpaceService(db)

    async def generate_links(
        self, user_id: str, space_id: str, topic_id: str, provider: AIProvider
    ) -> tuple[Topic, list[YoutubeLink]]:
        """Add up to `YOUTUBE_LINKS_PER_REQUEST` verified links to a topic.

        Returns the topic as it now stands together with just the links this
        call added, so the client can both render the whole shelf and say how
        many are new.

        Adding *nothing* is a legitimate result: it means every candidate the
        model offered either failed verification or was already on the shelf.
        It is not an error, and it does not consume any of the topic's budget.
        """
        space, topic = await self.spaces.get_topic(user_id, space_id, topic_id)

        if topic.video_limit_reached:
            raise VideoLimitReached(
                f"This topic already holds all {MAX_YOUTUBE_LINKS} of its videos."
            )

        wanted = min(YOUTUBE_LINKS_PER_REQUEST, topic.remaining_video_slots)
        # Ask for the overask too: verification will drop some, and `wanted` is
        # what survives, not what was requested.
        reply = await provider.chat(
            _build_prompt(space.lesson_name, topic, wanted + _OVERASK)
        )

        known = {link.video_id for link in topic.youtube_links}
        candidates = [
            video_id
            for video_id in parse_candidate_ids(reply)
            if video_id not in known
        ][: wanted + _OVERASK]

        added = await verify_links(candidates, wanted)
        if not added:
            logger.info(
                "No verifiable videos for topic %s from %d candidate(s)",
                topic_id,
                len(candidates),
            )
            return topic, []

        topic.youtube_links.extend(added)
        await self.spaces.save_topics(space)
        return topic, added
