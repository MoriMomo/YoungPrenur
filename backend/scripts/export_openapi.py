"""
Regenerate the OpenAPI contract snapshot used as proof-of-testing evidence.

Usage (from backend/):  python scripts/export_openapi.py
Writes docs/evidence/openapi.json at the repository root.
"""

import json
import os
import sys

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

from main import app  # noqa: E402

OUT = os.path.join(os.path.dirname(BACKEND), "docs", "evidence", "openapi.json")


def main() -> None:
    spec = app.openapi()
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(spec, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(spec.get('paths', {}))} paths to {OUT}")


if __name__ == "__main__":
    main()
