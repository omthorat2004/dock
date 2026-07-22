from fastapi import APIRouter

from app.router import auth, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)

__all__ = ["api_router"]
