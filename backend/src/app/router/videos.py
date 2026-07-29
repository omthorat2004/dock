from fastapi import APIRouter, status

from app.dependencies import AIProviderDep, CurrentUser, VideoServiceDep
from app.schemas.space import YoutubeLinkRead
from app.schemas.video import GenerateVideosResponse

router = APIRouter(prefix="/spaces/{space_id}/topics/{topic_id}", tags=["videos"])


@router.post(
    "/videos",
    response_model=GenerateVideosResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Find the next few videos for a topic",
    description=(
        "The caller's model searches YouTube through a tool and picks from what "
        "comes back — a mix of Indian and international explainers, up to five "
        "per call and twenty in total. Every link is a real search result, so "
        "none of them are dead. Returns 409 `youtube_limit_reached` once the "
        "shelf is full, 429 `youtube_rate_limited` when YouTube's quota is "
        "spent, and 503 `youtube_unavailable` when search cannot be reached at "
        "all. Adding nothing is a normal result, not an error."
    ),
)
async def generate_videos(
    space_id: str,
    topic_id: str,
    user: CurrentUser,
    # The same api-key gate the chat route uses: no key, no route body.
    provider: AIProviderDep,
    service: VideoServiceDep,
) -> GenerateVideosResponse:
    topic, added = await service.generate_links(user.id, space_id, topic_id, provider)
    return GenerateVideosResponse(
        added=[
            YoutubeLinkRead.model_validate(link, from_attributes=True) for link in added
        ],
        links=[
            YoutubeLinkRead.model_validate(link, from_attributes=True)
            for link in topic.youtube_links
        ],
        limit_reached=topic.video_limit_reached,
        remaining=topic.remaining_video_slots,
    )
