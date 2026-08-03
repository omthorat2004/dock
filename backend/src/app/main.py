from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.error_handlers import register_error_handlers
from app.db.mongo import connect, disconnect
from app.router import api_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect()
    yield
    await disconnect()


app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
    description="Backend for Dock: syllabus-aware revision spaces.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"service": settings.project_name, "docs": "/docs"}
