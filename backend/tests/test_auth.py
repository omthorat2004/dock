VALID = {
    "full_name": "Ada Lovelace",
    "email": "ada@university.edu",
    "password": "passw0rd1",
}


def register(client, **overrides):
    return client.post("/api/v1/auth/register", json={**VALID, **overrides})


def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_register_returns_message_and_user(client):
    response = register(client)
    assert response.status_code == 201
    # Tokens ride in httpOnly cookies, never the body.
    assert response.cookies.get("dock_access")
    body = response.json()
    assert body["message"]
    assert body["user"]["email"] == VALID["email"]
    assert "access_token" not in body


def test_register_rejects_a_duplicate_email(client):
    register(client)
    response = register(client)
    assert response.status_code == 409
    assert response.json()["code"] == "email_already_registered"


def test_register_normalises_the_email(client):
    register(client, email="ADA@University.edu")
    response = client.post(
        "/api/v1/auth/login",
        json={"email": VALID["email"], "password": VALID["password"]},
    )
    assert response.status_code == 200


def test_register_rejects_a_weak_password(client):
    response = register(client, password="password")
    assert response.status_code == 422
    assert response.json()["code"] == "validation_error"


def test_login_succeeds_with_correct_credentials(client):
    register(client)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": VALID["email"], "password": VALID["password"]},
    )
    assert response.status_code == 200
    assert response.cookies.get("dock_access")
    assert response.json()["user"]["email"] == VALID["email"]


def test_login_failures_are_indistinguishable(client):
    register(client)
    wrong_password = client.post(
        "/api/v1/auth/login",
        json={"email": VALID["email"], "password": "wrongpass1"},
    )
    unknown_email = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@university.edu", "password": VALID["password"]},
    )
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()


def test_me_returns_the_current_user(client):
    # The access token now lives only in the cookie; read it from there to
    # exercise the Bearer path, then drop the cookies so the header is the only
    # credential in play.
    token = register(client).cookies.get("dock_access")
    client.cookies.clear()
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == VALID["email"]
    assert body["full_name"] == VALID["full_name"]
    assert "hashed_password" not in body


def test_me_requires_a_token(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_rejects_a_garbage_token(client):
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"}
    )
    assert response.status_code == 401
