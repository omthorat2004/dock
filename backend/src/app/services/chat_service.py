"""Learn mode: one topic's conversation with the student's own model.

The shape of a prompt is fixed and deliberately small: a frame, the lesson and
topic it is scoped to, one rolling summary of everything older, and the last
`RECENT_MESSAGE_WINDOW` messages verbatim. A conversation can run all evening
without the prompt growing past that, which is the whole reason the summary
exists.
"""

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass

from fastapi import BackgroundTasks
from pymongo.asynchronous.database import AsyncDatabase

from app.ai.base import AIProvider
from app.core.exceptions import ContextLimitReached
from app.core.provider_errors import (
    TOKEN_LIMIT_CODE,
    classify_provider_error,
    is_token_limit_error,
)
from app.dao.chat_dao import ChatMessageDAO, ChatSummaryDAO
from app.models.chat import RECENT_MESSAGE_WINDOW, ChatMessage, ChatSummary
from app.models.space import Space, Topic, TopicSession
from app.models.user import utcnow
from app.services.space_service import SpaceService

logger = logging.getLogger("app.chat")

_TUTOR_FRAME = (
    "You are Dock, a revision tutor working with one student.\n"
    "You are scoped to a single topic of a single lesson. Stay inside that "
    "scope: if the student asks about something else, say so in a line and "
    "bring them back. Answer at the depth their syllabus asks for, not more.\n"
    "Be plain and concrete. Short paragraphs. No preamble and no flattery."
)

_LEVEL_GUIDANCE = {
    "beginner": (
        "Assume no background. Define the terms you use, work through the "
        "basics before anything clever, and check understanding as you go."
    ),
    "intermediate": (
        "Assume the basics are known. Skip the definitions, spend the time on "
        "how the pieces fit together and on where students usually slip."
    ),
    "advanced": (
        "Assume fluency. Go to the edge cases, the trade-offs and the harder "
        "questions they are likely to be asked, and do not re-teach the basics."
    ),
}

_SUMMARY_FRAME = (
    "Summarise this stretch of a tutoring conversation so it can stand in for "
    "the messages themselves later.\n"
    "Keep what the student asked about, what they clearly understood, what they "
    "got wrong or found hard, and anything they were told to revisit. Drop "
    "greetings and restatements. Write it as notes, third person, under 200 "
    "words."
)


def _render(messages: list[ChatMessage]) -> str:
    return "\n".join(f"{message.role}: {message.content}" for message in messages)


def _scope(space: Space, topic: Topic) -> str:
    lines = [f"Lesson: {space.lesson_name}", f"Topic: {topic.topic_name}"]
    if space.goal:
        lines.append(f"Revising for: {space.goal}")
    if space.level:
        lines.append(f"Student's level: {space.level}")
        lines.append(_LEVEL_GUIDANCE[space.level])
    return "\n".join(lines)


def _build_prompt(
    space: Space,
    topic: Topic,
    summary: ChatSummary | None,
    recent: list[ChatMessage],
    message: str,
) -> str:
    """Frame + scope + summary + recent window + the new message, in that order."""
    parts = [
        _TUTOR_FRAME,
        _scope(space, topic),
    ]
    if summary is not None:
        parts.append(f"Earlier in this conversation:\n{summary.content}")
    if recent:
        parts.append(f"Recent messages:\n{_render(recent)}")
    parts.append(f"user: {message}\nassistant:")
    return "\n\n".join(parts)


def _build_summary_prompt(
    previous: ChatSummary | None, pending: list[ChatMessage]
) -> str:
    parts = [_SUMMARY_FRAME]
    if previous is not None:
        parts.append(
            "Notes so far. Fold the new messages into these and return the "
            f"combined result:\n{previous.content}"
        )
    parts.append(f"New messages:\n{_render(pending)}")
    return "\n\n".join(parts)


@dataclass(frozen=True)
class PreparedTurn:
    """One turn resolved as far as it can be without calling the model.

    Every way a send can fail *before* the model is reached — the space is not
    yours, the topic is gone, the session is already closed — has happened by
    the time one of these exists. That is the whole point of it: a streaming
    response cannot report an error once it has started, because its status line
    left with the first byte, so a streamed turn is prepared in one await that
    is still allowed to raise, and only then handed to `stream_turn`.
    """

    space: Space
    topic: Topic
    session_id: str
    #: The summary as it stood when the prompt was built, which is the value
    #: `_roll_summary` must fold into, not whatever it reads back later.
    summary: ChatSummary | None
    message: str
    prompt: str


