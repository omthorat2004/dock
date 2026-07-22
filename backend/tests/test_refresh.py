from tests.test_auth import VALID, register

ACCESS_COOKIE = "dock_access"
REFRESH_COOKIE = "dock_refresh"


def test_register_sets_both_cookies(client):
    response = register(client)
    assert response.cookies.get(ACCESS_COOKIE)
    assert response.cookies.get(REFRESH_COOKIE)


def test_register_returns_both_tokens(client):
    body = register(client).json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_expires_in"] > body["expires_in"]


def test_the_cookie_alone_authenticates(client):
    register(client)
    # No Authorization header: the client is holding only the cookies.
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == VALID["email"]


def test_refresh_rotates_the_cookie(client):
    original = register(client).cookies.get(REFRESH_COOKIE)

    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    assert response.cookies.get(REFRESH_COOKIE) != original


def test_refresh_without_a_cookie_is_rejected(client):
    assert client.post("/api/v1/auth/refresh").status_code == 401


def test_a_rotated_token_cannot_be_reused(client):
    original = register(client).cookies.get(REFRESH_COOKIE)
    client.post("/api/v1/auth/refresh")

    replay = client.post("/api/v1/auth/refresh", cookies={REFRESH_COOKIE: original})
    assert replay.status_code == 401


def test_replaying_a_rotated_token_kills_every_session(client):
    original = register(client).cookies.get(REFRESH_COOKIE)
    rotated = client.post("/api/v1/auth/refresh").cookies.get(REFRESH_COOKIE)

    # Replay the old one: the signal that a token leaked.
    client.post("/api/v1/auth/refresh", cookies={REFRESH_COOKIE: original})

    # The legitimate client's newer token must now be dead too.
    response = client.post("/api/v1/auth/refresh", cookies={REFRESH_COOKIE: rotated})
    assert response.status_code == 401


def test_an_access_token_is_not_accepted_as_a_refresh_token(client):
    access = register(client).cookies.get(ACCESS_COOKIE)
    response = client.post("/api/v1/auth/refresh", cookies={REFRESH_COOKIE: access})
    assert response.status_code == 401


def test_a_refresh_token_is_not_accepted_as_an_access_token(client):
    refresh = register(client).cookies.get(REFRESH_COOKIE)
    client.cookies.clear()
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {refresh}"}
    )
    assert response.status_code == 401


def test_logout_revokes_the_session_and_clears_the_cookies(client):
    register(client)

    logout = client.post("/api/v1/auth/logout")
    assert logout.status_code == 204

    assert client.post("/api/v1/auth/refresh").status_code == 401
    assert client.get("/api/v1/auth/me").status_code == 401


def test_logout_without_a_session_is_a_no_op(client):
    assert client.post("/api/v1/auth/logout").status_code == 204
