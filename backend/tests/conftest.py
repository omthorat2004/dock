import os

import pytest

# Point the app at a throwaway database before any app module is imported.
os.environ.setdefault("MONGODB_DB", "dock_test")

from fastapi.testclient import TestClient  # noqa: E402
from pymongo import MongoClient  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def clean_database():
    """Every test starts against an empty database.

    Cleanup uses a synchronous client because pytest fixtures here are sync;
    the app itself always talks to Mongo through the async client.
    """
    yield
    with MongoClient(settings.mongodb_uri) as cleanup_client:
        cleanup_client.drop_database(settings.mongodb_db)
