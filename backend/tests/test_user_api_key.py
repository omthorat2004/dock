from app.core.constants import DEFAULT_MODEL_NAME
from tests.test_auth import VALID, register

ENDPOINT = "/api/v1/users/api-key"
CONFIG = {"api_key": "sk-123", "model_version": "gemini-3.6-flash"}


def test_setting_a_key_requires_authentication(client):
    # No session cookie: the endpoint must not be reachable.
    assert client.post(ENDPOINT, json=CONFIG).status_code == 401


def test_a_signed_in_user_can_store_a_key(client):
    register(client)  # leaves the auth cookies on the client
    response = client.post(ENDPOINT, json=CONFIG)
    assert response.status_code == 200
    assert response.json()["message"]


def test_storing_a_key_records_the_chosen_model(client):
    register(client)
    client.post(ENDPOINT, json=CONFIG)

    # Read the stored document straight from Mongo to prove the write shape: the
    # chosen model version is saved, the provider family stays the default.
    from pymongo import MongoClient

    from app.core.config import settings

    with MongoClient(settings.mongodb_uri) as mongo:
        doc = mongo[settings.mongodb_db]["users"].find_one({"email": VALID["email"]})

    assert doc["api_key"] == "sk-123"
    assert doc["model_name"] == DEFAULT_MODEL_NAME
    assert doc["model_version"] == "gemini-3.6-flash"


def test_an_empty_key_is_rejected(client):
    register(client)
    body = {"api_key": "", "model_version": "gemini-3.6-flash"}
    assert client.post(ENDPOINT, json=body).status_code == 422


def test_a_missing_model_is_rejected(client):
    register(client)
    assert client.post(ENDPOINT, json={"api_key": "sk-123"}).status_code == 422


def test_me_reports_configuration_and_the_current_model(client):
    register(client)
    before = client.get("/api/v1/auth/me").json()
    assert before["has_api_key"] is False
    assert before["model_version"]  # a default is always present

    client.post(ENDPOINT, json=CONFIG)
    after = client.get("/api/v1/auth/me").json()
    assert after["has_api_key"] is True
    assert after["model_version"] == "gemini-3.6-flash"


def test_a_key_never_appears_in_the_me_response(client):
    register(client)
    client.post(ENDPOINT, json=CONFIG)
    body = client.get("/api/v1/auth/me").json()
    assert "api_key" not in body


def test_removing_a_key_clears_it(client):
    register(client)
    client.post(ENDPOINT, json=CONFIG)

    response = client.delete(ENDPOINT)
    assert response.status_code == 200
    assert response.json()["message"]
    assert client.get("/api/v1/auth/me").json()["has_api_key"] is False


def test_removing_a_key_requires_authentication(client):
    assert client.delete(ENDPOINT).status_code == 401
