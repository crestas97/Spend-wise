import pytest
from app import create_app, db


@pytest.fixture
def app():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-secret-key-that-is-long-enough-1234567890",
    })
    yield app
    with app.app_context():
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def make_user(client):
    def _make(email="t@t.com"):
        creds = {"email": email, "password": "password123"}
        client.post("/api/auth/register", json=creds)
        r = client.post("/api/auth/login", json=creds)
        return {"Authorization": "Bearer " + r.get_json()["access_token"]}
    return _make


@pytest.fixture
def auth(make_user):
    return make_user()
