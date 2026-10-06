from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from . import db
from .models import Expense, Category, Budget
from .utils import MONTH_RE, current_user_id

bp = Blueprint("reports", __name__)


@bp.get("/reports/monthly")
@jwt_required()
def monthly():
    uid = current_user_id()
    month = request.args.get("month") or date.today().strftime("%Y-%m")
    if not MONTH_RE.match(month):
        return jsonify(error="month must be YYYY-MM"), 400
    year, mon = int(month[:4]), int(month[5:])
    first = date(year, mon, 1)
    nxt = date(year + (mon == 12), mon % 12 + 1, 1)
    in_month = (Expense.user_id == uid, Expense.date >= first, Expense.date < nxt)

    cat_rows = (db.session.query(Expense.category_id, Category.name, func.sum(Expense.amount))
                .outerjoin(Category, Expense.category_id == Category.id)
                .filter(*in_month)
                .group_by(Expense.category_id, Category.name).all())
    daily_rows = (db.session.query(Expense.date, func.sum(Expense.amount))
                  .filter(*in_month).group_by(Expense.date).order_by(Expense.date).all())
    count = Expense.query.filter(*in_month).count()
    budget = Budget.query.filter_by(user_id=uid, month=month).first()

    by_category = [{"category_id": cid, "name": name or "Uncategorized", "total": float(t)}
                   for cid, name, t in cat_rows]
    by_category.sort(key=lambda r: r["total"], reverse=True)
    total = round(sum(r["total"] for r in by_category), 2)
    budget_amount = float(budget.amount) if budget else None

    return jsonify(
        month=month, total=total, count=count, budget=budget_amount,
        remaining=round(budget_amount - total, 2) if budget_amount is not None else None,
        by_category=by_category,
        daily=[{"date": d.isoformat(), "total": float(t)} for d, t in daily_rows])
