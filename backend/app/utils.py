import re
from decimal import Decimal, InvalidOperation
from flask import request
from flask_jwt_extended import get_jwt_identity

MONTH_RE = re.compile(r"^20\d{2}-(0[1-9]|1[0-2])$")
MAX_AMOUNT = Decimal("10000000000")


def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def current_user_id():
    return int(get_jwt_identity())


def parse_amount(value):
    try:
        amount = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None
    return amount if 0 < amount < MAX_AMOUNT else None
