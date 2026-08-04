from fastapi import APIRouter, status

from app.dependencies import CurrentUser, UserServiceDep
from app.schemas.common import MessageResponse
from app.schemas.user import ApiKeyRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.post(
    "/api-key",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Store the caller's AI provider API key",
)
async def set_api_key(
    payload: ApiKeyRequest, user: CurrentUser, service: UserServiceDep
) -> MessageResponse:
    await service.configure_api_key(user.id, payload.api_key, payload.model_version)
    return MessageResponse(message="API key saved.")


@router.delete(
    "/api-key",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove the caller's AI provider API key",
)
async def remove_api_key(user: CurrentUser, service: UserServiceDep) -> MessageResponse:
    await service.remove_api_key(user.id)
    return MessageResponse(message="API key removed.")
