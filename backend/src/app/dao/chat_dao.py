from app.dao.base import BaseDAO
from app.models.chat import (
    MESSAGES_COLLECTION,
    SUMMARIES_COLLECTION,
    ChatMessage,
    ChatSummary,
)


class ChatMessageDAO(BaseDAO):
    """The transcript of one topic's session, oldest first.

    Every read here is scoped by `session_id` and ordered by `created_at`, which
    is exactly the compound index declared in `db.mongo.connect()`.

    `_id` is always the tiebreaker. A turn writes the student's message and the
    reply in one `insert_many` and stamps both with the same instant, so
    `created_at` alone leaves their order undefined, and an answer sorted
    above its question is not a transcript. ObjectIds are generated in insert
    order, which settles it.
    """

    collection_name = MESSAGES_COLLECTION
    #: Oldest-first, and newest-first, as `sort` wants them.
    _FORWARD = [("created_at", 1), ("_id", 1)]
    _REVERSE = [("created_at", -1), ("_id", -1)]

    async def add_many(self, messages: list[ChatMessage]) -> None:
        """Append a turn. The student's message and the reply go in together."""
        if not messages:
            return
        await self.collection.insert_many([m.to_document() for m in messages])

    async def count(self, session_id: str) -> int:
        return await self.collection.count_documents({"session_id": session_id})

    async def recent(self, session_id: str, limit: int) -> list[ChatMessage]:
        """The last `limit` messages, returned oldest-first.

        Mongo has to sort descending to take the *newest* few without walking
        the whole conversation; the order is flipped here because a prompt
        reads forwards.
        """
        cursor = (
            self.collection.find({"session_id": session_id})
            .sort(self._REVERSE)
            .limit(limit)
        )
        messages = [ChatMessage.from_document(doc) async for doc in cursor]
        messages.reverse()
        return messages

    async def slice(self, session_id: str, skip: int, limit: int) -> list[ChatMessage]:
        """A window of the transcript from the start, oldest-first.

        This is what the rolling summary folds in: the messages that have aged
        past the recent window but are not yet represented in the summary.
        """
        if limit <= 0:
            return []
        cursor = (
            self.collection.find({"session_id": session_id})
            .sort(self._FORWARD)
            .skip(skip)
            .limit(limit)
        )
        return [ChatMessage.from_document(doc) async for doc in cursor]

    async def transcript(self, session_id: str, limit: int = 200) -> list[ChatMessage]:
        """The conversation as the panel shows it when a topic is reopened."""
        cursor = (
            self.collection.find({"session_id": session_id})
            .sort(self._FORWARD)
            .limit(limit)
        )
        return [ChatMessage.from_document(doc) async for doc in cursor]


class ChatSummaryDAO(BaseDAO):
    """The one rolling summary per session.

    There is never a second summary for a session: `replace` overwrites the
    existing document, so writing the new one is what discards the old one. The
    unique index on `session_id` is what guarantees it.
    """

    collection_name = SUMMARIES_COLLECTION

    async def get(self, session_id: str) -> ChatSummary | None:
        document = await self.collection.find_one({"session_id": session_id})
        return ChatSummary.from_document(document) if document else None

    async def replace(self, summary: ChatSummary) -> None:
        """Store the latest summary, dropping whatever it supersedes.

        An upsert-replace rather than delete-then-insert: it is one round trip
        and leaves no window in which the session has no summary at all.
        """
        await self.collection.replace_one(
            {"session_id": summary.session_id}, summary.to_document(), upsert=True
        )
