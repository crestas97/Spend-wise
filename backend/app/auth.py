import re
from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from . import db
from .models import User
from .utils import body

bp = Blueprint("auth", __name__)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@bp.post("/register")
def register():
    data = body()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    if (not EMAIL_RE.match(email) or len(email) > 255
            or not isinstance(password, str) or not 8 <= len(password) <= 128):
        return jsonify(error="Valid email and a password of 8 to 128 characters are required"), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error="Email already registered"), 409
    db.session.add(User(email=email, password_hash=generate_password_hash(password)))
    db.session.commit()
    return jsonify(message="User created"), 201


@bp.post("/login")
def login():
    data = body()
    email = str(data.get("email", "")).strip().lower()
    password = data.get("password", "")
    user = User.query.filter_by(email=email).first()
    if (not user or not isinstance(password, str)
            or not check_password_hash(user.password_hash, password)):
        return jsonify(error="Invalid email or password"), 401
    token = create_access_token(identity=str(user.id))
    return jsonify(access_token=token, user={"id": user.id, "email": user.email})
