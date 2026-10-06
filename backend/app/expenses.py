import csv
import io
from datetime import date
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from . import db
from .models import Expense, Category
from .utils import body, current_user_id, parse_amount

bp = Blueprint("expenses", __name__)


def parse_expense(data, uid):
    amount = parse_amount(data.get("amount"))
    if amount is None:
        return None, "amount must be a positive number under 10,000,000,000"
    try:
        day = date.fromisoformat(data.get("date"))
    except (TypeError, ValueError):
        return None, "date must be YYYY-MM-DD"
    description = data.get("description")
    if description is not None and (not isinstance(description, str) or len(description) > 255):
        return None, "description must be text of 255 characters or fewer"
    cid = data.get("category_id")
    if cid is not None:
        if (isinstance(cid, bool) or not isinstance(cid, int)
                or not Category.query.filter_by(id=cid, user_id=uid).first()):
            return None, "category_id does not exist"
    return {"amount": amount, "date": day, "description": description, "category_id": cid}, None


def get_own(eid, uid):
    return Expense.query.filter_by(id=eid, user_id=uid).first()


@bp.get("/expenses")
@jwt_required()
def list_expenses():
    uid = current_user_id()
    q = Expense.query.filter_by(user_id=uid)
    try:
        if request.args.get("category_id"):
            q = q.filter_by(category_id=int(request.args["category_id"]))
        if request.args.get("from"):
            q = q.filter(Expense.date >= date.fromisoformat(request.args["from"]))
        if request.args.get("to"):
            q = q.filter(Expense.date <= date.fromisoformat(request.args["to"]))
    except ValueError:
        return jsonify(error="Invalid filter value"), 400
    rows = q.order_by(Expense.date.desc(), Expense.id.desc()).all()
    return jsonify([e.to_dict() for e in rows])


@bp.post("/expenses")
@jwt_required()
def create_expense():
    uid = current_user_id()
    clean, err = parse_expense(body(), uid)
    if err:
        return jsonify(error=err), 400
    e = Expense(user_id=uid, **clean)
    db.session.add(e)
    db.session.commit()
    return jsonify(e.to_dict()), 201


@bp.put("/expenses/<int:eid>")
@jwt_required()
def update_expense(eid):
    uid = current_user_id()
    e = get_own(eid, uid)
    if not e:
        return jsonify(error="Not found"), 404
    clean, err = parse_expense(body(), uid)
    if err:
        return jsonify(error=err), 400
    for key, value in clean.items():
        setattr(e, key, value)
    db.session.commit()
    return jsonify(e.to_dict())


@bp.delete("/expenses/<int:eid>")
@jwt_required()
def delete_expense(eid):
    e = get_own(eid, current_user_id())
    if not e:
        return jsonify(error="Not found"), 404
    db.session.delete(e)
    db.session.commit()
    return "", 204


def safe(value):
    text = "" if value is None else str(value)
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


@bp.get("/expenses/export")
@jwt_required()
def export_csv():
    uid = current_user_id()
    names = {c.id: c.name for c in Category.query.filter_by(user_id=uid)}
    rows = Expense.query.filter_by(user_id=uid).order_by(Expense.date).all()
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["id", "date", "amount", "category", "description"])
    for r in rows:
        writer.writerow([r.id, r.date.isoformat(), f"{r.amount:.2f}",
                         safe(names.get(r.category_id, "")), safe(r.description)])
    return Response(out.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=expenses.csv"})
