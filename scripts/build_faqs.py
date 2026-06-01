#!/usr/bin/env python3
"""Validate faqs.json structure. Extend to parse PDF if needed."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FAQ_PATH = ROOT / "data" / "faqs.json"


def main() -> int:
    with open(FAQ_PATH, encoding="utf-8") as f:
        faqs = json.load(f)

    required = {"id", "category", "question", "answer"}
    ids: set[str] = set()

    for i, item in enumerate(faqs):
        missing = required - set(item.keys())
        if missing:
            print(f"Entry {i} missing fields: {missing}", file=sys.stderr)
            return 1
        if item["id"] in ids:
            print(f"Duplicate id: {item['id']}", file=sys.stderr)
            return 1
        ids.add(item["id"])

    print(f"OK: {len(faqs)} FAQ entries validated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
