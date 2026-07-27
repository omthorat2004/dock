from fastapi import APIRouter

from app.router import auth, chat, health, spaces, user, videos

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(spaces.router)
# Both hang off /spaces/{space_id}/topics/{topic_id}; they are separate modules
# because they are separate features, not separate URL trees.
api_router.include_router(chat.router)
api_router.include_router(videos.router)

__all__ = ["api_router"]
