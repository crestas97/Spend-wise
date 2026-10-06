def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_budget_roundtrip(client, auth):
    r = client.put("/api/budgets", headers=auth, json={"month": "2026-10", "amount": 50000})
    assert r.status_code == 200
    r = client.get("/api/budgets?month=2026-10", headers=auth)
    assert r.get_json()["amount"] == 50000


def test_budget_rejects_bad_month(client, auth):
    r = client.put("/api/budgets", headers=auth, json={"month": "October", "amount": 1})
    assert r.status_code == 400


def test_monthly_report(client, auth):
    cid = client.post("/api/categories", headers=auth, json={"name": "Food"}).get_json()["id"]
    for amount, day in [(4500, "2026-10-01"), (1500, "2026-10-02"), (999, "2026-09-30")]:
        client.post("/api/expenses", headers=auth,
                    json={"amount": amount, "date": day, "category_id": cid})
    client.put("/api/budgets", headers=auth, json={"month": "2026-10", "amount": 10000})

    report = client.get("/api/reports/monthly?month=2026-10", headers=auth).get_json()
    assert report["total"] == 6000
    assert report["count"] == 2
    assert report["remaining"] == 4000
    assert report["by_category"][0]["name"] == "Food"
