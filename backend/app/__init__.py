import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from sqlalchemy import text

db = SQLAlchemy()
jwt = JWTManager()


def create_app(test_config=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///dev.db")
    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    if test_config:
        app.config.update(test_config)
    if not app.config["JWT_SECRET_KEY"]:
        raise RuntimeError("JWT_SECRET_KEY is not set")

    db.init_app(app)
    jwt.init_app(app)

    from . import models  # noqa: F401
    from .auth import bp as auth_bp
    from .expenses import bp as expenses_bp
    from .categories import bp as categories_bp
    from .budgets import bp as budgets_bp
    from .reports import bp as reports_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    for bp in (expenses_bp, categories_bp, budgets_bp, reports_bp):
        app.register_blueprint(bp, url_prefix="/api")

    @app.get("/health")
    def health():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify(status="ok", database="up")
        except Exception:
            return jsonify(status="error", database="down"), 503

    @app.errorhandler(404)
    def not_found(e):
        return jsonify(error="Not found"), 404

    @app.errorhandler(405)
    def bad_method(e):
        return jsonify(error="Method not allowed"), 405

    @app.errorhandler(500)
    def server_error(e):
        return jsonify(error="Server error"), 500

    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify(error="Login required"), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify(error="Invalid token"), 401

    @jwt.expired_token_loader
    def expired_token(header, payload):
        return jsonify(error="Token expired"), 401

    with app.app_context():
        db.create_all()
    return app
