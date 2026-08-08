import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, BackgroundTasks, status
from fastapi.responses import StreamingResponse

from app.dependencies import AIProviderDep, ChatServiceDep, CurrentUser
from app.schemas.chat import ChatHistory, ChatMessageRead, ChatReply, SendMessageRequest
from app.services.chat_service import (
    StreamDone,
    StreamEvent,
    StreamFailed,
    StreamToken,
)

router = APIRouter(prefix="/spaces/{space_id}/topics/{topic_id}", tags=["chat"])


def _frame(event: str, data: dict[str, Any]) -> str:
    """One server-sent event.

    `json.dumps` is what makes a single `data:` line safe: a reply full of
    newlines would otherwise split into several events, and Markdown replies are
    full of newlines.
    """
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _encode(events: AsyncIterator[StreamEvent]) -> AsyncIterator[str]:
    """The service's turn events, as the wire format.

    The service deals in what happened; naming those things `token`, `done` and
    `error` and wrapping them in SSE frames is transport, so it lives here and
    not in `ChatService`.
    """
    async for event in events:
        match event:
            case StreamToken(text=text):
                yield _frame("token", {"text": text})
            case StreamDone(session_id=session_id, reply=reply):
                yield _frame(
                    "done",
                    {
                        "session_id": session_id,
                        "reply": ChatMessageRead.model_validate(
                            reply, from_attributes=True
                        ).model_dump(mode="json"),
                    },
                )
            case StreamFailed(status_code=status_code, code=code, detail=detail):
                # Deliberately the same body the global error handler sends, so
                # the client maps a mid-stream failure with the code it already
                # has for the same failure before the stream.
                yield _frame(
                    "error", {"status": status_code, "code": code, "detail": detail}
                )


@router.post(
    "/chat",
    response_model=ChatReply,
    status_code=status.HTTP_201_CREATED,
    summary="Send one message to a topic's tutor",
    description=(
        "Answers within the scope of this topic alone. The prompt carries the "
        "session's rolling summary plus its most recent messages, so a long "
        "conversation stays inside the model's input budget. Returns 413 "
        "`token_limit_reached` once it no longer does."
    ),
)
async def send_message(
    space_id: str,
    topic_id: str,
    payload: SendMessageRequest,
    user: CurrentUser,
    # This is the api-key gate. It resolves the caller's own provider or raises
    # 401 `api_key_not_configured` before the route body runs, so nothing here
    # re-checks the key.
    provider: AIProviderDep,
    service: ChatServiceDep,
    # Rolling the session's summary is queued onto this and runs after the
    # reply has been sent; see `ChatService.send_message`.
    background: BackgroundTasks,
) -> ChatReply:
    reply = await service.send_message(
        user.id, space_id, topic_id, provider, payload.message, background
    )
    return ChatReply(
        session_id=reply.session_id,
        reply=ChatMessageRead.model_validate(reply, from_attributes=True),
    )


@router.post(
    "/chat/stream",
    response_class=StreamingResponse,
    status_code=status.HTTP_200_OK,
    summary="Send one message and read the reply as it is written",
    description=(
        "The same turn as `POST /chat`, delivered as `text/event-stream`: "
        "`token` events carrying fragments of the reply, then one `done` "
        "carrying the stored message, or one `error` carrying the same "
        "`{code, detail}` the JSON routes use.\n\n"
        "Anything that can be known before the model is called is still an "
        "ordinary HTTP error — 401 `api_key_not_configured`, 404, and 413 "
        "`token_limit_reached` for a session already over budget. Once the "
        "first byte is out the status line is spent, so a failure after that "
        "arrives as an `error` event with 200 on the response itself."
    ),
    responses={
        200: {
            "content": {"text/event-stream": {}},
            "description": "The reply, streamed as server-sent events.",
        }
    },
)
async def stream_message(
    space_id: str,
    topic_id: str,
    payload: SendMessageRequest,
    user: CurrentUser,
    provider: AIProviderDep,
    service: ChatServiceDep,
    background: BackgroundTasks,
) -> StreamingResponse:
    # Awaited here rather than inside the generator on purpose: this is the last
    # point an error can still become a status code. Once `StreamingResponse` is
    # returned, 200 has been promised.
    prepared = await service.prepare_turn(user.id, space_id, topic_id, payload.message)

    return StreamingResponse(
        _encode(service.stream_turn(prepared, provider, background)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # nginx buffers proxied responses by default, which would hold the
            # whole reply back and deliver it at once — streaming that arrives
            # all at the end is just a slow POST.
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/chat",
    response_model=ChatHistory,
    status_code=status.HTTP_200_OK,
    summary="A topic's conversation so far",
    description=(
        "Reading the transcript needs no model, so this route does not require "
        "a configured API key; a student without one still sees what was said."
    ),
)
async def get_history(
    space_id: str,
    topic_id: str,
    user: CurrentUser,
    service: ChatServiceDep,
) -> ChatHistory:
    session, messages = await service.get_history(user.id, space_id, topic_id)
    return ChatHistory(
        session_id=session.session_id,
        limit_reached=session.limit_reached,
        messages=[
            ChatMessageRead.model_validate(message, from_attributes=True)
            for message in messages
        ],
    )
