#!/usr/bin/env bash
# Checks that a running deployment is healthy. Exits non-zero on any failure.
# Usage: bash monitoring/check.sh http://localhost
BASE="${1:-http://localhost}"
fail=0

check_status() {
  local name="$1" url="$2" expect="$3" code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")
  if [ "$code" = "$expect" ]; then echo "OK    $name ($code)"
  else echo "FAIL  $name (got $code, expected $expect)"; fail=1; fi
}

check_status "frontend loads"      "$BASE/"             200
check_status "health endpoint"     "$BASE/health"       200
check_status "API needs login"     "$BASE/api/expenses" 401

if curl -s --max-time 10 "$BASE/health" | grep -Eq '"database": *"up"'; then
  echo "OK    database reachable"
else
  echo "FAIL  database not reported up"; fail=1
fi

if curl -s --max-time 10 "$BASE/metrics" | grep -q "http_requests_total"; then
  echo "FAIL  /metrics is exposed publicly"; fail=1
else
  echo "OK    /metrics is not public"
fi

exit $fail
