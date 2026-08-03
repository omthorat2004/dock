from fastapi import APIRouter, status

from app.dependencies import CurrentUser, SpaceServiceDep
from app.schemas.space import CreateSpaceRequest, SpaceDetail, SpaceSummary

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
