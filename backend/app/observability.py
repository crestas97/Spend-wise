import json
import logging
import re
import sys
import time
import uuid

from flask import Response, g, request
from prometheus_client import (CONTENT_TYPE_LATEST, Counter, Gauge,
                               Histogram, generate_latest)
from sqlalchemy import text

from . import db

# ---- metrics (defined once, at import time) ----
REQUESTS = Counter("http_requests_total", "Total HTTP requests",
                   ["method", "endpoint", "status"])
LATENCY = Histogram("http_request_duration_seconds",
                    "Time spent handling a request", ["endpoint"])
DB_UP = Gauge("spendwise_database_up", "1 if the database answers, 0 if not")
USERS = Gauge("spendwise_registered_users", "Number of registered users")
EXPENSES = Gauge("spendwise_expenses_recorded", "Number of expenses stored")

QUIET_PATHS = {"/health", "/metrics"}      # too noisy to log every call
SAFE_ID = re.compile(r"^[A-Za-z0-9-]{1,64}$")


def _db_up():
    try:
        db.session.execute(text("SELECT 1"))
        return 1
    except Exception:
        db.session.rollback()
        return 0


def _count(model_name):
    def read():
        from . import models
        try:
            return getattr(models, model_name).query.count()
        except Exception:
            db.session.rollback()
            return float("nan")
    return read


# These functions run each time Prometheus scrapes /metrics.
DB_UP.set_function(_db_up)
USERS.set_function(_count("User"))
EXPENSES.set_function(_count("Expense"))


# ---- logging: one JSON object per line ----
class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {
            "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "message": record.getMessage(),
        }
        entry.update(getattr(record, "fields", {}))
        return json.dumps(entry)


def _logger():
    log = logging.getLogger("spendwise")
    if not log.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        log.addHandler(handler)
        log.setLevel(logging.INFO)
        log.propagate = False
    return log


def init_observability(app):
    log = _logger()

    @app.before_request
    def start_timer():
        g.start = time.perf_counter()
        incoming = request.headers.get("X-Request-ID", "")
        # Only trust a caller's ID if it looks harmless.
        g.request_id = incoming if SAFE_ID.match(incoming) else uuid.uuid4().hex

    @app.after_request
    def record(response):
        response.headers["X-Request-ID"] = g.get("request_id", "-")
        if request.path == "/metrics":
            return response
        endpoint = request.url_rule.rule if request.url_rule else "unmatched"
        seconds = time.perf_counter() - g.get("start", time.perf_counter())
        REQUESTS.labels(request.method, endpoint, str(response.status_code)).inc()
        LATENCY.labels(endpoint).observe(seconds)
        if request.path not in QUIET_PATHS:
            log.info("request", extra={"fields": {
                "request_id": g.get("request_id"),
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": round(seconds * 1000, 1),
            }})
        return response

    @app.get("/metrics")
    def metrics():
        return Response(generate_latest(), content_type=CONTENT_TYPE_LATEST)
