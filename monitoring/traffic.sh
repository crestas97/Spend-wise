#!/usr/bin/env bash
# Sends a mix of good and bad requests so the dashboard has something to show.
# Usage: bash monitoring/traffic.sh [base-url]
BASE="${1:-http://localhost}"
EMAIL="${EMAIL:-user@example.com}"
PASS="${PASS:-password123}"

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | grep -o '"access_token": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Register $EMAIL in the app first, or set EMAIL and PASS."
  exit 1
fi

for i in $(seq 1 60); do
  curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" "$BASE/api/expenses"
  curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" "$BASE/api/reports/monthly"
  curl -s -o /dev/null "$BASE/api/expenses"                 # 401, no token
  curl -s -o /dev/null "$BASE/api/does-not-exist"           # 404
  curl -s -o /dev/null -X POST "$BASE/api/expenses" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"amount":-1,"date":"bad"}'                         # 400
  sleep 0.3
done
echo "Sent 300 requests."
