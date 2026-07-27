from fastapi import APIRouter, status

from app.dependencies import AIProviderDep, ChatServiceDep, CurrentUser
from app.schemas.chat import ChatHistory, ChatMessageRead, ChatReply, SendMessageRequest

router = APIRouter(prefix="/spaces/{space_id}/topics/{topic_id}", tags=["chat"])


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
) -> ChatReply:
    reply = await service.send_message(
        user.id, space_id, topic_id, provider, payload.message
    )
    return ChatReply(
        session_id=reply.session_id,
        reply=ChatMessageRead.model_validate(reply, from_attributes=True),
    )


@router.get(
    "/chat",
    response_model=ChatHistory,
    status_code=status.HTTP_200_OK,
    summary="A topic's conversation so far",
    description=(
        "Reading the transcript needs no model, so this route does not require "
        "a configured API key — a student without one still sees what was said."
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
