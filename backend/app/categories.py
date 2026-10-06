from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from . import db
from .models import Category
from .utils import body, current_user_id

bp = Blueprint("categories", __name__)


@bp.get("/categories")
@jwt_required()
def list_categories():
    rows = Category.query.filter_by(user_id=current_user_id()).order_by(Category.name).all()
    return jsonify([{"id": c.id, "name": c.name} for c in rows])


@bp.post("/categories")
@jwt_required()
def create_category():
    uid = current_user_id()
    name = body().get("name")
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 50:
        return jsonify(error="name must be 1 to 50 characters"), 400
    name = name.strip()
    if Category.query.filter_by(user_id=uid, name=name).first():
        return jsonify(error="Category already exists"), 409
    c = Category(user_id=uid, name=name)
    db.session.add(c)
    db.session.commit()
    return jsonify(id=c.id, name=c.name), 201


@bp.delete("/categories/<int:cid>")
@jwt_required()
def delete_category(cid):
    c = Category.query.filter_by(id=cid, user_id=current_user_id()).first()
    if not c:
        return jsonify(error="Not found"), 404
    db.session.delete(c)
    db.session.commit()
    return "", 204
