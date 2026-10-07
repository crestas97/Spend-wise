def test_request_id_is_returned(client):
    r = client.get("/health")
    assert r.headers.get("X-Request-ID")


def test_safe_request_id_is_kept(client):
    r = client.get("/health", headers={"X-Request-ID": "abc-123"})
    assert r.headers["X-Request-ID"] == "abc-123"


def test_unsafe_request_id_is_replaced(client):
    r = client.get("/health", headers={"X-Request-ID": "bad id with spaces"})
    assert r.headers["X-Request-ID"] != "bad id with spaces"


def test_metrics_endpoint(client, auth):
    client.get("/api/expenses", headers=auth)
    text = client.get("/metrics").get_data(as_text=True)
    assert "http_requests_total" in text
    assert 'endpoint="/api/expenses"' in text
    assert "spendwise_database_up 1.0" in text
