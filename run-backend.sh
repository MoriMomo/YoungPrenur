#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

find_venv_python() {
  for candidate in \
    ".venv/bin/python" \
    ".venv/Scripts/python.exe" \
    "venv/bin/python" \
    "venv/Scripts/python.exe"
  do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

VENV_PY="$(find_venv_python || true)"

if [ -z "$VENV_PY" ]; then
  echo "Setting up Python virtual environment in backend/.venv..."
  if command -v python3 >/dev/null 2>&1; then
    python3 -m venv .venv
  elif command -v python >/dev/null 2>&1; then
    python -m venv .venv
  elif command -v py >/dev/null 2>&1; then
    py -3 -m venv .venv
  else
    echo "Error: Python 3 not found. Install Python 3 or add python/python3 to PATH." >&2
    exit 1
  fi
  VENV_PY="$(find_venv_python)"
fi

if ! "$VENV_PY" -c "import uvicorn" >/dev/null 2>&1; then
  echo "Installing backend dependencies..."
  "$VENV_PY" -m pip install --upgrade pip
  "$VENV_PY" -m pip install -r requirements.txt
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
fi

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

echo "Starting MDIP backend on http://$HOST:$PORT"
exec "$VENV_PY" -m uvicorn main:app --host "$HOST" --port "$PORT" --reload
