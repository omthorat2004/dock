from fastapi import APIRouter, status

from app.dependencies import AIProviderDep, CurrentUser, SpaceServiceDep
from app.schemas.space import (
    AddTopicsRequest,
    CreateSpaceRequest,
    SpaceDetail,
    SpaceSummary,
    SuggestedTopics,
    SuggestTopicsRequest,
)

router = APIRouter(prefix="/spaces", tags=["spaces"])


@router.post(
    "",
    response_model=SpaceSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Create a space for one lesson",
)
async def create_space(
    payload: CreateSpaceRequest, user: CurrentUser, service: SpaceServiceDep
) -> SpaceSummary:
    space = await service.create_space(user.id, payload)
    # The summary is exactly a card's worth of data, so the client can drop the
    # new space straight into its list without a follow-up fetch.
    return SpaceSummary.model_validate(space, from_attributes=True)


@router.get(
    "",
    response_model=list[SpaceSummary],
    status_code=status.HTTP_200_OK,
    summary="Every space the caller owns",
    description=(
        "Returns one summary per space: lesson name, how many topics it holds, "
        "and when it was created and last updated. The topics themselves are "
        "not included; they come with the space's own detail."
    ),
)
async def list_spaces(
    user: CurrentUser, service: SpaceServiceDep
) -> list[SpaceSummary]:
    return await service.list_spaces(user.id)


@router.post(
    "/topic-suggestions",
    response_model=SuggestedTopics,
    status_code=status.HTTP_200_OK,
    summary="Ask the model which topics this lesson should cover",
    description=(
        "Runs on the caller's own AI key, before any space exists, so the "
        "create form can offer topics instead of asking the student to think "
        "of all of them. Returns the model's reply as it came: topic names, "
        "one per line, for the client to split. Nothing is stored, and a "
        "suggestion is an ordinary topic once it is added."
    ),
)
async def suggest_topics(
    payload: SuggestTopicsRequest,
    user: CurrentUser,
    provider: AIProviderDep,
    service: SpaceServiceDep,
) -> SuggestedTopics:
    return SuggestedTopics(topics=await service.suggest_topics(provider, payload))


@router.get(
    "/{space_id}",
    response_model=SpaceDetail,
    status_code=status.HTTP_200_OK,
    summary="One space in full, with its topics",
    description=(
        "What opening a space's canvas loads: the lesson and every topic on it, "
        "each with its video shelf and chat state. A space belonging to someone "
        "else is a 404, the same as one that does not exist."
    ),
)
async def get_space(
    space_id: str, user: CurrentUser, service: SpaceServiceDep
) -> SpaceDetail:
    space = await service.get_space(user.id, space_id)
    return SpaceDetail.model_validate(space, from_attributes=True)


@router.post(
    "/{space_id}/topics",
    response_model=SpaceDetail,
    status_code=status.HTTP_200_OK,
    summary="Add topics to a space that already exists",
    description=(
        "Puts more cards on the canvas. Names the space already holds are "
        "skipped rather than refused, so adding four topics when one is "
        "already there adds the other three. Returns the space in full, which "
        "is what the canvas re-renders from. 409 `topic_limit_reached` once "
        "the space is at its limit."
    ),
)
async def add_topics(
    space_id: str,
    payload: AddTopicsRequest,
    user: CurrentUser,
    service: SpaceServiceDep,
) -> SpaceDetail:
    space = await service.add_topics(user.id, space_id, payload.topics)
    return SpaceDetail.model_validate(space, from_attributes=True)


@router.post(
    "/{space_id}/topic-suggestions",
    response_model=SuggestedTopics,
    status_code=status.HTTP_200_OK,
    summary="Ask the model for more topics for an existing space",
    description=(
        "The same ask as at create time, with nothing to fill in: the lesson, "
        "the goal, the level and the topics already on the canvas all come "
        "off the space. Returns the reply as the model wrote it, one name per "
        "line, for the client to split."
    ),
)
async def suggest_more_topics(
    space_id: str,
    user: CurrentUser,
    provider: AIProviderDep,
    service: SpaceServiceDep,
) -> SuggestedTopics:
    reply = await service.suggest_topics_for_space(provider, user.id, space_id)
    return SuggestedTopics(topics=reply)