@dataclass(frozen=True)
class StreamToken:
    """A fragment of the reply, exactly as the provider produced it."""

    text: str


@dataclass(frozen=True)
class StreamDone:
    """The turn finished and both messages are stored."""

    session_id: str
    reply: ChatMessage


@dataclass(frozen=True)
class StreamFailed:
    """The turn broke after the response had already begun.

    Carries the same `(status, code, detail)` triple the global error handler
    would have produced, so a failure mid-stream tells the client precisely what
    a failure before the stream would have: same codes, same wording, only the
    envelope differs.
    """

    status_code: int
    code: str
    detail: str


StreamEvent = StreamToken | StreamDone | StreamFailed


class ChatService:
    """Sending one message to a topic's tutor, and reading the transcript back.

    Holds a `SpaceService` rather than a `SpaceDAO`: loading a topic means
    resolving ownership and backfilling ids, which is a rule, not a query.
    """

    def __init__(self, db: AsyncDatabase) -> None:
        self.spaces = SpaceService(db)
        self.messages = ChatMessageDAO(db)
        self.summaries = ChatSummaryDAO(db)

    async def send_message(
        self,
        user_id: str,
        space_id: str,
        topic_id: str,
        provider: AIProvider,
        message: str,
        background: BackgroundTasks,
    ) -> ChatMessage:
        """One turn: prompt the model, store both sides, queue the summary.

        A session whose limit has already been reached is refused here, before
        the provider is called: the answer cannot change, so paying for it
        again would only turn a fast 413 into a slow one.

        `background` is taken rather than reached for because rolling the
        summary is a *second* model call, and the student's reply is finished
        without it: waiting for it would roughly double how long a send appears
        to take, for work whose result is not read until some later turn.
        """
        prepared = await self.prepare_turn(user_id, space_id, topic_id, message)

        try:
            reply_text = await provider.chat(prepared.prompt)
        except Exception as exc:
            # The one provider failure that is a fact about *this session*
            # rather than about the request: record it, so the next send is
            # refused up front and the panel can explain itself.
            if is_token_limit_error(exc):
                await self._close_session(prepared)
                raise ContextLimitReached from exc
            # Everything else (a bad key, a rate limit, an outage) is the
            # global handler's business, unchanged.
            raise

        return await self._persist(prepared, reply_text, provider, background)

    async def prepare_turn(
        self, user_id: str, space_id: str, topic_id: str, message: str
    ) -> PreparedTurn:
        """Resolve a turn up to the point the model would be called.

        Both routes start here, so the ordering that matters — ownership, then
        the closed-session refusal, then minting the session — is written once
        and cannot drift between them.
        """
        space, topic = await self.spaces.get_topic(user_id, space_id, topic_id)

        if topic.session.limit_reached:
            raise ContextLimitReached

        session_id = await self._ensure_session(space, topic)

        summary = await self.summaries.get(session_id)
        recent = await self.messages.recent(session_id, RECENT_MESSAGE_WINDOW)

        return PreparedTurn(
            space=space,
            topic=topic,
            session_id=session_id,
            summary=summary,
            message=message,
            prompt=_build_prompt(space, topic, summary, recent, message),
        )

    async def stream_turn(
        self,
        prepared: PreparedTurn,
        provider: AIProvider,
        background: BackgroundTasks,
    ) -> AsyncIterator[StreamEvent]:
        """One turn, emitted as it is written, then stored.

        Nothing is written to the database until the provider stops, because
        until then there is no reply to store — a `ChatMessage` is one row, and
        rewriting it on every fragment would be a write per token to save a read
        nobody makes. The student sees the text long before it is persisted, and
        that is fine: the transcript is what they will re-read tomorrow, not what
        they are watching now.

        A break partway through is the exception. Whatever fragments were
        already sent are on the student's screen, so they are stored before the
        failure is reported: a transcript that omitted them would contradict
        what they just read. Only a turn that produced nothing is dropped
        entirely.
        """
        parts: list[str] = []

        try:
            async for fragment in provider.stream(prepared.prompt):
                parts.append(fragment)
                yield StreamToken(fragment)
        except Exception as exc:
            # Same fact as in `send_message`, learned the same way, recorded the
            # same way — only the reporting differs, because by now the status
            # code has already been sent.
            if is_token_limit_error(exc):
                await self._close_session(prepared)
                yield StreamFailed(
                    413,
                    TOKEN_LIMIT_CODE,
                    "Token limit reached for this session. "
                    "Start a new session to continue.",
                )
                return

            logger.exception("Stream failed for session %s", prepared.session_id)
            if parts:
                await self._persist(prepared, "".join(parts), provider, background)

            status_code, code, detail = classify_provider_error(
                getattr(exc, "code", None), getattr(exc, "message", "") or str(exc)
            )
            yield StreamFailed(status_code, code, detail)
            return

        reply = await self._persist(prepared, "".join(parts), provider, background)
        yield StreamDone(prepared.session_id, reply)

    async def _persist(
        self,
        prepared: PreparedTurn,
        reply_text: str,
        provider: AIProvider,
        background: BackgroundTasks,
    ) -> ChatMessage:
        """Store both sides of a finished turn and queue the summary."""
        now = utcnow()
        reply = ChatMessage(
            session_id=prepared.session_id,
            role="assistant",
            content=reply_text,
            created_at=now,
        )
        await self.messages.add_many(
            [
                ChatMessage(
                    session_id=prepared.session_id,
                    role="user",
                    content=prepared.message,
                    created_at=now,
                ),
                reply,
            ]
        )

        prepared.topic.session.updated_at = now
        await self.spaces.save_topics(prepared.space)

        # Queued, not awaited: it runs once this reply is on its way to the
        # student. Nothing in the next request depends on it having finished:
        # `_roll_summary` reads the message count each time, so a turn it
        # missed is simply folded in by the following one.
        background.add_task(
            self._roll_summary, provider, prepared.session_id, prepared.summary
        )
        return reply

    async def _close_session(self, prepared: PreparedTurn) -> None:
        """Mark this session as past the model's input budget, for good."""
        prepared.topic.session.limit_reached = True
        prepared.topic.session.updated_at = utcnow()
        await self.spaces.save_topics(prepared.space)

    async def get_history(
        self, user_id: str, space_id: str, topic_id: str
    ) -> tuple[TopicSession, list[ChatMessage]]:
        """The conversation as the panel shows it when a topic is reopened.

        Deliberately free of `AIProviderDep`: reading what was already said
        needs no model, so a student without a key configured still sees their
        transcript rather than a 401.
        """
        _, topic = await self.spaces.get_topic(user_id, space_id, topic_id)
        if topic.session.session_id is None:
            return topic.session, []
        return topic.session, await self.messages.transcript(topic.session.session_id)

    async def _ensure_session(self, space: Space, topic: Topic) -> str:
        """Mint the session on first use, not when the space was created."""
        if topic.session.session_id is None:
            topic.session = TopicSession.start()
            await self.spaces.save_topics(space)
        assert topic.session.session_id is not None  # just set, or already there
        return topic.session.session_id

    async def _roll_summary(
        self, provider: AIProvider, session_id: str, current: ChatSummary | None
    ) -> None:
        """Fold whatever has aged out of the recent window into the summary.

        Only the messages between what the summary already covers and the start
        of the current window are re-read, so this stays one small prompt however
        long the conversation gets, never a re-summary of the whole transcript.

        Runs after the response, so failing here cannot fail the student's
        message: by then the reply is already theirs. The window simply stays
        wider until a later turn succeeds, which is why `message_count` is
        stored rather than assumed.
        """
        total = await self.messages.count(session_id)
        cutoff = total - RECENT_MESSAGE_WINDOW
        folded = current.message_count if current is not None else 0
        if cutoff <= folded:
            return

        pending = await self.messages.slice(
            session_id, skip=folded, limit=cutoff - folded
        )
        if not pending:
            return

        try:
            content = await provider.chat(_build_summary_prompt(current, pending))
        except Exception:
            logger.exception("Could not summarise session %s", session_id)
            return

        content = (content or "").strip()
        if not content:
            return

        # Replacing is what discards the previous summary: one session, one
        # summary, always the latest.
        await self.summaries.replace(
            ChatSummary(
                session_id=session_id,
                content=content,
                message_count=cutoff,
                created_at=current.created_at if current is not None else utcnow(),
                updated_at=utcnow(),
            )
        )
