"""Download the ULB credit-card fraud dataset if it is not already present."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.data.loader import DATASET_SOURCE, ensure_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def main() -> None:
    path = ensure_dataset()
    print(f"Dataset ready at: {path}")
    print(f"Source: {DATASET_SOURCE}")


if __name__ == "__main__":
    main()
