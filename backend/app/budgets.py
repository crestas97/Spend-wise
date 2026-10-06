from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from . import db
from .models import Budget
from .utils import MONTH_RE, body, current_user_id, parse_amount

bp = Blueprint("budgets", __name__)


@bp.get("/budgets")
@jwt_required()
def get_budget():
    month = request.args.get("month", "")
    if not MONTH_RE.match(month):
        return jsonify(error="month must be YYYY-MM"), 400
    b = Budget.query.filter_by(user_id=current_user_id(), month=month).first()
    return jsonify(month=month, amount=float(b.amount) if b else None)


@bp.put("/budgets")
@jwt_required()
def set_budget():
    uid = current_user_id()
    data = body()
    month = data.get("month", "")
    amount = parse_amount(data.get("amount"))
    if not isinstance(month, str) or not MONTH_RE.match(month):
        return jsonify(error="month must be YYYY-MM"), 400
    if amount is None:
        return jsonify(error="amount must be a positive number"), 400
    b = Budget.query.filter_by(user_id=uid, month=month).first()
    if b:
        b.amount = amount
    else:
        db.session.add(Budget(user_id=uid, month=month, amount=amount))
    db.session.commit()
    return jsonify(month=month, amount=float(amount))
