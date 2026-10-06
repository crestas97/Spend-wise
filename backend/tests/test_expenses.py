def new_expense(client, auth, **changes):
    data = {"amount": 12.5, "date": "2026-10-01", "description": "Lunch"}
    data.update(changes)
    return client.post("/api/expenses", headers=auth, json=data)


def test_requires_login(client):
    assert client.get("/api/expenses").status_code == 401


def test_create_and_list(client, auth):
    assert new_expense(client, auth).status_code == 201
    assert len(client.get("/api/expenses", headers=auth).get_json()) == 1


def test_rejects_negative_amount(client, auth):
    assert new_expense(client, auth, amount=-5).status_code == 400


def test_rejects_bad_date(client, auth):
    assert new_expense(client, auth, date="not-a-date").status_code == 400


def test_update(client, auth):
    eid = new_expense(client, auth).get_json()["id"]
    r = client.put(f"/api/expenses/{eid}", headers=auth,
                   json={"amount": 20, "date": "2026-10-02", "description": "Dinner"})
    assert r.status_code == 200
    assert r.get_json()["amount"] == 20


def test_delete(client, auth):
    eid = new_expense(client, auth).get_json()["id"]
    assert client.delete(f"/api/expenses/{eid}", headers=auth).status_code == 204
    assert client.get("/api/expenses", headers=auth).get_json() == []


def test_cannot_touch_another_users_expense(client, auth, make_user):
    eid = new_expense(client, auth).get_json()["id"]
    other = make_user("b@b.com")
    assert client.delete(f"/api/expenses/{eid}", headers=other).status_code == 404
    assert client.get("/api/expenses", headers=other).get_json() == []


def test_date_filter(client, auth):
    new_expense(client, auth, date="2026-09-15")
    new_expense(client, auth, date="2026-10-15")
    r = client.get("/api/expenses?from=2026-10-01&to=2026-10-31", headers=auth)
    assert len(r.get_json()) == 1


def test_csv_export(client, auth):
    new_expense(client, auth)
    r = client.get("/api/expenses/export", headers=auth)
    assert r.status_code == 200
    assert r.mimetype == "text/csv"
    assert "Lunch" in r.get_data(as_text=True)
