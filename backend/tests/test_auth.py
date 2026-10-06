from app.models import User

CREDS = {"email": "a@b.com", "password": "password123"}


def test_register_and_login(client):
    assert client.post("/api/auth/register", json=CREDS).status_code == 201
    r = client.post("/api/auth/login", json=CREDS)
    assert r.status_code == 200
    assert "access_token" in r.get_json()


def test_duplicate_email(client):
    client.post("/api/auth/register", json=CREDS)
    assert client.post("/api/auth/register", json=CREDS).status_code == 409


def test_short_password_rejected(client):
    r = client.post("/api/auth/register", json={"email": "a@b.com", "password": "short"})
    assert r.status_code == 400


def test_wrong_password(client):
    client.post("/api/auth/register", json=CREDS)
    r = client.post("/api/auth/login", json={**CREDS, "password": "wrong-password"})
    assert r.status_code == 401


def test_password_is_not_stored_in_plain_text(app, client):
    client.post("/api/auth/register", json=CREDS)
    with app.app_context():
        assert User.query.first().password_hash != CREDS["password"]
