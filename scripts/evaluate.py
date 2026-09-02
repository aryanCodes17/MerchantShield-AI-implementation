"""Evaluate persisted artifacts on the held-out test set (read-only)."""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import get_project_root, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def main() -> None:
    config = load_config()
    root = get_project_root()
    results_path = root / config["paths"]["artifacts"]["test_results"]
    if not results_path.exists():
        raise SystemExit("No test results found. Run: python scripts/train.py")
    payload = json.loads(results_path.read_text(encoding="utf-8"))
    print(json.dumps(payload["test_metrics"], indent=2))
    print("\n" + payload["disclaimer"])
    print(f"\nSelected model: {payload['selected_model']}")
    print(f"Reason: {payload['selection_reason']}")


if __name__ == "__main__":
    main()
